import {createHash,randomUUID} from "node:crypto";
import {and,asc,eq,sql} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  customerObjective,
  riskProfileVersion,
  scenarioDelta,
} from "../../../packages/db/src/schema.ts";
import {
  recommendationQuoteEvidence,
  recommendationSet,
} from "../../../packages/db/src/sp4-schema.ts";
import {
  analyseSprint4Recommendations,
  SP4_RECOMMENDATION_RULE_VERSION,
} from "../../../packages/comparison/src/index.ts";
import {ConflictError,ValidationError} from "./errors.ts";
import {listSprint4MarketRouteQuotes} from "./sprint4-market-route-service.ts";
import {ensureSprint4RecommendationExplanation} from "./sprint4-explanation-service.ts";

const uuid=(prefix:string)=>prefix+"-"+randomUUID();

function deterministicId(prefix:string,value:string){
  return prefix+"-"+createHash("sha256").update(value).digest("hex").slice(0,24).toUpperCase();
}

async function presentRecommendationSet(db:MiqoDatabase,setId:string,created:boolean){
  const row=(await db.select().from(recommendationSet)
    .where(eq(recommendationSet.recommendationSetId,setId)).limit(1))[0];
  if(!row)throw new ValidationError("SP4_RECOMMENDATION_SET_NOT_FOUND");

  const evidence=await db.select().from(recommendationQuoteEvidence)
    .where(eq(recommendationQuoteEvidence.recommendationSetId,setId))
    .orderBy(asc(recommendationQuoteEvidence.createdAt),asc(recommendationQuoteEvidence.recommendationQuoteEvidenceId));

  const eligible=evidence
    .filter(item=>item.evidenceStatus==="ELIGIBLE")
    .sort((a,b)=>Number(a.ordinal)-Number(b.ordinal))
    .map(item=>({
      recommendationQuoteEvidenceId:item.recommendationQuoteEvidenceId,
      normalisedQuoteId:item.normalisedQuoteId,
      quoteRequestId:item.quoteRequestId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRouteId,
      status:item.evidenceStatus,
      ordinal:item.ordinal,
      objectiveMetric:item.objectiveMetric,
      objectiveMetricValuePence:item.objectiveMetricValuePence,
      exclusionReason:null,
      evidence:item.evidenceJson,
      evidenceFingerprint:item.evidenceFingerprint,
    }));

  const excluded=evidence
    .filter(item=>item.evidenceStatus==="EXCLUDED")
    .sort((a,b)=>
      String(a.exclusionReason).localeCompare(String(b.exclusionReason))
      || a.scenarioId.localeCompare(b.scenarioId)
      || a.marketRouteId.localeCompare(b.marketRouteId)
    )
    .map(item=>({
      recommendationQuoteEvidenceId:item.recommendationQuoteEvidenceId,
      normalisedQuoteId:item.normalisedQuoteId,
      quoteRequestId:item.quoteRequestId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRouteId,
      status:item.evidenceStatus,
      ordinal:null,
      objectiveMetric:null,
      objectiveMetricValuePence:null,
      exclusionReason:item.exclusionReason,
      evidence:item.evidenceJson,
      evidenceFingerprint:item.evidenceFingerprint,
    }));

  return {
    created,
    recommendationSetId:row.recommendationSetId,
    customerObjectiveId:row.customerObjectiveId,
    riskProfileVersionId:row.riskProfileVersionId,
    explorationFingerprint:row.explorationFingerprint,
    objectiveId:row.objectiveId,
    objectiveVersion:row.objectiveVersion,
    catalogueVersion:row.catalogueVersion,
    policyFingerprint:row.policyFingerprint,
    recommendationRuleVersion:row.recommendationRuleVersion,
    recommendationFingerprint:row.recommendationFingerprint,
    surfacedNormalisedQuoteId:row.surfacedNormalisedQuoteId,
    createdAt:row.createdAt,
    eligible,
    excluded,
  };
}

