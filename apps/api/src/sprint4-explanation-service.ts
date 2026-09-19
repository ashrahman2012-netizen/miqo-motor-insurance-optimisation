import {createHash,randomUUID} from "node:crypto";
import {and,asc,eq} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  riskProfileVersion,
  scenario,
  scenarioDelta,
} from "../../../packages/db/src/schema.ts";
import {
  marketRoute,
  optimisationExplanation,
  recommendationExplanation,
  recommendationQuoteEvidence,
  recommendationSet,
  sp4ScenarioLineage,
} from "../../../packages/db/src/sp4-schema.ts";
import {
  buildSprint4RecommendationExplanation,
  SP4_EXPLAINABILITY_RULE_VERSION,
} from "../../../packages/comparison/src/index.ts";
import {optimisationCatalogue} from "../../../packages/optimisation/src/index.ts";
import {ValidationError} from "./errors.ts";

const uuid=(prefix:string)=>prefix+"-"+randomUUID();

function deterministicId(prefix:string,value:string){
  return prefix+"-"+createHash("sha256").update(value).digest("hex").slice(0,24).toUpperCase();
}

function controlClassification(controlId:string){
  if(controlId==="policy_start_date")return "TIME_DEPENDENT" as const;
  if(controlId==="telematics_preference")return "PROVIDER_SPECIFIC" as const;
  return "CONTROLLABLE" as const;
}

