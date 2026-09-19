import {and,asc,eq} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  customerObjective,
  normalisedQuote,
  quoteRequest,
  rawProviderResponse,
  riskProfileVersion,
  scenario,
  scenarioDelta,
  selection,
} from "../../../packages/db/src/schema.ts";
import {
  marketRoute,
  recommendationQuoteEvidence,
  recommendationSet,
  sp4QuoteRequestLineage,
  sp4ScenarioLineage,
} from "../../../packages/db/src/sp4-schema.ts";
import {ValidationError} from "./errors.ts";
import {getSelectionTrace} from "./trace-service.ts";
import {getSprint4RecommendationExplanation} from "./sprint4-explanation-service.ts";

export async function getSprint4AdminSelectionTrace(db:MiqoDatabase,selectionId:string){
  const selected=(await db.select().from(selection)
    .where(eq(selection.selectionId,selectionId)).limit(1))[0];
  if(!selected)throw new ValidationError("SELECTION_NOT_FOUND");

  const selectedEvent=(await db.select().from(auditEvent).where(and(
    eq(auditEvent.eventType,"quote_selected"),
    eq(auditEvent.entityId,selectionId),
  )).orderBy(asc(auditEvent.occurredAt)).limit(1))[0];

  const metadata=(selectedEvent?.metadataJson??{}) as Record<string,unknown>;
  const recommendationSetId=typeof metadata.recommendationSetId==="string"?metadata.recommendationSetId:"";
  if(!recommendationSetId)throw new ValidationError("SP4_SELECTION_RECOMMENDATION_LINEAGE_NOT_FOUND");

  const set=(await db.select().from(recommendationSet)
    .where(eq(recommendationSet.recommendationSetId,recommendationSetId)).limit(1))[0];
  if(!set)throw new ValidationError("SP4_RECOMMENDATION_SET_NOT_FOUND");

  if(set.riskProfileVersionId!==selected.riskProfileVersionId
    || set.surfacedNormalisedQuoteId!==selected.normalisedQuoteId){
    throw new ValidationError("SP4_SELECTION_RECOMMENDATION_LINEAGE_MISMATCH");
  }

  const objective=(await db.select().from(customerObjective)
    .where(eq(customerObjective.customerObjectiveId,set.customerObjectiveId)).limit(1))[0];
  if(!objective)throw new ValidationError("CUSTOMER_OBJECTIVE_NOT_FOUND");

  const version=(await db.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,set.riskProfileVersionId)).limit(1))[0];
  if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");

  const scenarioLineage=await db.select().from(sp4ScenarioLineage).where(and(
    eq(sp4ScenarioLineage.customerObjectiveId,set.customerObjectiveId),
    eq(sp4ScenarioLineage.explorationFingerprint,set.explorationFingerprint),
  )).orderBy(asc(sp4ScenarioLineage.createdAt),asc(sp4ScenarioLineage.scenarioId));

  const scenarios=[];
  for(const lineage of scenarioLineage){
    const row=(await db.select().from(scenario)
      .where(eq(scenario.scenarioId,lineage.scenarioId)).limit(1))[0];
    const deltas=await db.select().from(scenarioDelta)
      .where(eq(scenarioDelta.scenarioId,lineage.scenarioId))
      .orderBy(asc(scenarioDelta.fieldId));
    scenarios.push({
      scenarioId:lineage.scenarioId,
      generationOrdinal:row?.generationOrdinal??null,
      generationVersion:lineage.generationVersion,
      candidateFingerprint:lineage.candidateFingerprint,
      catalogueVersion:lineage.catalogueVersion,
      policyFingerprint:lineage.policyFingerprint,
      deltas:deltas.map(item=>({
        fieldId:item.fieldId,
        controlClass:item.controlClass,
        value:item.valueJson,
      })),
    });
  }
  scenarios.sort((a,b)=>
    Number(a.generationOrdinal??Number.MAX_SAFE_INTEGER)-Number(b.generationOrdinal??Number.MAX_SAFE_INTEGER)
    || a.scenarioId.localeCompare(b.scenarioId)
  );

  const evidence=await db.select().from(recommendationQuoteEvidence)
    .where(eq(recommendationQuoteEvidence.recommendationSetId,recommendationSetId))
    .orderBy(asc(recommendationQuoteEvidence.createdAt),asc(recommendationQuoteEvidence.recommendationQuoteEvidenceId));

  const routeQuotes=[];
  for(const item of evidence){
    const route=(await db.select().from(marketRoute)
      .where(eq(marketRoute.marketRouteId,item.marketRouteId)).limit(1))[0];
    const request=(await db.select().from(quoteRequest)
      .where(eq(quoteRequest.quoteRequestId,item.quoteRequestId)).limit(1))[0];
    const routeLineage=(await db.select().from(sp4QuoteRequestLineage)
      .where(eq(sp4QuoteRequestLineage.quoteRequestId,item.quoteRequestId)).limit(1))[0];
    const raw=(await db.select().from(rawProviderResponse)
      .where(eq(rawProviderResponse.quoteRequestId,item.quoteRequestId)).limit(1))[0];
    const quote=(await db.select().from(normalisedQuote)
      .where(eq(normalisedQuote.normalisedQuoteId,item.normalisedQuoteId)).limit(1))[0];
    if(!route||!request||!routeLineage||!raw||!quote){
      throw new ValidationError("SP4_ADMIN_TRACE_QUOTE_LINEAGE_INCOMPLETE");
    }
    routeQuotes.push({
      evidenceStatus:item.evidenceStatus,
      ordinal:item.ordinal,
      objectiveMetric:item.objectiveMetric,
      objectiveMetricValuePence:item.objectiveMetricValuePence,
      exclusionReason:item.exclusionReason,
      evidenceFingerprint:item.evidenceFingerprint,
      scenarioId:item.scenarioId,
      marketRoute:{
        marketRouteId:route.marketRouteId,
        routeKey:route.routeKey,
        routeCatalogueVersion:route.routeCatalogueVersion,
        providerKey:route.providerKey,
        channelKey:route.channelKey,
        adapterVersion:route.adapterVersion,
        mappingVersion:route.mappingVersion,
        routeFingerprint:route.routeFingerprint,
      },
      quoteRequest:{
        quoteRequestId:request.quoteRequestId,
        requestFingerprint:request.requestFingerprint,
        adapterVersion:request.adapterVersion,
        mappingVersion:request.mappingVersion,
        orchestrationVersion:routeLineage.orchestrationVersion,
      },
      rawProviderResponse:{
        rawProviderResponseId:raw.rawProviderResponseId,
        providerReference:raw.providerReference,
        payloadSha256:raw.payloadSha256,
      },
      normalisedQuote:{
        normalisedQuoteId:quote.normalisedQuoteId,
        normalisationVersion:quote.normalisationVersion,
        normalisationFingerprint:quote.normalisationFingerprint,
        comparisonState:quote.comparisonState,
        annualCashPremiumPence:quote.annualCashPremiumPence,
        financeCostPence:quote.financeCostPence,
        compulsoryExcessPence:quote.compulsoryExcessPence,
        voluntaryExcessPence:quote.voluntaryExcessPence,
      },
    });
  }

  const selectedEvidence=routeQuotes.find(item=>
    item.normalisedQuote.normalisedQuoteId===selected.normalisedQuoteId
    && item.quoteRequest.quoteRequestId===selected.quoteRequestId
    && item.scenarioId===selected.scenarioId
  );
  if(!selectedEvidence
    || selectedEvidence.evidenceStatus!=="ELIGIBLE"
    || Number(selectedEvidence.ordinal)!==1){
    throw new ValidationError("SP4_ADMIN_TRACE_SELECTION_NOT_SURFACED_RECOMMENDATION");
  }

  const explanation=await getSprint4RecommendationExplanation(db,recommendationSetId);
  const base=await getSelectionTrace(db,selectionId);

  return {
    profile:{profileId:version.profileId},
    riskProfileVersion:{
      riskProfileVersionId:version.riskProfileVersionId,
      versionNo:version.versionNo,
      status:version.status,
      lockedAt:version.lockedAt,
    },
    customerObjective:{
      customerObjectiveId:objective.customerObjectiveId,
      objectiveId:objective.objectiveId,
      objectiveVersion:objective.objectiveVersion,
      catalogueVersion:objective.catalogueVersion,
      policyFingerprint:objective.policyFingerprint,
      selectedAt:objective.selectedAt,
    },
    exploration:{
      explorationFingerprint:set.explorationFingerprint,
      generationVersion:scenarioLineage[0]?.generationVersion??null,
      scenarioCount:scenarios.length,
      scenarios,
    },
    marketRouteQuotes:routeQuotes,
    recommendation:{
      recommendationSetId:set.recommendationSetId,
      recommendationRuleVersion:set.recommendationRuleVersion,
      recommendationFingerprint:set.recommendationFingerprint,
      surfacedNormalisedQuoteId:set.surfacedNormalisedQuoteId,
      explanation,
    },
    recommendationSelectionLink:{
      auditEventId:selectedEvent.auditEventId,
      recommendationSetId,
      recommendationFingerprint:metadata.recommendationFingerprint??null,
      explorationFingerprint:metadata.explorationFingerprint??null,
      customerObjectiveId:metadata.customerObjectiveId??null,
    },
    selection:base.selection,
    shortlist:base.shortlist,
    finalIntegrity:base.finalIntegrity,
    completion:base.completion,
  };
}