async function scenarioPaymentStructure(db:MiqoDatabase,scenarioId:string){
  const row=(await db.select().from(scenarioDelta).where(and(
    eq(scenarioDelta.scenarioId,scenarioId),
    eq(scenarioDelta.fieldId,"payment_structure"),
  )).limit(1))[0];
  return row?String(row.valueJson):null;
}

export async function createSprint4RecommendationSet(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  explorationFingerprint:string;
}){
  const objective=(await db.select().from(customerObjective)
    .where(eq(customerObjective.customerObjectiveId,args.customerObjectiveId)).limit(1))[0];
  if(!objective)throw new ValidationError("CUSTOMER_OBJECTIVE_NOT_FOUND");

  const quoted=await listSprint4MarketRouteQuotes(db,args);
  if(!quoted.items.length)throw new ValidationError("SP4_MARKET_ROUTE_QUOTES_NOT_FOUND");

  const payments=new Map<string,string|null>();
  for(const item of quoted.items){
    if(!payments.has(item.scenarioId)){
      payments.set(item.scenarioId,await scenarioPaymentStructure(db,item.scenarioId));
    }
  }

  const quotes=quoted.items.map((item:any)=>{
    if(!item.normalisedQuote)throw new ValidationError("SP4_RECOMMENDATION_REQUIRES_NORMALISED_QUOTES");
    return {
      normalisedQuoteId:item.normalisedQuote.normalisedQuoteId,
      quoteRequestId:item.quoteRequestId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRoute.marketRouteId,
      routeKey:item.marketRoute.routeKey,
      comparisonState:item.normalisedQuote.comparisonState,
      annualCashPremiumPence:item.normalisedQuote.annualCashPremiumPence,
      financeCostPence:item.normalisedQuote.financeCostPence,
      compulsoryExcessPence:item.normalisedQuote.compulsoryExcessPence,
      voluntaryExcessPence:item.normalisedQuote.voluntaryExcessPence,
      paymentStructure:payments.get(item.scenarioId)??null,
    };
  });

  const analysis=analyseSprint4Recommendations({
    objectiveId:objective.objectiveId as any,
    objectiveVersion:objective.objectiveVersion,
    catalogueVersion:objective.catalogueVersion,
    policyFingerprint:objective.policyFingerprint,
    explorationFingerprint:args.explorationFingerprint,
    quotes,
  });

  return db.transaction(async tx=>{
    const lockKey="sp4-recommendation:"+args.customerObjectiveId+":"+args.explorationFingerprint+":"+SP4_RECOMMENDATION_RULE_VERSION;
    await tx.execute(sql.raw("SELECT pg_advisory_xact_lock(hashtext('"+lockKey.replaceAll("'","''")+"'))"));

    const existing=(await tx.select().from(recommendationSet).where(and(
      eq(recommendationSet.customerObjectiveId,args.customerObjectiveId),
      eq(recommendationSet.explorationFingerprint,args.explorationFingerprint),
      eq(recommendationSet.recommendationRuleVersion,SP4_RECOMMENDATION_RULE_VERSION),
    )).limit(1))[0];

    if(existing){
      if(existing.recommendationFingerprint!==analysis.recommendationFingerprint){
        throw new ConflictError("SP4_RECOMMENDATION_FINGERPRINT_MISMATCH");
      }
      await ensureSprint4RecommendationExplanation(tx as MiqoDatabase,existing.recommendationSetId);
      return presentRecommendationSet(tx as MiqoDatabase,existing.recommendationSetId,false);
    }

    const recommendationSetId=deterministicId("REC-SP4",analysis.recommendationFingerprint);
    await tx.insert(recommendationSet).values({
      recommendationSetId,
      customerObjectiveId:objective.customerObjectiveId,
      riskProfileVersionId:objective.riskProfileVersionId,
      explorationFingerprint:args.explorationFingerprint,
      objectiveId:objective.objectiveId,
      objectiveVersion:objective.objectiveVersion,
      catalogueVersion:objective.catalogueVersion,
      policyFingerprint:objective.policyFingerprint,
      recommendationRuleVersion:SP4_RECOMMENDATION_RULE_VERSION,
      recommendationFingerprint:analysis.recommendationFingerprint,
      surfacedNormalisedQuoteId:analysis.surfacedNormalisedQuoteId,
    });

    const allEvidence=[...analysis.eligible,...analysis.excluded];
    if(allEvidence.length){
      await tx.insert(recommendationQuoteEvidence).values(allEvidence.map(item=>({
        recommendationQuoteEvidenceId:deterministicId(
          "RQE-SP4",
          recommendationSetId+"|"+item.evidenceFingerprint
        ),
        recommendationSetId,
        normalisedQuoteId:item.normalisedQuoteId,
        quoteRequestId:item.quoteRequestId,
        scenarioId:item.scenarioId,
        marketRouteId:item.marketRouteId,
        evidenceStatus:item.status,
        ordinal:item.status==="ELIGIBLE"?item.ordinal:null,
        objectiveMetric:item.objectiveMetric,
        objectiveMetricValuePence:item.objectiveMetricValuePence,
        exclusionReason:item.exclusionReason,
        evidenceJson:{
          routeKey:item.routeKey,
          comparisonState:item.comparisonState,
          annualCashPremiumPence:item.annualCashPremiumPence,
          financeCostPence:item.financeCostPence,
          compulsoryExcessPence:item.compulsoryExcessPence,
          voluntaryExcessPence:item.voluntaryExcessPence,
          totalExcessExposurePence:item.totalExcessExposurePence,
          paymentStructure:item.paymentStructure,
        },
        evidenceFingerprint:item.evidenceFingerprint,
      })));
    }

    const version=(await tx.select().from(riskProfileVersion)
      .where(eq(riskProfileVersion.riskProfileVersionId,objective.riskProfileVersionId)).limit(1))[0];

    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"sp4_recommendation_set_created",
      entityType:"recommendation_set",
      entityId:recommendationSetId,
      traceId:version.profileId,
      metadataJson:{
        customerObjectiveId:objective.customerObjectiveId,
        objectiveId:objective.objectiveId,
        objectiveVersion:objective.objectiveVersion,
        catalogueVersion:objective.catalogueVersion,
        policyFingerprint:objective.policyFingerprint,
        explorationFingerprint:args.explorationFingerprint,
        recommendationRuleVersion:SP4_RECOMMENDATION_RULE_VERSION,
        recommendationFingerprint:analysis.recommendationFingerprint,
        surfacedNormalisedQuoteId:analysis.surfacedNormalisedQuoteId,
        eligibleQuoteIds:analysis.eligible.map(item=>item.normalisedQuoteId),
        excludedQuotes:analysis.excluded.map(item=>({
          normalisedQuoteId:item.normalisedQuoteId,
          reason:item.exclusionReason,
        })),
      },
    });

    await ensureSprint4RecommendationExplanation(tx as MiqoDatabase,recommendationSetId);
    return presentRecommendationSet(tx as MiqoDatabase,recommendationSetId,true);
  });
}

export async function getSprint4RecommendationSet(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  explorationFingerprint:string;
}){
  const row=(await db.select().from(recommendationSet).where(and(
    eq(recommendationSet.customerObjectiveId,args.customerObjectiveId),
    eq(recommendationSet.explorationFingerprint,args.explorationFingerprint),
    eq(recommendationSet.recommendationRuleVersion,SP4_RECOMMENDATION_RULE_VERSION),
  )).limit(1))[0];
  if(!row)throw new ValidationError("SP4_RECOMMENDATION_SET_NOT_FOUND");
  return presentRecommendationSet(db,row.recommendationSetId,false);
}
