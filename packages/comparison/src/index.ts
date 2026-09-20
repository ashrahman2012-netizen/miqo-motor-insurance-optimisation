import {createHash} from "node:crypto";

export const COMPARISON_RULE_VERSION="sp3-comparison-v1";

export type ComparableQuote=Readonly<{
  normalisedQuoteId:string;
  comparisonState:"DIRECTLY_COMPARABLE"|"ADJUSTED_COMPARABLE"|"NOT_COMPARABLE";
  annualCashPremiumPence:number|null;
  compulsoryExcessPence:number|null;
  voluntaryExcessPence:number|null;
}>;

function canonicalQuote(quote:ComparableQuote){
  return {
    normalisedQuoteId:quote.normalisedQuoteId,
    comparisonState:quote.comparisonState,
    annualCashPremiumPence:quote.annualCashPremiumPence,
    compulsoryExcessPence:quote.compulsoryExcessPence,
    voluntaryExcessPence:quote.voluntaryExcessPence,
  };
}

export function compareNormalisedQuotes(input:ReadonlyArray<ComparableQuote>){
  const directlyComparable=input
    .filter(quote=>quote.comparisonState==="DIRECTLY_COMPARABLE" && quote.annualCashPremiumPence!==null)
    .map(canonicalQuote)
    .sort((a,b)=>
      Number(a.annualCashPremiumPence)-Number(b.annualCashPremiumPence)
      || a.normalisedQuoteId.localeCompare(b.normalisedQuoteId)
    );

  const notComparable=input
    .filter(quote=>quote.comparisonState!=="DIRECTLY_COMPARABLE")
    .map(canonicalQuote)
    .sort((a,b)=>a.normalisedQuoteId.localeCompare(b.normalisedQuoteId));

  const fingerprint=createHash("sha256").update(JSON.stringify({
    comparisonRuleVersion:COMPARISON_RULE_VERSION,
    directlyComparable,
    notComparable,
  })).digest("hex");

  return Object.freeze({
    comparisonRuleVersion:COMPARISON_RULE_VERSION,
    comparisonFingerprint:fingerprint,
    lowestDirectlyComparablePremiumId:directlyComparable[0]?.normalisedQuoteId??null,
    directlyComparable:Object.freeze(directlyComparable.map((quote,index)=>Object.freeze({...quote,ordinal:index+1}))),
    notComparable:Object.freeze(notComparable),
  });
}


export const SP4_RECOMMENDATION_RULE_VERSION="sp4-recommendation-v1";

export type Sprint4ObjectiveId=
  | "LOWEST_ANNUAL_PREMIUM"
  | "LOWEST_MONTHLY_COMMITMENT"
  | "LOWEST_FINANCE_COST"
  | "LOWER_EXCESS_EXPOSURE"
  | "BALANCED_COST_AND_EXPOSURE";

export type Sprint4RecommendationQuote=Readonly<{
  normalisedQuoteId:string;
  quoteRequestId:string;
  scenarioId:string;
  marketRouteId:string;
  routeKey:string;
  comparisonState:"DIRECTLY_COMPARABLE"|"ADJUSTED_COMPARABLE"|"NOT_COMPARABLE";
  annualCashPremiumPence:number|null;
  financeCostPence:number|null;
  compulsoryExcessPence:number|null;
  voluntaryExcessPence:number|null;
  paymentStructure:string|null;
}>;

function recommendationBase(quote:Sprint4RecommendationQuote){
  const totalExcessExposurePence=
    quote.compulsoryExcessPence===null || quote.voluntaryExcessPence===null
      ? null
      : quote.compulsoryExcessPence+quote.voluntaryExcessPence;
  return Object.freeze({
    normalisedQuoteId:quote.normalisedQuoteId,
    quoteRequestId:quote.quoteRequestId,
    scenarioId:quote.scenarioId,
    marketRouteId:quote.marketRouteId,
    routeKey:quote.routeKey,
    comparisonState:quote.comparisonState,
    annualCashPremiumPence:quote.annualCashPremiumPence,
    financeCostPence:quote.financeCostPence,
    compulsoryExcessPence:quote.compulsoryExcessPence,
    voluntaryExcessPence:quote.voluntaryExcessPence,
    totalExcessExposurePence,
    paymentStructure:quote.paymentStructure,
  });
}

