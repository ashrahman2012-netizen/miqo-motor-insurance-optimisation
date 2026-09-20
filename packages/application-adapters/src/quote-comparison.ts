import type {
  ActionAvailabilityVM,
  ApplicationEnvironment,
  NormalisedQuoteVM,
  ObjectiveVM,
  PageStateVM,
  QuoteComparisonPageVM,
  QuoteComparisonVM,
} from "@miqo/application-contracts";
import type {
  PersistedCustomerObjectiveApi,
  ScenarioExplorationApi,
  ScenarioProfileVersionApi,
} from "./optimise";

export interface QuoteComparisonMarketRouteApi {
  readonly marketRouteId:string;
  readonly routeKey:string;
  readonly routeCatalogueVersion:string;
  readonly providerKey:string;
  readonly channelKey:string;
  readonly adapterVersion:string;
  readonly mappingVersion:string;
  readonly routeFingerprint:string;
  readonly synthetic:boolean;
}

export interface QuoteComparisonNormalisedApi {
  readonly normalisedQuoteId:string;
  readonly normalisationVersion:string;
  readonly normalisationFingerprint:string;
  readonly comparisonState:"DIRECTLY_COMPARABLE"|"ADJUSTED_COMPARABLE"|"NOT_COMPARABLE";
  readonly comparisonReason:string|null;
  readonly annualCashPremiumPence:number;
  readonly financeCostPence:number|null;
  readonly compulsoryExcessPence:number;
  readonly voluntaryExcessPence:number;
}

export interface QuoteComparisonEvidenceApi {
  readonly normalisedQuoteId:string;
  readonly quoteRequestId:string;
  readonly scenarioId:string;
  readonly marketRoute:QuoteComparisonMarketRouteApi;
  readonly normalisedQuote:QuoteComparisonNormalisedApi;
  readonly paymentStructure:string|null;
  readonly totalExcessExposurePence:number|null;
  readonly ordinal:number|null;
  readonly objectiveMetric:string|null;
  readonly objectiveMetricValuePence:number|null;
  readonly status:"ELIGIBLE"|"EXCLUDED";
  readonly exclusionReason:string|null;
  readonly evidenceFingerprint:string;
}

export interface ObjectiveQuoteComparisonApi {
  readonly customerObjectiveId:string;
  readonly riskProfileVersionId:string;
  readonly explorationFingerprint:string;
  readonly objective:{
    readonly objectiveId:ObjectiveVM["objectiveId"];
    readonly objectiveVersion:string;
    readonly catalogueVersion:string;
    readonly label:string;
    readonly explanation:string;
    readonly primaryDimension:string;
    readonly executable:boolean;
  };
  readonly comparisonRuleVersion:string;
  readonly comparisonFingerprint:string;
  readonly orchestrationVersion:string;
  readonly quoteCount:number;
  readonly normalisedQuoteCount:number;
  readonly unavailableQuoteCount:number;
  readonly eligible:ReadonlyArray<QuoteComparisonEvidenceApi>;
  readonly excluded:ReadonlyArray<QuoteComparisonEvidenceApi>;
}

function pageState(state:PageStateVM["state"],code:PageStateVM["code"],title:string|null,message:string|null):PageStateVM{
  return {state,code,title,message,retryable:false,referenceId:null};
}

function routeName(route:QuoteComparisonMarketRouteApi){
  if(route.channelKey==="DIRECT_SYNTHETIC")return "Synthetic Direct Route";
  if(route.channelKey==="PCW_SYNTHETIC")return "Synthetic Comparison Route";
  return route.routeKey;
}

function quoteVM(item:QuoteComparisonEvidenceApi,environment:ApplicationEnvironment):NormalisedQuoteVM{
  return {
    normalisedQuoteId:item.normalisedQuote.normalisedQuoteId,
    quoteRequestId:item.quoteRequestId,
    scenarioId:item.scenarioId,
    marketRoute:{
      marketRouteId:item.marketRoute.marketRouteId,
      routeKey:item.marketRoute.routeKey,
      displayName:routeName(item.marketRoute),
      providerKey:item.marketRoute.providerKey,
      channelKey:item.marketRoute.channelKey,
      environment,
      adapterVersion:item.marketRoute.adapterVersion,
      mappingVersion:item.marketRoute.mappingVersion,
      certificationState:null,
    },
    comparisonState:item.normalisedQuote.comparisonState,
    comparisonReason:item.normalisedQuote.comparisonReason,
    ordinal:item.ordinal,
    objectiveMetric:item.objectiveMetric,
    objectiveMetricValuePence:item.objectiveMetricValuePence,
    pricing:{
      annualCashPremiumPence:item.normalisedQuote.annualCashPremiumPence,
      financeCostPence:item.normalisedQuote.financeCostPence,
      monthlyCommitmentPence:item.objectiveMetric==="monthly_commitment_pence"?item.objectiveMetricValuePence:null,
      totalPayablePence:null,
    },
    excess:{
      compulsoryExcessPence:item.normalisedQuote.compulsoryExcessPence,
      voluntaryExcessPence:item.normalisedQuote.voluntaryExcessPence,
      totalExcessExposurePence:item.totalExcessExposurePence,
    },
    normalisationVersion:item.normalisedQuote.normalisationVersion,
    eligible:item.status==="ELIGIBLE",
    exclusionReason:item.exclusionReason,
    openAction:{state:"HIDDEN",reason:"Quote detail is outside BUILD-001E."},
  };
}

