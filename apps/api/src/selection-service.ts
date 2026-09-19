import {randomUUID} from "node:crypto";
import {and,asc,eq} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  finalIntegrityResult,
  integritySignal,
  normalisedQuote,
  profile,
  prototypeCompletion,
  quoteRequest,
  quoteRun,
  rawProviderResponse,
  riskProfileVersion,
  scenario,
  scenarioDelta,
  selection,
  shortlist,
  shortlistEntry,
} from "../../../packages/db/src/schema.ts";
import {recommendationQuoteEvidence,recommendationSet} from "../../../packages/db/src/sp4-schema.ts";
import {evaluateFinalIntegrity,FINAL_INTEGRITY_RULE_VERSION} from "../../../packages/integrity/src/index.ts";
import {FinalIntegrityError,ValidationError} from "./errors.ts";

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

async function loadLineage(tx:any,shortlistId:string,normalisedQuoteId:string,recommendationSetId?:string){
  const shortlistRow=(await tx.select().from(shortlist).where(eq(shortlist.shortlistId,shortlistId)).limit(1))[0];
  if(!shortlistRow)throw new ValidationError("SHORTLIST_NOT_FOUND");

  const member=(await tx.select().from(shortlistEntry).where(and(
    eq(shortlistEntry.shortlistId,shortlistId),
    eq(shortlistEntry.normalisedQuoteId,normalisedQuoteId),
  )).limit(1))[0];
  if(!member)throw new ValidationError("QUOTE_NOT_SHORTLISTED");

  const quote=(await tx.select().from(normalisedQuote)
    .where(eq(normalisedQuote.normalisedQuoteId,normalisedQuoteId)).limit(1))[0];
  if(!quote)throw new ValidationError("NORMALISED_QUOTE_NOT_FOUND");

  const raw=(await tx.select().from(rawProviderResponse)
    .where(eq(rawProviderResponse.rawProviderResponseId,quote.rawProviderResponseId)).limit(1))[0];
  if(!raw)throw new ValidationError("RAW_PROVIDER_RESPONSE_NOT_FOUND");

  const request=(await tx.select().from(quoteRequest)
    .where(eq(quoteRequest.quoteRequestId,raw.quoteRequestId)).limit(1))[0];
  if(!request)throw new ValidationError("QUOTE_REQUEST_NOT_FOUND");

  const run=(await tx.select().from(quoteRun)
    .where(eq(quoteRun.quoteRunId,request.quoteRunId)).limit(1))[0];
  if(!run)throw new ValidationError("QUOTE_RUN_NOT_FOUND");

  const scenarioRow=(await tx.select().from(scenario)
    .where(eq(scenario.scenarioId,request.scenarioId)).limit(1))[0];
  if(!scenarioRow)throw new ValidationError("SCENARIO_NOT_FOUND");

  const version=(await tx.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,run.riskProfileVersionId)).limit(1))[0];
  if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");

  const deltas=await tx.select().from(scenarioDelta)
    .where(eq(scenarioDelta.scenarioId,scenarioRow.scenarioId));

  const blocking=await tx.select().from(integritySignal).where(and(
    eq(integritySignal.scenarioId,scenarioRow.scenarioId),
    eq(integritySignal.blocking,true),
  )).orderBy(asc(integritySignal.createdAt));

  let recommendation:null|{
    recommendationSetId:string;
    customerObjectiveId:string;
    explorationFingerprint:string;
    recommendationFingerprint:string;
  }=null;

  if(recommendationSetId){
    const set=(await tx.select().from(recommendationSet)
      .where(eq(recommendationSet.recommendationSetId,recommendationSetId)).limit(1))[0];
    if(!set)throw new ValidationError("SP4_RECOMMENDATION_SET_NOT_FOUND");
    if(set.riskProfileVersionId!==version.riskProfileVersionId
      || set.surfacedNormalisedQuoteId!==quote.normalisedQuoteId){
      throw new ValidationError("SP4_SELECTION_RECOMMENDATION_MISMATCH");
    }

    const evidence=(await tx.select().from(recommendationQuoteEvidence).where(and(
      eq(recommendationQuoteEvidence.recommendationSetId,recommendationSetId),
      eq(recommendationQuoteEvidence.normalisedQuoteId,quote.normalisedQuoteId),
    )).limit(1))[0];

    if(!evidence
      || evidence.evidenceStatus!=="ELIGIBLE"
      || Number(evidence.ordinal)!==1
      || evidence.quoteRequestId!==request.quoteRequestId
      || evidence.scenarioId!==scenarioRow.scenarioId){
      throw new ValidationError("SP4_SELECTION_RECOMMENDATION_EVIDENCE_MISMATCH");
    }

    recommendation={
      recommendationSetId:set.recommendationSetId,
      customerObjectiveId:set.customerObjectiveId,
      explorationFingerprint:set.explorationFingerprint,
      recommendationFingerprint:set.recommendationFingerprint,
    };
  }

  return {shortlistRow,member,quote,raw,request,run,scenarioRow,version,deltas,blocking,recommendation};
}

