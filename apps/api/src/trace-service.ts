import {asc,eq} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  finalIntegrityResult,
  normalisedQuote,
  optimisationPreference,
  prototypeCompletion,
  quoteRequest,
  quoteRun,
  rawProviderResponse,
  riskProfileVersion,
  scenario,
  scenarioDelta,
  selection,
  shortlist,
} from "../../../packages/db/src/schema.ts";
import {ValidationError} from "./errors.ts";
import {auditEvents} from "./profile-service.ts";

export async function getSelectionTrace(db:MiqoDatabase,selectionId:string){
  const selected=(await db.select().from(selection).where(eq(selection.selectionId,selectionId)).limit(1))[0];
  if(!selected)throw new ValidationError("SELECTION_NOT_FOUND");
  const shortlistRow=(await db.select().from(shortlist).where(eq(shortlist.shortlistId,selected.shortlistId)).limit(1))[0];
  const quote=(await db.select().from(normalisedQuote).where(eq(normalisedQuote.normalisedQuoteId,selected.normalisedQuoteId)).limit(1))[0];
  const raw=(await db.select().from(rawProviderResponse).where(eq(rawProviderResponse.rawProviderResponseId,quote.rawProviderResponseId)).limit(1))[0];
  const request=(await db.select().from(quoteRequest).where(eq(quoteRequest.quoteRequestId,selected.quoteRequestId)).limit(1))[0];
  const run=(await db.select().from(quoteRun).where(eq(quoteRun.quoteRunId,request.quoteRunId)).limit(1))[0];
  const scenarioRow=(await db.select().from(scenario).where(eq(scenario.scenarioId,selected.scenarioId)).limit(1))[0];
  const deltas=await db.select().from(scenarioDelta).where(eq(scenarioDelta.scenarioId,selected.scenarioId)).orderBy(asc(scenarioDelta.fieldId));
  const preferences=await db.select().from(optimisationPreference)
    .where(eq(optimisationPreference.riskProfileVersionId,selected.riskProfileVersionId))
    .orderBy(asc(optimisationPreference.preferenceKey));
  const version=(await db.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,selected.riskProfileVersionId)).limit(1))[0];
  const integrity=(await db.select().from(finalIntegrityResult)
    .where(eq(finalIntegrityResult.selectionId,selectionId)).limit(1))[0];
  const completion=(await db.select().from(prototypeCompletion)
    .where(eq(prototypeCompletion.selectionId,selectionId)).limit(1))[0];
  const audit=await auditEvents(db,version.profileId);

  return {
    profile:{profileId:version.profileId},
    riskProfileVersion:{
      riskProfileVersionId:version.riskProfileVersionId,
      versionNo:version.versionNo,
      status:version.status,
      lockedAt:version.lockedAt,
    },
    optimisationPreferences:preferences.map(item=>({
      preferenceId:item.optimisationPreferenceId,
      key:item.preferenceKey,
      value:item.valueJson,
      frozenAt:item.frozenAt,
    })),
    scenario:{
      scenarioId:scenarioRow.scenarioId,
      generationVersion:scenarioRow.generationVersion,
      generationFingerprint:scenarioRow.generationFingerprint,
      deltas:deltas.map(delta=>({fieldId:delta.fieldId,controlClass:delta.controlClass,value:delta.valueJson})),
    },
    quoteRequest:{
      quoteRunId:run.quoteRunId,
      quoteRequestId:request.quoteRequestId,
      providerKey:request.providerKey,
      channel:request.channelKey,
      requestFingerprint:request.requestFingerprint,
    },
    rawProviderResponse:{
      rawProviderResponseId:raw.rawProviderResponseId,
      providerReference:raw.providerReference,
      payloadSha256:raw.payloadSha256,
    },
    normalisedQuote:{
      normalisedQuoteId:quote.normalisedQuoteId,
      normalisationVersion:quote.normalisationVersion,
      annualCashPremiumPence:quote.annualCashPremiumPence,
      compulsoryExcessPence:quote.compulsoryExcessPence,
      voluntaryExcessPence:quote.voluntaryExcessPence,
      comparisonState:quote.comparisonState,
      comparisonReason:quote.comparisonReason,
      normalisationFingerprint:quote.normalisationFingerprint,
    },
    shortlist:{
      shortlistId:shortlistRow.shortlistId,
      comparisonRuleVersion:shortlistRow.comparisonRuleVersion,
      comparisonFingerprint:shortlistRow.comparisonFingerprint,
    },
    selection:{
      selectionId:selected.selectionId,
      status:selected.status,
      selectedAt:selected.selectedAt,
    },
    finalIntegrity:integrity?{
      finalIntegrityResultId:integrity.finalIntegrityResultId,
      ruleVersion:integrity.integrityRuleVersion,
      outcome:integrity.outcome,
      evidence:integrity.evidenceJson,
    }:null,
    completion:completion?{
      prototypeCompletionId:completion.prototypeCompletionId,
      status:completion.status,
      dataClassification:completion.dataClassification,
      liveProviderActivity:completion.liveProviderActivity,
    }:null,
    audit,
  };
}