function metricForObjective(objectiveId:Sprint4ObjectiveId,quote:Sprint4RecommendationQuote){
  if(quote.comparisonState==="ADJUSTED_COMPARABLE"){
    return {eligible:false as const,exclusionReason:"COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE"};
  }
  if(quote.comparisonState!=="DIRECTLY_COMPARABLE"){
    return {eligible:false as const,exclusionReason:"COMPARISON_STATE_NOT_COMPARABLE"};
  }

  switch(objectiveId){
    case "LOWEST_ANNUAL_PREMIUM":
      return quote.annualCashPremiumPence===null
        ? {eligible:false as const,exclusionReason:"MISSING_ANNUAL_PREMIUM"}
        : {eligible:true as const,objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:quote.annualCashPremiumPence};
    case "LOWEST_FINANCE_COST":
      return quote.financeCostPence===null
        ? {eligible:false as const,exclusionReason:"MISSING_FINANCE_COST"}
        : {eligible:true as const,objectiveMetric:"finance_cost_pence",objectiveMetricValuePence:quote.financeCostPence};
    case "LOWER_EXCESS_EXPOSURE":
      return quote.compulsoryExcessPence===null || quote.voluntaryExcessPence===null
        ? {eligible:false as const,exclusionReason:"MISSING_EXCESS_DIMENSION"}
        : {
            eligible:true as const,
            objectiveMetric:"total_excess_exposure_pence",
            objectiveMetricValuePence:quote.compulsoryExcessPence+quote.voluntaryExcessPence,
          };
    case "LOWEST_MONTHLY_COMMITMENT":
      if(quote.paymentStructure!=="MONTHLY"){
        return {eligible:false as const,exclusionReason:"PAYMENT_STRUCTURE_NOT_MONTHLY"};
      }
      return quote.annualCashPremiumPence===null || quote.financeCostPence===null
        ? {eligible:false as const,exclusionReason:"MISSING_MONTHLY_COMMITMENT_INPUT"}
        : {
            eligible:true as const,
            objectiveMetric:"monthly_commitment_pence",
            objectiveMetricValuePence:Math.ceil((quote.annualCashPremiumPence+quote.financeCostPence)/12),
          };
    case "BALANCED_COST_AND_EXPOSURE":
      throw new Error("CUSTOMER_OBJECTIVE_DORMANT:BALANCED_COST_AND_EXPOSURE");
    default:
      throw new Error("UNKNOWN_CUSTOMER_OBJECTIVE:"+String(objectiveId));
  }
}