export async function selectShortlistedQuote(db:MiqoDatabase,args:{
  shortlistId:string;
  normalisedQuoteId:string;
  recommendationSetId?:string;
  simulateFailureAfterSelection?:boolean;
}){
  const result=await db.transaction(async tx=>{
    const lineage=await loadLineage(tx,args.shortlistId,args.normalisedQuoteId,args.recommendationSetId);
    const final=evaluateFinalIntegrity({
      selectedQuoteExists:Boolean(lineage.quote),
      selectionInShortlist:Boolean(lineage.member),
      directlyComparable:lineage.quote.comparisonState==="DIRECTLY_COMPARABLE",
      rawProviderResponsePreserved:Boolean(lineage.raw.payloadText && lineage.raw.payloadSha256),
      quoteRequestScenarioMatch:lineage.request.scenarioId===lineage.scenarioRow.scenarioId,
      scenarioProfileMatch:
        lineage.scenarioRow.riskProfileVersionId===lineage.run.riskProfileVersionId
        && lineage.run.riskProfileVersionId===lineage.shortlistRow.riskProfileVersionId,
      profileStatus:lineage.version.status,
      scenarioDeltasOOnly:lineage.deltas.every((delta:any)=>delta.controlClass==="O"),
      blockingIntegritySignalPresent:lineage.blocking.length>0,
    });

    const selectionId=uuid("SEL");
    await tx.insert(selection).values({
      selectionId,
      shortlistId:args.shortlistId,
      normalisedQuoteId:args.normalisedQuoteId,
      scenarioId:lineage.scenarioRow.scenarioId,
      quoteRequestId:lineage.request.quoteRequestId,
      riskProfileVersionId:lineage.version.riskProfileVersionId,
      status:final.outcome==="PASS"?"ACCEPTED":"BLOCKED",
    });

    if(args.simulateFailureAfterSelection)throw new Error("SIMULATED_SELECTION_TRANSACTION_FAILURE");

    const finalIntegrityResultId=uuid("FIR");
    await tx.insert(finalIntegrityResult).values({
      finalIntegrityResultId,
      selectionId,
      integrityRuleVersion:FINAL_INTEGRITY_RULE_VERSION,
      outcome:final.outcome,
      evidenceJson:{
        signals:final.signals,
        normalisedQuoteId:lineage.quote.normalisedQuoteId,
        rawProviderResponseId:lineage.raw.rawProviderResponseId,
        quoteRequestId:lineage.request.quoteRequestId,
        scenarioId:lineage.scenarioRow.scenarioId,
        riskProfileVersionId:lineage.version.riskProfileVersionId,
      },
    });

    if(final.outcome==="BLOCKED"){
      if(final.signals.length){
        await tx.insert(integritySignal).values(final.signals.map(signal=>({
          integritySignalId:uuid("INT"),
          stage:"FINAL_SELECTION",
          ruleId:signal.ruleId,
          riskProfileVersionId:lineage.version.riskProfileVersionId,
          scenarioId:lineage.scenarioRow.scenarioId,
          normalisedQuoteId:lineage.quote.normalisedQuoteId,
          state:"BLOCKING",
          blocking:true,
          evidenceJson:signal.evidence,
        })));
      }
      await tx.insert(auditEvent).values([
        {
          auditEventId:uuid("AUD"),
          eventType:"quote_selection_attempted",
          entityType:"selection",
          entityId:selectionId,
          traceId:lineage.version.profileId,
          metadataJson:{
            shortlistId:args.shortlistId,
            normalisedQuoteId:args.normalisedQuoteId,
            recommendationSetId:lineage.recommendation?.recommendationSetId??null,
            customerObjectiveId:lineage.recommendation?.customerObjectiveId??null,
            explorationFingerprint:lineage.recommendation?.explorationFingerprint??null,
            recommendationFingerprint:lineage.recommendation?.recommendationFingerprint??null,
          },
        },
        {
          auditEventId:uuid("AUD"),
          eventType:"final_integrity_blocked",
          entityType:"selection",
          entityId:selectionId,
          traceId:lineage.version.profileId,
          metadataJson:{ruleIds:final.signals.map(signal=>signal.ruleId),integrityRuleVersion:FINAL_INTEGRITY_RULE_VERSION},
        },
      ]);
      return {outcome:"BLOCKED" as const,selectionId,finalIntegrityResultId,signals:final.signals};
    }

    const completionId=uuid("COMP");
    await tx.insert(prototypeCompletion).values({
      prototypeCompletionId:completionId,
      selectionId,
      profileId:lineage.version.profileId,
      status:"PROTOTYPE_JOURNEY_COMPLETE",
      dataClassification:"SYNTHETIC",
      liveProviderActivity:"DISABLED",
    });

    await tx.insert(auditEvent).values([
      {
        auditEventId:uuid("AUD"),
        eventType:"quote_selected",
        entityType:"selection",
        entityId:selectionId,
        traceId:lineage.version.profileId,
        metadataJson:{
          shortlistId:args.shortlistId,
          normalisedQuoteId:args.normalisedQuoteId,
          scenarioId:lineage.scenarioRow.scenarioId,
          quoteRequestId:lineage.request.quoteRequestId,
          riskProfileVersionId:lineage.version.riskProfileVersionId,
          recommendationSetId:lineage.recommendation?.recommendationSetId??null,
          customerObjectiveId:lineage.recommendation?.customerObjectiveId??null,
          explorationFingerprint:lineage.recommendation?.explorationFingerprint??null,
          recommendationFingerprint:lineage.recommendation?.recommendationFingerprint??null,
        },
      },
      {
        auditEventId:uuid("AUD"),
        eventType:"final_integrity_passed",
        entityType:"selection",
        entityId:selectionId,
        traceId:lineage.version.profileId,
        metadataJson:{integrityRuleVersion:FINAL_INTEGRITY_RULE_VERSION},
      },
      {
        auditEventId:uuid("AUD"),
        eventType:"prototype_completed",
        entityType:"prototype_completion",
        entityId:completionId,
        traceId:lineage.version.profileId,
        metadataJson:{
          selectionId,
          dataClassification:"SYNTHETIC",
          liveProviderActivity:"DISABLED",
        },
      },
    ]);

    return {
      outcome:"PASS" as const,
      selectionId,
      finalIntegrityResultId,
      prototypeCompletionId:completionId,
      status:"PROTOTYPE_JOURNEY_COMPLETE",
      signals:[],
    };
  });

  if(result.outcome==="BLOCKED")throw new FinalIntegrityError(result.selectionId,result.signals);
  return result;
}

