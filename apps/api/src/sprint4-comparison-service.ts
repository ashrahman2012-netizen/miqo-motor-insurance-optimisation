import {and,eq} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {customerObjective,scenarioDelta} from "../../../packages/db/src/schema.ts";
import {
  analyseSprint4ObjectiveComparison,
  type Sprint4RecommendationQuote,
} from "../../../packages/comparison/src/index.ts";
import {customerObjectiveModel} from "../../../packages/optimisation/src/index.ts";
import {ValidationError} from "./errors.ts";
import {listSprint4MarketRouteQuotes} from "./sprint4-market-route-service.ts";

async function paymentStructure(db:MiqoDatabase,scenarioId:string){
  const row=(await db.select().from(scenarioDelta).where(and(
    eq(scenarioDelta.scenarioId,scenarioId),
    eq(scenarioDelta.fieldId,"payment_structure"),
  )).limit(1))[0];
  return row?String(row.valueJson):null;
}

export async function getSprint4ObjectiveQuoteComparison(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  explorationFingerprint:string;
}){
  const objective=(await db.select().from(customerObjective)
    .where(eq(customerObjective.customerObjectiveId,args.customerObjectiveId)).limit(1))[0];
  if(!objective)throw new ValidationError("CUSTOMER_OBJECTIVE_NOT_FOUND");

  const definition=customerObjectiveModel().objectives.find(item=>item.objectiveId===objective.objectiveId);
  if(!definition)throw new ValidationError("CUSTOMER_OBJECTIVE_DEFINITION_NOT_FOUND");
  if(!definition.executable)throw new ValidationError("CUSTOMER_OBJECTIVE_DORMANT:"+objective.objectiveId);

  const quoted=await listSprint4MarketRouteQuotes(db,args);
  const payments=new Map<string,string|null>();
  for(const item of quoted.items){
    if(!payments.has(item.scenarioId)){
      payments.set(item.scenarioId,await paymentStructure(db,item.scenarioId));
    }
  }

  const sourceById=new Map<string,any>();
  const quotes:Sprint4RecommendationQuote[]=[];
  for(const item of quoted.items){
    const normalised=item.normalisedQuote;
    if(!normalised)continue;
    sourceById.set(normalised.normalisedQuoteId,item);
    quotes.push({
      normalisedQuoteId:normalised.normalisedQuoteId,
      quoteRequestId:item.quoteRequestId,
      scenarioId:item.scenarioId,
      marketRouteId:item.marketRoute.marketRouteId,
      routeKey:item.marketRoute.routeKey,
      comparisonState:normalised.comparisonState,
      annualCashPremiumPence:normalised.annualCashPremiumPence,
      financeCostPence:normalised.financeCostPence,
      compulsoryExcessPence:normalised.compulsoryExcessPence,
      voluntaryExcessPence:normalised.voluntaryExcessPence,
      paymentStructure:payments.get(item.scenarioId)??null,
    });
  }

  const analysis=analyseSprint4ObjectiveComparison({
    objectiveId:objective.objectiveId as any,
    objectiveVersion:objective.objectiveVersion,
    catalogueVersion:objective.catalogueVersion,
    policyFingerprint:objective.policyFingerprint,
    explorationFingerprint:args.explorationFingerprint,
    quotes,
  });

  function present(item:any){
    const source=sourceById.get(item.normalisedQuoteId);
    if(!source)throw new ValidationError("SP4_COMPARISON_QUOTE_LINEAGE_NOT_FOUND");
    return {
      normalisedQuoteId:item.normalisedQuoteId,
      quoteRequestId:item.quoteRequestId,
      scenarioId:item.scenarioId,
      marketRoute:source.marketRoute,
      normalisedQuote:source.normalisedQuote,
      paymentStructure:item.paymentStructure,
      totalExcessExposurePence:item.totalExcessExposurePence,
      ordinal:item.status==="ELIGIBLE"?item.ordinal:null,
      objectiveMetric:item.objectiveMetric,
      objectiveMetricValuePence:item.objectiveMetricValuePence,
      status:item.status,
      exclusionReason:item.exclusionReason,
      evidenceFingerprint:item.evidenceFingerprint,
    };
  }

  return {
    customerObjectiveId:objective.customerObjectiveId,
    riskProfileVersionId:objective.riskProfileVersionId,
    explorationFingerprint:args.explorationFingerprint,
    objective:{
      objectiveId:objective.objectiveId,
      objectiveVersion:objective.objectiveVersion,
      catalogueVersion:objective.catalogueVersion,
      label:definition.label,
      explanation:definition.explanation,
      primaryDimension:definition.primaryDimension,
      executable:definition.executable,
    },
    comparisonRuleVersion:analysis.comparisonRuleVersion,
    comparisonFingerprint:analysis.comparisonFingerprint,
    orchestrationVersion:quoted.orchestrationVersion,
    quoteCount:quoted.items.length,
    normalisedQuoteCount:quotes.length,
    unavailableQuoteCount:quoted.items.filter(item=>!item.normalisedQuote).length,
    eligible:analysis.eligible.map(present),
    excluded:analysis.excluded.map(present),
  };
}
