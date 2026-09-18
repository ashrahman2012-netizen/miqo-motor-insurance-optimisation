import { randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import type { MiqoDatabase } from "../../../packages/db/src/client.ts";
import { auditEvent, normalisedQuote, rawProviderResponse } from "../../../packages/db/src/schema.ts";
import { NORMALISATION_VERSION, normaliseMockProviderPayload } from "../../../packages/normalisation/src/index.ts";
import { ValidationError } from "./errors.ts";

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

function present(row:any){
  return {
    normalisedQuoteId:row.normalisedQuoteId,
    rawProviderResponseId:row.rawProviderResponseId,
    normalisationVersion:row.normalisationVersion,
    annualCashPremiumPence:row.annualCashPremiumPence,
    financeCostPence:row.financeCostPence,
    compulsoryExcessPence:row.compulsoryExcessPence,
    voluntaryExcessPence:row.voluntaryExcessPence,
    comparisonState:row.comparisonState,
    comparisonReason:row.comparisonReason,
    normalisationFingerprint:row.normalisationFingerprint,
    normalisedAt:row.normalisedAt,
  };
}

export async function normaliseRawProviderResponse(db:MiqoDatabase,rawProviderResponseId:string){
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`normalise:${rawProviderResponseId}:${NORMALISATION_VERSION}`}))`);
    const raw=(await tx.select().from(rawProviderResponse)
      .where(eq(rawProviderResponse.rawProviderResponseId,rawProviderResponseId)).limit(1))[0];
    if(!raw) throw new ValidationError("RAW_PROVIDER_RESPONSE_NOT_FOUND");
    if(!raw.payloadText || !raw.payloadSha256) throw new ValidationError("RAW_PROVIDER_CAPTURE_INCOMPLETE");

    const existing=(await tx.select().from(normalisedQuote)
      .where(sql`${normalisedQuote.rawProviderResponseId}=${rawProviderResponseId} AND ${normalisedQuote.normalisationVersion}=${NORMALISATION_VERSION}`)
      .limit(1))[0];
    if(existing) return {created:false,item:present(existing)};

    const derived=normaliseMockProviderPayload({payloadText:raw.payloadText,payloadSha256:raw.payloadSha256});
    const normalisedQuoteId=uuid("NOR");
    await tx.insert(normalisedQuote).values({
      normalisedQuoteId,
      rawProviderResponseId,
      normalisationVersion:derived.normalisationVersion,
      annualCashPremiumPence:derived.annualCashPremiumPence,
      financeCostPence:derived.financeCostPence,
      compulsoryExcessPence:derived.compulsoryExcessPence,
      voluntaryExcessPence:derived.voluntaryExcessPence,
      comparisonState:derived.comparisonState,
      comparisonReason:derived.comparisonReason,
      normalisationFingerprint:derived.normalisationFingerprint,
    });
    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"provider_response_normalised",
      entityType:"normalised_quote",
      entityId:normalisedQuoteId,
      metadataJson:{
        rawProviderResponseId,
        normalisationVersion:derived.normalisationVersion,
        comparisonState:derived.comparisonState,
        normalisationFingerprint:derived.normalisationFingerprint,
      },
    });
    const row=(await tx.select().from(normalisedQuote)
      .where(eq(normalisedQuote.normalisedQuoteId,normalisedQuoteId)).limit(1))[0];
    return {created:true,item:present(row)};
  });
}

export async function listNormalisedQuotes(db:MiqoDatabase,rawProviderResponseId:string){
  return {
    items:(await db.select().from(normalisedQuote)
      .where(eq(normalisedQuote.rawProviderResponseId,rawProviderResponseId))
      .orderBy(asc(normalisedQuote.normalisedAt))).map(present),
  };
}
