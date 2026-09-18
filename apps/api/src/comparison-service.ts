import {randomUUID} from "node:crypto";
import {and,asc,eq,inArray} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  normalisedQuote,
  profile,
  quoteRequest,
  quoteRun,
  rawProviderResponse,
  riskProfileVersion,
  shortlist,
  shortlistEntry,
} from "../../../packages/db/src/schema.ts";
import {COMPARISON_RULE_VERSION,compareNormalisedQuotes} from "../../../packages/comparison/src/index.ts";
import {ValidationError} from "./errors.ts";

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

async function loadQuotesForVersion(db:MiqoDatabase,versionId:string){
  const runs=await db.select().from(quoteRun).where(eq(quoteRun.riskProfileVersionId,versionId));
  if(!runs.length)return [];
  const requests=await db.select().from(quoteRequest).where(inArray(quoteRequest.quoteRunId,runs.map(row=>row.quoteRunId)));
  if(!requests.length)return [];
  const raws=await db.select().from(rawProviderResponse).where(inArray(rawProviderResponse.quoteRequestId,requests.map(row=>row.quoteRequestId)));
  if(!raws.length)return [];
  return db.select().from(normalisedQuote).where(and(
    inArray(normalisedQuote.rawProviderResponseId,raws.map(row=>row.rawProviderResponseId)),
    eq(normalisedQuote.normalisationVersion,"sp2-normaliser-v1"),
  ));
}

async function presentShortlist(db:MiqoDatabase,shortlistId:string,comparison:any,created:boolean){
  const row=(await db.select().from(shortlist).where(eq(shortlist.shortlistId,shortlistId)).limit(1))[0];
  const entries=await db.select().from(shortlistEntry)
    .where(eq(shortlistEntry.shortlistId,shortlistId))
    .orderBy(asc(shortlistEntry.ordinal));
  return {
    created,
    shortlistId:row.shortlistId,
    riskProfileVersionId:row.riskProfileVersionId,
    comparisonRuleVersion:row.comparisonRuleVersion,
    comparisonFingerprint:row.comparisonFingerprint,
    generatedAt:row.generatedAt,
    lowestDirectlyComparablePremiumId:comparison.lowestDirectlyComparablePremiumId,
    directlyComparable:comparison.directlyComparable,
    notComparable:comparison.notComparable,
    entries:entries.map(entry=>({
      shortlistEntryId:entry.shortlistEntryId,
      normalisedQuoteId:entry.normalisedQuoteId,
      ordinal:entry.ordinal,
    })),
  };
}

export async function createShortlist(db:MiqoDatabase,versionId:string){
  const version=(await db.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,versionId)).limit(1))[0];
  if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");

  const quotes=await loadQuotesForVersion(db,versionId);
  const comparison=compareNormalisedQuotes(quotes.map(row=>({
    normalisedQuoteId:row.normalisedQuoteId,
    comparisonState:row.comparisonState,
    annualCashPremiumPence:row.annualCashPremiumPence,
    compulsoryExcessPence:row.compulsoryExcessPence,
    voluntaryExcessPence:row.voluntaryExcessPence,
  })));

  return db.transaction(async tx=>{
    const existing=(await tx.select().from(shortlist).where(and(
      eq(shortlist.riskProfileVersionId,versionId),
      eq(shortlist.comparisonFingerprint,comparison.comparisonFingerprint),
    )).limit(1))[0];
    if(existing)return presentShortlist(tx as MiqoDatabase,existing.shortlistId,comparison,false);

    const shortlistId=uuid("SL");
    await tx.insert(shortlist).values({
      shortlistId,
      riskProfileVersionId:versionId,
      comparisonRuleVersion:COMPARISON_RULE_VERSION,
      comparisonFingerprint:comparison.comparisonFingerprint,
    });

    if(comparison.directlyComparable.length){
      await tx.insert(shortlistEntry).values(comparison.directlyComparable.map(item=>({
        shortlistEntryId:uuid("SLE"),
        shortlistId,
        normalisedQuoteId:item.normalisedQuoteId,
        ordinal:item.ordinal,
      })));
    }

    await tx.insert(auditEvent).values([
      {
        auditEventId:uuid("AUD"),
        eventType:"comparison_generated",
        entityType:"risk_profile_version",
        entityId:versionId,
        traceId:version.profileId,
        metadataJson:{
          comparisonRuleVersion:COMPARISON_RULE_VERSION,
          comparisonFingerprint:comparison.comparisonFingerprint,
          directlyComparableIds:comparison.directlyComparable.map(item=>item.normalisedQuoteId),
          notComparableIds:comparison.notComparable.map(item=>item.normalisedQuoteId),
          lowestDirectlyComparablePremiumId:comparison.lowestDirectlyComparablePremiumId,
        },
      },
      {
        auditEventId:uuid("AUD"),
        eventType:"shortlist_created",
        entityType:"shortlist",
        entityId:shortlistId,
        traceId:version.profileId,
        metadataJson:{
          riskProfileVersionId:versionId,
          normalisedQuoteIds:comparison.directlyComparable.map(item=>item.normalisedQuoteId),
          comparisonRuleVersion:COMPARISON_RULE_VERSION,
        },
      },
    ]);

    return presentShortlist(tx as MiqoDatabase,shortlistId,comparison,true);
  });
}

export async function getShortlist(db:MiqoDatabase,shortlistId:string){
  const row=(await db.select().from(shortlist).where(eq(shortlist.shortlistId,shortlistId)).limit(1))[0];
  if(!row)throw new ValidationError("SHORTLIST_NOT_FOUND");
  const quotes=await loadQuotesForVersion(db,row.riskProfileVersionId);
  const comparison=compareNormalisedQuotes(quotes.map(item=>({
    normalisedQuoteId:item.normalisedQuoteId,
    comparisonState:item.comparisonState,
    annualCashPremiumPence:item.annualCashPremiumPence,
    compulsoryExcessPence:item.compulsoryExcessPence,
    voluntaryExcessPence:item.voluntaryExcessPence,
  })));
  return presentShortlist(db,shortlistId,comparison,false);
}