function childFingerprint(value:unknown){
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function getSprint4RecommendationExplanation(db:MiqoDatabase,recommendationSetId:string){
  const parent=(await db.select().from(recommendationExplanation)
    .where(eq(recommendationExplanation.recommendationSetId,recommendationSetId)).limit(1))[0];
  if(!parent)throw new ValidationError("SP4_RECOMMENDATION_EXPLANATION_NOT_FOUND");

  const controls=await db.select().from(optimisationExplanation)
    .where(eq(optimisationExplanation.recommendationSetId,recommendationSetId))
    .orderBy(asc(optimisationExplanation.fieldOrControl));

  return {
    recommendationExplanationId:parent.recommendationExplanationId,
    recommendationSetId:parent.recommendationSetId,
    objectiveId:parent.objectiveId,
    objectiveVersion:parent.objectiveVersion,
    catalogueVersion:parent.catalogueVersion,
    policyFingerprint:parent.policyFingerprint,
    recommendationRuleVersion:parent.recommendationRuleVersion,
    explanationRuleVersion:parent.explanationRuleVersion,
    surfacedScenarioId:parent.surfacedScenarioId,
    surfacedMarketRouteId:parent.surfacedMarketRouteId,
    surfacedNormalisedQuoteId:parent.surfacedNormalisedQuoteId,
    eligibleEvidence:parent.eligibleEvidenceJson,
    excludedEvidence:parent.excludedEvidenceJson,
    materialReasons:parent.materialReasonsJson,
    explanationFingerprint:parent.explanationFingerprint,
    controls:controls.map(item=>({
      explanationId:item.explanationId,
      fieldOrControl:item.fieldOrControl,
      classification:item.classification,
      source:item.source,
      customerCanChange:item.customerCanChange,
      baselineValue:item.baselineValue,
      scenarioValue:item.scenarioValue,
      quotedEffectIfObservable:item.quotedEffectIfObservable,
      legitimacyReason:item.legitimacyReason,
      providerChannelApplicability:item.providerChannelApplicability,
      ruleVersion:item.ruleVersion,
      explanationFingerprint:item.explanationFingerprint,
    })),
    createdAt:parent.createdAt,
  };
}

export async function ensureSprint4RecommendationExplanation(db:MiqoDatabase,recommendationSetId:string){
  const existing=(await db.select().from(recommendationExplanation)
    .where(eq(recommendationExplanation.recommendationSetId,recommendationSetId)).limit(1))[0];
  if(existing)return getSprint4RecommendationExplanation(db,recommendationSetId);

  const set=(await db.select().from(recommendationSet)
    .where(eq(recommendationSet.recommendationSetId,recommendationSetId)).limit(1))[0];
  if(!set)throw new ValidationError("SP4_RECOMMENDATION_SET_NOT_FOUND");
  if(!set.surfacedNormalisedQuoteId)throw new ValidationError("SP4_EXPLANATION_REQUIRES_SURFACED_QUOTE");

  const evidence=await db.select().from(recommendationQuoteEvidence)
    .where(eq(recommendationQuoteEvidence.recommendationSetId,recommendationSetId))
    .orderBy(asc(recommendationQuoteEvidence.createdAt),asc(recommendationQuoteEvidence.recommendationQuoteEvidenceId));

  const surfaced=evidence.find(item=>
    item.evidenceStatus==="ELIGIBLE"
    && item.ordinal===1
    && item.normalisedQuoteId===set.surfacedNormalisedQuoteId
  );
  if(!surfaced)throw new ValidationError("SP4_EXPLANATION_SURFACED_EVIDENCE_NOT_FOUND");

  const route=(await db.select().from(marketRoute)
    .where(eq(marketRoute.marketRouteId,surfaced.marketRouteId)).limit(1))[0];
  if(!route)throw new ValidationError("SP4_EXPLANATION_MARKET_ROUTE_NOT_FOUND");

  const lineage=await db.select().from(sp4ScenarioLineage).where(and(
    eq(sp4ScenarioLineage.customerObjectiveId,set.customerObjectiveId),
    eq(sp4ScenarioLineage.explorationFingerprint,set.explorationFingerprint),
  ));
  if(!lineage.length)throw new ValidationError("SP4_EXPLANATION_SCENARIO_LINEAGE_NOT_FOUND");

  const scenarios=[];
  for(const item of lineage){
    const row=(await db.select().from(scenario)
      .where(eq(scenario.scenarioId,item.scenarioId)).limit(1))[0];
    if(row)scenarios.push(row);
  }
  scenarios.sort((a,b)=>
    Number(a.generationOrdinal??Number.MAX_SAFE_INTEGER)-Number(b.generationOrdinal??Number.MAX_SAFE_INTEGER)
    || a.scenarioId.localeCompare(b.scenarioId)
  );
  const baselineScenario=scenarios[0];
  if(!baselineScenario)throw new ValidationError("SP4_EXPLANATION_BASELINE_SCENARIO_NOT_FOUND");

  const baselineDeltas=await db.select().from(scenarioDelta)
    .where(eq(scenarioDelta.scenarioId,baselineScenario.scenarioId));
  const surfacedDeltas=await db.select().from(scenarioDelta)
    .where(eq(scenarioDelta.scenarioId,surfaced.scenarioId));

  const baselineValues=new Map(baselineDeltas.map(item=>[item.fieldId,item.valueJson]));
  const controlDefinitions=new Map(optimisationCatalogue().controls.map(item=>[item.controlId,item]));

  const baselineEvidence=evidence.find(item=>
    item.evidenceStatus==="ELIGIBLE"
    && item.scenarioId===baselineScenario.scenarioId
    && item.marketRouteId===surfaced.marketRouteId
    && item.objectiveMetric===surfaced.objectiveMetric
  );

  const providerChannelApplicability={
    marketRouteId:route.marketRouteId,
    routeKey:route.routeKey,
    providerKey:route.providerKey,
    channelKey:route.channelKey,
    adapterVersion:route.adapterVersion,
    mappingVersion:route.mappingVersion,
  };

  const controls=surfacedDeltas
    .sort((a,b)=>a.fieldId.localeCompare(b.fieldId))
    .map(delta=>{
      const definition=controlDefinitions.get(delta.fieldId as any);
      const effect=baselineEvidence
        && baselineEvidence.objectiveMetricValuePence!==null
        && surfaced.objectiveMetricValuePence!==null
        ? {
            objectiveMetric:surfaced.objectiveMetric,
            baselineValuePence:baselineEvidence.objectiveMetricValuePence,
            scenarioValuePence:surfaced.objectiveMetricValuePence,
            differencePence:surfaced.objectiveMetricValuePence-baselineEvidence.objectiveMetricValuePence,
          }
        : null;
      return {
        fieldOrControl:delta.fieldId,
        classification:controlClassification(delta.fieldId),
        source:"scenario_delta",
        customerCanChange:true,
        baselineValue:baselineValues.has(delta.fieldId)?baselineValues.get(delta.fieldId):null,
        scenarioValue:delta.valueJson,
        quotedEffectIfObservable:effect,
        legitimacyReason:definition?.factualBoundary??"Permitted O-class choice under the active optimisation catalogue.",
        providerChannelApplicability,
      };
    });

  const eligibleEvidence=evidence
    .filter(item=>item.evidenceStatus==="ELIGIBLE")
    .map(item=>({
      normalisedQuoteId:item.normalisedQuoteId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRouteId,
      ordinal:Number(item.ordinal),
      objectiveMetric:String(item.objectiveMetric),
      objectiveMetricValuePence:Number(item.objectiveMetricValuePence),
      evidenceFingerprint:item.evidenceFingerprint,
    }));

  const excludedEvidence=evidence
    .filter(item=>item.evidenceStatus==="EXCLUDED")
    .map(item=>({
      normalisedQuoteId:item.normalisedQuoteId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRouteId,
      exclusionReason:String(item.exclusionReason),
      evidenceFingerprint:item.evidenceFingerprint,
    }));

  const explanation=buildSprint4RecommendationExplanation({
    recommendationSetId,
    objectiveId:set.objectiveId as any,
    objectiveVersion:set.objectiveVersion,
    catalogueVersion:set.catalogueVersion,
    policyFingerprint:set.policyFingerprint,
    recommendationRuleVersion:set.recommendationRuleVersion,
    recommendationFingerprint:set.recommendationFingerprint,
    surfacedNormalisedQuoteId:set.surfacedNormalisedQuoteId,
    surfacedScenarioId:surfaced.scenarioId,
    surfacedMarketRouteId:surfaced.marketRouteId,
    controls,
    eligibleEvidence,
    excludedEvidence,
  });

  const recommendationExplanationId=deterministicId("REX-SP4",explanation.explanationFingerprint);

  await db.insert(recommendationExplanation).values({
    recommendationExplanationId,
    recommendationSetId,
    objectiveId:set.objectiveId,
    objectiveVersion:set.objectiveVersion,
    catalogueVersion:set.catalogueVersion,
    policyFingerprint:set.policyFingerprint,
    recommendationRuleVersion:set.recommendationRuleVersion,
    explanationRuleVersion:SP4_EXPLAINABILITY_RULE_VERSION,
    surfacedScenarioId:surfaced.scenarioId,
    surfacedMarketRouteId:surfaced.marketRouteId,
    surfacedNormalisedQuoteId:set.surfacedNormalisedQuoteId,
    eligibleEvidenceJson:explanation.eligibleEvidence,
    excludedEvidenceJson:explanation.excludedEvidence,
    materialReasonsJson:explanation.materialReasons,
    explanationFingerprint:explanation.explanationFingerprint,
  });

  if(explanation.controls.length){
    await db.insert(optimisationExplanation).values(explanation.controls.map(control=>{
      const fingerprint=childFingerprint({
        recommendationSetId,
        scenarioId:surfaced.scenarioId,
        marketRouteId:surfaced.marketRouteId,
        ...control,
      });
      return {
        explanationId:deterministicId("OEX-SP4",fingerprint),
        recommendationSetId,
        scenarioId:surfaced.scenarioId,
        marketRouteId:surfaced.marketRouteId,
        fieldOrControl:control.fieldOrControl,
        classification:control.classification,
        source:control.source,
        customerCanChange:control.customerCanChange,
        baselineValue:control.baselineValue,
        scenarioValue:control.scenarioValue,
        quotedEffectIfObservable:control.quotedEffectIfObservable,
        legitimacyReason:control.legitimacyReason,
        providerChannelApplicability:control.providerChannelApplicability,
        ruleVersion:SP4_EXPLAINABILITY_RULE_VERSION,
        explanationFingerprint:fingerprint,
      };
    }));
  }

  const version=(await db.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,set.riskProfileVersionId)).limit(1))[0];

  await db.insert(auditEvent).values({
    auditEventId:uuid("AUD"),
    eventType:"sp4_recommendation_explanation_created",
    entityType:"recommendation_explanation",
    entityId:recommendationExplanationId,
    traceId:version?.profileId??null,
    metadataJson:{
      recommendationSetId,
      explanationRuleVersion:SP4_EXPLAINABILITY_RULE_VERSION,
      explanationFingerprint:explanation.explanationFingerprint,
      surfacedNormalisedQuoteId:set.surfacedNormalisedQuoteId,
      surfacedScenarioId:surfaced.scenarioId,
      surfacedMarketRouteId:surfaced.marketRouteId,
      controlCount:explanation.controls.length,
      eligibleEvidenceCount:explanation.eligibleEvidence.length,
      excludedEvidenceCount:explanation.excludedEvidence.length,
    },
  });

  return getSprint4RecommendationExplanation(db,recommendationSetId);
}