function objectiveVM(input:ObjectiveQuoteComparisonApi["objective"],customerObjectiveId:string):ObjectiveVM{
  return {
    customerObjectiveId,
    objectiveId:input.objectiveId,
    label:input.label,
    explanation:input.explanation,
    primaryDimension:input.primaryDimension,
    executable:input.executable,
    selected:true,
    objectiveVersion:input.objectiveVersion,
    catalogueVersion:input.catalogueVersion,
  };
}

export function composeQuoteComparisonPageVM(args:{
  profileId:string;
  version:ScenarioProfileVersionApi;
  persistedObjectives:ReadonlyArray<PersistedCustomerObjectiveApi>;
  selectedCustomerObjectiveId:string|null;
  explorations:ReadonlyArray<ScenarioExplorationApi>;
  selectedExplorationFingerprint:string|null;
  comparison:ObjectiveQuoteComparisonApi|null;
  environment:ApplicationEnvironment;
}):QuoteComparisonPageVM{
  const selectedObjective=args.persistedObjectives.find(item=>item.customerObjectiveId===args.selectedCustomerObjectiveId)??null;
  const selectedExploration=args.explorations.find(item=>item.explorationFingerprint===args.selectedExplorationFingerprint)??null;
  const explorationOptions=args.explorations.map(item=>({
    explorationFingerprint:item.explorationFingerprint,
    generationVersion:item.generationVersion,
    scenarioCount:item.items.length,
    rejectedCombinationCount:item.rejections.length,
  }));

  let runAction:ActionAvailabilityVM;
  if(args.version.status!=="LOCKED"){
    runAction={state:"BLOCKED",reason:"Quote comparison requires an exact locked profile version."};
  }else if(!selectedObjective){
    runAction={state:"BLOCKED",reason:"Select an executable customer objective first."};
  }else if(!selectedExploration){
    runAction={state:"BLOCKED",reason:"Select a generated scenario exploration first."};
  }else if(args.environment!=="SYNTHETIC"){
    runAction={state:"NOT_AUTHORISED",reason:"The current BUILD-001E route executor is authorised for synthetic evidence only."};
  }else{
    runAction={state:"AVAILABLE",reason:null};
  }

  let state:PageStateVM;
  if(args.version.status!=="LOCKED"){
    state=pageState("BLOCKED","PROFILE_NOT_LOCKED","Profile lock required","Quote comparison requires an exact locked factual profile version.");
  }else if(!selectedObjective){
    state=pageState("PARTIAL","NO_OBJECTIVE","Select an objective","Choose an objective before comparing quotation evidence.");
  }else if(args.explorations.length===0){
    state=pageState("EMPTY","NO_SCENARIOS","No scenarios","Generate an O-class scenario exploration before running quotation routes.");
  }else if(!selectedExploration){
    state=pageState("PARTIAL","NO_SCENARIOS","Select a scenario exploration","Choose which persisted scenario exploration to compare.");
  }else if(!args.comparison || args.comparison.quoteCount===0){
    state=pageState("EMPTY","NO_QUOTES","No quotation evidence","Run the authorised quote routes for the selected scenario exploration.");
  }else if(args.comparison.eligible.length===0){
    state=pageState("EMPTY","ALL_QUOTES_NOT_COMPARABLE","No eligible comparable quotes","Quotation evidence exists, but none is eligible for ordering under the selected objective.");
  }else if(args.comparison.unavailableQuoteCount>0){
    state=pageState("PARTIAL","PARTIAL_QUOTES","Partial quotation evidence","Some route requests have no normalised quotation evidence.");
  }else{
    state=pageState("SUCCESS",null,null,null);
  }

  let comparisonVM:QuoteComparisonVM|null=null;
  let objectiveExcluded:QuoteComparisonPageVM["objectiveExcluded"]=[];
  if(args.comparison){
    const objective=objectiveVM(args.comparison.objective,args.comparison.customerObjectiveId);
    const eligible=args.comparison.eligible.map(item=>quoteVM(item,args.environment));
    const structurallyNotComparable=args.comparison.excluded
      .filter(item=>item.normalisedQuote.comparisonState!=="DIRECTLY_COMPARABLE")
      .map(item=>quoteVM(item,args.environment));
    objectiveExcluded=args.comparison.excluded
      .filter(item=>item.normalisedQuote.comparisonState==="DIRECTLY_COMPARABLE")
      .map(item=>({quote:quoteVM(item,args.environment),exclusionReason:item.exclusionReason??"OBJECTIVE_NOT_ELIGIBLE"}));
    comparisonVM={
      objective,
      directlyComparable:eligible,
      notComparable:structurallyNotComparable,
      unavailableRoutes:[],
      pageState:state,
    };
  }

  return {
    profileId:args.profileId,
    profileVersion:{
      versionId:args.version.versionId,
      versionNo:args.version.versionNo,
      status:args.version.status,
      lockedAt:args.version.lockedAt,
    },
    customerObjectiveId:selectedObjective?.customerObjectiveId??null,
    explorationFingerprint:selectedExploration?.explorationFingerprint??null,
    explorations:explorationOptions,
    comparison:comparisonVM,
    objectiveExcluded,
    quoteCount:args.comparison?.quoteCount??0,
    normalisedQuoteCount:args.comparison?.normalisedQuoteCount??0,
    unavailableQuoteCount:args.comparison?.unavailableQuoteCount??0,
    comparisonRuleVersion:args.comparison?.comparisonRuleVersion??null,
    comparisonFingerprint:args.comparison?.comparisonFingerprint??null,
    runAction,
    pageState:state,
  };
}