export async function getSelection(db:MiqoDatabase,selectionId:string){
  const row=(await db.select().from(selection).where(eq(selection.selectionId,selectionId)).limit(1))[0];
  if(!row)throw new ValidationError("SELECTION_NOT_FOUND");
  const integrity=(await db.select().from(finalIntegrityResult)
    .where(eq(finalIntegrityResult.selectionId,selectionId)).limit(1))[0];
  const completion=(await db.select().from(prototypeCompletion)
    .where(eq(prototypeCompletion.selectionId,selectionId)).limit(1))[0];
  const quote=(await db.select().from(normalisedQuote)
    .where(eq(normalisedQuote.normalisedQuoteId,row.normalisedQuoteId)).limit(1))[0];
  const request=(await db.select().from(quoteRequest)
    .where(eq(quoteRequest.quoteRequestId,row.quoteRequestId)).limit(1))[0];
  return {
    selectionId:row.selectionId,
    shortlistId:row.shortlistId,
    normalisedQuoteId:row.normalisedQuoteId,
    scenarioId:row.scenarioId,
    quoteRequestId:row.quoteRequestId,
    riskProfileVersionId:row.riskProfileVersionId,
    status:row.status,
    selectedAt:row.selectedAt,
    selectedQuote:{
      providerKey:request.providerKey,
      annualCashPremiumPence:quote.annualCashPremiumPence,
      financeCostPence:quote.financeCostPence,
      compulsoryExcessPence:quote.compulsoryExcessPence,
      voluntaryExcessPence:quote.voluntaryExcessPence,
      comparisonState:quote.comparisonState,
      comparisonReason:quote.comparisonReason,
      normalisationVersion:quote.normalisationVersion,
    },
    finalIntegrity:integrity?{
      finalIntegrityResultId:integrity.finalIntegrityResultId,
      ruleVersion:integrity.integrityRuleVersion,
      outcome:integrity.outcome,
      evidence:integrity.evidenceJson,
      evaluatedAt:integrity.evaluatedAt,
    }:null,
    completion:completion?{
      prototypeCompletionId:completion.prototypeCompletionId,
      status:completion.status,
      dataClassification:completion.dataClassification,
      liveProviderActivity:completion.liveProviderActivity,
      completedAt:completion.completedAt,
    }:null,
  };
}