function recommendationHash(value:unknown){
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function analyseSprint4Recommendations(args:Readonly<{
  objectiveId:Sprint4ObjectiveId;
  objectiveVersion:string;
  catalogueVersion:string;
  policyFingerprint:string;
  explorationFingerprint:string;
  quotes:ReadonlyArray<Sprint4RecommendationQuote>;
}>){
  if(args.objectiveId==="BALANCED_COST_AND_EXPOSURE"){
    throw new Error("CUSTOMER_OBJECTIVE_DORMANT:BALANCED_COST_AND_EXPOSURE");
  }

  const canonicalQuotes=[...args.quotes].sort((a,b)=>
    a.scenarioId.localeCompare(b.scenarioId)
    || a.routeKey.localeCompare(b.routeKey)
    || a.normalisedQuoteId.localeCompare(b.normalisedQuoteId)
  );

  const eligible:any[]=[];
  const excluded:any[]=[];
  for(const quote of canonicalQuotes){
    const base=recommendationBase(quote);
    const metric=metricForObjective(args.objectiveId,quote);
    const context={
      objectiveId:args.objectiveId,
      objectiveVersion:args.objectiveVersion,
      catalogueVersion:args.catalogueVersion,
      policyFingerprint:args.policyFingerprint,
      explorationFingerprint:args.explorationFingerprint,
    };
    if(metric.eligible){
      const evidence={
        ...base,
        status:"ELIGIBLE" as const,
        exclusionReason:null,
        objectiveMetric:metric.objectiveMetric,
        objectiveMetricValuePence:metric.objectiveMetricValuePence,
      };
      eligible.push({...evidence,evidenceFingerprint:recommendationHash({context,evidence})});
    }else{
      const evidence={
        ...base,
        status:"EXCLUDED" as const,
        exclusionReason:metric.exclusionReason,
        objectiveMetric:null,
        objectiveMetricValuePence:null,
      };
      excluded.push({...evidence,evidenceFingerprint:recommendationHash({context,evidence})});
    }
  }

  eligible.sort((a,b)=>
    a.objectiveMetricValuePence-b.objectiveMetricValuePence
    || a.scenarioId.localeCompare(b.scenarioId)
    || a.routeKey.localeCompare(b.routeKey)
    || a.normalisedQuoteId.localeCompare(b.normalisedQuoteId)
  );
  const rankedEligible=eligible.map((item,index)=>Object.freeze({...item,ordinal:index+1}));
  excluded.sort((a,b)=>
    a.exclusionReason.localeCompare(b.exclusionReason)
    || a.scenarioId.localeCompare(b.scenarioId)
    || a.routeKey.localeCompare(b.routeKey)
    || a.normalisedQuoteId.localeCompare(b.normalisedQuoteId)
  );

  const recommendationFingerprint=recommendationHash({
    recommendationRuleVersion:SP4_RECOMMENDATION_RULE_VERSION,
    objectiveId:args.objectiveId,
    objectiveVersion:args.objectiveVersion,
    catalogueVersion:args.catalogueVersion,
    policyFingerprint:args.policyFingerprint,
    explorationFingerprint:args.explorationFingerprint,
    eligible:rankedEligible,
    excluded,
  });

  return Object.freeze({
    recommendationRuleVersion:SP4_RECOMMENDATION_RULE_VERSION,
    recommendationFingerprint,
    objectiveId:args.objectiveId,
    objectiveVersion:args.objectiveVersion,
    catalogueVersion:args.catalogueVersion,
    policyFingerprint:args.policyFingerprint,
    explorationFingerprint:args.explorationFingerprint,
    surfacedNormalisedQuoteId:rankedEligible[0]?.normalisedQuoteId??null,
    eligible:Object.freeze(rankedEligible),
    excluded:Object.freeze(excluded.map(item=>Object.freeze(item))),
  });
}

export const SP4_EXPLAINABILITY_RULE_VERSION="sp4-explainability-v1";

export type OptimisationExplanationClassification=
  | "FIXED"
  | "CONTROLLABLE"
  | "TIME_DEPENDENT"
  | "PROVIDER_SPECIFIC";

export type OptimisationExplanationInput=Readonly<{
  fieldOrControl:string;
  classification:OptimisationExplanationClassification;
  source:string;
  customerCanChange:boolean;
  baselineValue:unknown;
  scenarioValue:unknown;
  quotedEffectIfObservable:unknown;
  legitimacyReason:string;
  providerChannelApplicability:Readonly<{
    marketRouteId:string;
    routeKey:string;
    providerKey:string;
    channelKey:string;
    adapterVersion:string;
    mappingVersion:string;
  }>;
}>;

function stableExplainabilityValue(value:unknown):unknown{
  if(Array.isArray(value))return value.map(stableExplainabilityValue);
  if(value && typeof value==="object"){
    return Object.fromEntries(
      Object.entries(value as Record<string,unknown>)
        .sort(([a],[b])=>a.localeCompare(b))
        .map(([key,item])=>[key,stableExplainabilityValue(item)])
    );
  }
  return value;
}

export function buildSprint4RecommendationExplanation(args:Readonly<{
  recommendationSetId:string;
  objectiveId:Sprint4ObjectiveId;
  objectiveVersion:string;
  catalogueVersion:string;
  policyFingerprint:string;
  recommendationRuleVersion:string;
  recommendationFingerprint:string;
  surfacedNormalisedQuoteId:string;
  surfacedScenarioId:string;
  surfacedMarketRouteId:string;
  controls:ReadonlyArray<OptimisationExplanationInput>;
  eligibleEvidence:ReadonlyArray<Readonly<{
    normalisedQuoteId:string;
    scenarioId:string;
    marketRouteId:string;
    ordinal:number;
    objectiveMetric:string;
    objectiveMetricValuePence:number;
    evidenceFingerprint:string;
  }>>;
  excludedEvidence:ReadonlyArray<Readonly<{
    normalisedQuoteId:string;
    scenarioId:string;
    marketRouteId:string;
    exclusionReason:string;
    evidenceFingerprint:string;
  }>>;
}>){
  const controls=[...args.controls]
    .map(item=>Object.freeze({
      fieldOrControl:item.fieldOrControl,
      classification:item.classification,
      source:item.source,
      customerCanChange:item.customerCanChange,
      baselineValue:stableExplainabilityValue(item.baselineValue),
      scenarioValue:stableExplainabilityValue(item.scenarioValue),
      quotedEffectIfObservable:stableExplainabilityValue(item.quotedEffectIfObservable),
      legitimacyReason:item.legitimacyReason,
      providerChannelApplicability:stableExplainabilityValue(item.providerChannelApplicability),
      ruleVersion:SP4_EXPLAINABILITY_RULE_VERSION,
    }))
    .sort((a,b)=>a.fieldOrControl.localeCompare(b.fieldOrControl));

  const eligibleEvidence=[...args.eligibleEvidence]
    .map(item=>({
      normalisedQuoteId:item.normalisedQuoteId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRouteId,
      ordinal:item.ordinal,
      objectiveMetric:item.objectiveMetric,
      objectiveMetricValuePence:item.objectiveMetricValuePence,
      evidenceFingerprint:item.evidenceFingerprint,
    }))
    .sort((a,b)=>a.ordinal-b.ordinal||a.normalisedQuoteId.localeCompare(b.normalisedQuoteId));

  const excludedEvidence=[...args.excludedEvidence]
    .map(item=>({
      normalisedQuoteId:item.normalisedQuoteId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRouteId,
      exclusionReason:item.exclusionReason,
      evidenceFingerprint:item.evidenceFingerprint,
    }))
    .sort((a,b)=>
      a.exclusionReason.localeCompare(b.exclusionReason)
      || a.normalisedQuoteId.localeCompare(b.normalisedQuoteId)
    );

  const surfaced=eligibleEvidence.find(item=>item.normalisedQuoteId===args.surfacedNormalisedQuoteId);
  if(!surfaced)throw new Error("SP4_EXPLANATION_SURFACED_QUOTE_NOT_ELIGIBLE");

  const materialReasons=Object.freeze([
    Object.freeze({
      code:"CUSTOMER_OBJECTIVE_APPLIED",
      detail:`Recommendation ordering uses ${args.objectiveId} under ${args.recommendationRuleVersion}.`,
    }),
    Object.freeze({
      code:"SURFACED_QUOTE_RANKED_FIRST",
      detail:`Surfaced quote is ordinal ${surfaced.ordinal} using ${surfaced.objectiveMetric}=${surfaced.objectiveMetricValuePence} pence.`,
    }),
    Object.freeze({
      code:"ELIGIBILITY_EVIDENCE_PRESERVED",
      detail:`${eligibleEvidence.length} eligible and ${excludedEvidence.length} excluded quote evidence records are retained.`,
    }),
    Object.freeze({
      code:"COMMERCIAL_INPUTS_EXCLUDED",
      detail:"Provider commission, introducer remuneration, referral revenue and MIQO margin are not inputs to scenario generation, comparison eligibility, objective metrics or recommendation ordering.",
    }),
  ]);

  const payload={
    explanationRuleVersion:SP4_EXPLAINABILITY_RULE_VERSION,
    recommendationSetId:args.recommendationSetId,
    objectiveId:args.objectiveId,
    objectiveVersion:args.objectiveVersion,
    catalogueVersion:args.catalogueVersion,
    policyFingerprint:args.policyFingerprint,
    recommendationRuleVersion:args.recommendationRuleVersion,
    recommendationFingerprint:args.recommendationFingerprint,
    surfacedNormalisedQuoteId:args.surfacedNormalisedQuoteId,
    surfacedScenarioId:args.surfacedScenarioId,
    surfacedMarketRouteId:args.surfacedMarketRouteId,
    controls,
    eligibleEvidence,
    excludedEvidence,
    materialReasons,
  };
  const explanationFingerprint=recommendationHash(stableExplainabilityValue(payload));

  return Object.freeze({
    ...payload,
    explanationFingerprint,
  });
}



export const SP4_OBJECTIVE_COMPARISON_RULE_VERSION="sp4-objective-comparison-v1";

export function analyseSprint4ObjectiveComparison(args:Readonly<{
  objectiveId:Sprint4ObjectiveId;
  objectiveVersion:string;
  catalogueVersion:string;
  policyFingerprint:string;
  explorationFingerprint:string;
  quotes:ReadonlyArray<Sprint4RecommendationQuote>;
}>) {
  const analysed=analyseSprint4Recommendations(args);
  const comparisonFingerprint=recommendationHash({
    comparisonRuleVersion:SP4_OBJECTIVE_COMPARISON_RULE_VERSION,
    objectiveId:analysed.objectiveId,
    objectiveVersion:analysed.objectiveVersion,
    catalogueVersion:analysed.catalogueVersion,
    policyFingerprint:analysed.policyFingerprint,
    explorationFingerprint:analysed.explorationFingerprint,
    eligible:analysed.eligible,
    excluded:analysed.excluded,
  });
  return Object.freeze({
    comparisonRuleVersion:SP4_OBJECTIVE_COMPARISON_RULE_VERSION,
    comparisonFingerprint,
    objectiveId:analysed.objectiveId,
    objectiveVersion:analysed.objectiveVersion,
    catalogueVersion:analysed.catalogueVersion,
    policyFingerprint:analysed.policyFingerprint,
    explorationFingerprint:analysed.explorationFingerprint,
    eligible:analysed.eligible,
    excluded:analysed.excluded,
  });
}
