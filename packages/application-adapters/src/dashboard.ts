import type {
  ActionAvailabilityVM,
  ApplicationEnvironment,
  CustomerDashboardVM,
  CustomerObjectiveId,
  DashboardJourneyStepVM,
  DashboardObjectiveSummaryVM,
  DashboardQuoteDistributionBucketVM,
  DashboardResultSummaryVM,
  DashboardScenarioSummaryVM,
  NormalisedQuoteVM,
  PageStateVM,
  ProfileVersionVM,
} from "@miqo/application-contracts";

export interface DashboardProfileVersionApi {
  readonly versionId: string;
  readonly versionNo: number;
  readonly status: "DRAFT" | "LOCKED" | "SUPERSEDED";
  readonly lockedAt: string | null;
}

export interface DashboardAuditEventApi {
  readonly auditEventId: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly occurredAt: string;
  readonly metadataJson?: unknown;
}

export interface DashboardProfileSnapshotApi {
  readonly versions: ReadonlyArray<DashboardProfileVersionApi>;
  readonly audit: ReadonlyArray<DashboardAuditEventApi>;
}

export interface DashboardCustomerObjectiveApi {
  readonly customerObjectiveId: string;
  readonly riskProfileVersionId: string;
  readonly objectiveId: CustomerObjectiveId;
  readonly objectiveVersion: string;
  readonly catalogueVersion: string;
  readonly policyFingerprint: string;
  readonly selectedAt: string | null;
}

export interface DashboardScenarioApi {
  readonly scenarioId: string;
  readonly generationOrdinal: number | null;
  readonly generationVersion: string;
  readonly candidateFingerprint: string;
}

export interface DashboardRejectionApi {
  readonly rejectionId: string;
}

export interface DashboardExplorationApi {
  readonly customerObjectiveId: string;
  readonly explorationFingerprint: string;
  readonly generationVersion: string;
  readonly items: ReadonlyArray<DashboardScenarioApi>;
  readonly rejections: ReadonlyArray<DashboardRejectionApi>;
}

export interface DashboardMarketRouteApi {
  readonly marketRouteId: string;
  readonly routeKey: string;
  readonly providerKey: string;
  readonly channelKey: string;
  readonly adapterVersion: string;
  readonly mappingVersion: string;
  readonly synthetic: boolean;
}

export interface DashboardNormalisedQuoteApi {
  readonly normalisedQuoteId: string;
  readonly normalisationVersion: string;
  readonly comparisonState: "DIRECTLY_COMPARABLE" | "ADJUSTED_COMPARABLE" | "NOT_COMPARABLE";
  readonly comparisonReason: string | null;
  readonly annualCashPremiumPence: number;
  readonly financeCostPence: number | null;
  readonly compulsoryExcessPence: number;
  readonly voluntaryExcessPence: number;
}

export interface DashboardRouteQuoteApi {
  readonly customerObjectiveId: string;
  readonly riskProfileVersionId: string;
  readonly scenarioId: string;
  readonly marketRoute: DashboardMarketRouteApi;
  readonly quoteRequestId: string;
  readonly normalisedQuote: DashboardNormalisedQuoteApi | null;
}

export interface DashboardRecommendationEvidenceApi {
  readonly normalisedQuoteId: string;
  readonly quoteRequestId: string;
  readonly scenarioId: string;
  readonly marketRouteId: string;
  readonly status: "ELIGIBLE" | "EXCLUDED";
  readonly ordinal: number | null;
  readonly objectiveMetric: string | null;
  readonly objectiveMetricValuePence: number | null;
  readonly exclusionReason: string | null;
  readonly evidence: {
    readonly routeKey?: string;
    readonly comparisonState?: string;
    readonly annualCashPremiumPence?: number;
    readonly financeCostPence?: number | null;
    readonly compulsoryExcessPence?: number;
    readonly voluntaryExcessPence?: number;
    readonly totalExcessExposurePence?: number | null;
    readonly paymentStructure?: string | null;
  };
}

export interface DashboardRecommendationApi {
  readonly recommendationSetId: string;
  readonly customerObjectiveId: string;
  readonly riskProfileVersionId: string;
  readonly explorationFingerprint: string;
  readonly objectiveId: CustomerObjectiveId;
  readonly recommendationFingerprint: string;
  readonly surfacedNormalisedQuoteId: string | null;
  readonly createdAt: string;
  readonly eligible: ReadonlyArray<DashboardRecommendationEvidenceApi>;
  readonly excluded: ReadonlyArray<DashboardRecommendationEvidenceApi>;
}

export interface DashboardCompositionInput {
  readonly profileId: string | null;
  readonly environment: ApplicationEnvironment;
  readonly snapshot: DashboardProfileSnapshotApi | null;
  readonly objectives: ReadonlyArray<DashboardCustomerObjectiveApi>;
  readonly explorations: ReadonlyArray<DashboardExplorationApi>;
  readonly selectedExploration: DashboardExplorationApi | null;
  readonly routeQuotes: ReadonlyArray<DashboardRouteQuoteApi>;
  readonly recommendation: DashboardRecommendationApi | null;
}

const OBJECTIVE_LABELS: Record<CustomerObjectiveId,string> = {
  LOWEST_ANNUAL_PREMIUM:"Lowest annual premium",
  LOWEST_MONTHLY_COMMITMENT:"Lowest monthly commitment",
  LOWEST_FINANCE_COST:"Lowest finance cost",
  LOWER_EXCESS_EXPOSURE:"Lower excess exposure",
  BALANCED_COST_AND_EXPOSURE:"Balanced cost and exposure",
};

function pageState(state:PageStateVM["state"],code:PageStateVM["code"],title:string|null,message:string|null):PageStateVM {
  return {state,code,title,message,retryable:false,referenceId:null};
}

export function selectCurrentProfileVersion(snapshot:DashboardProfileSnapshotApi|null):DashboardProfileVersionApi|null {
  if(!snapshot?.versions.length) return null;
  return [...snapshot.versions].sort((a,b)=>b.versionNo-a.versionNo||b.versionId.localeCompare(a.versionId))[0]??null;
}

export function selectLatestObjective(items:ReadonlyArray<DashboardCustomerObjectiveApi>):DashboardCustomerObjectiveApi|null {
  if(!items.length) return null;
  return [...items].sort((a,b)=>{
    const at=Date.parse(a.selectedAt??"1970-01-01T00:00:00.000Z");
    const bt=Date.parse(b.selectedAt??"1970-01-01T00:00:00.000Z");
    return bt-at||b.customerObjectiveId.localeCompare(a.customerObjectiveId);
  })[0]??null;
}

export function selectLatestRecommendation(items:ReadonlyArray<DashboardRecommendationApi>):DashboardRecommendationApi|null {
  if(!items.length) return null;
  return [...items].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||b.recommendationSetId.localeCompare(a.recommendationSetId))[0]??null;
}

export function selectDashboardExploration(
  explorations:ReadonlyArray<DashboardExplorationApi>,
  recommendation:DashboardRecommendationApi|null,
):DashboardExplorationApi|null {
  if(recommendation){
    return explorations.find(item=>item.explorationFingerprint===recommendation.explorationFingerprint)??null;
  }
  return explorations.length===1?explorations[0]:null;
}

function presentationRouteName(route:DashboardMarketRouteApi) {
  if(route.channelKey==="DIRECT_SYNTHETIC") return "Synthetic Direct Route";
  if(route.channelKey==="PCW_SYNTHETIC") return "Synthetic Comparison Route";
  return route.routeKey;
}

function toNormalisedQuoteVM(
  item:DashboardRouteQuoteApi,
  evidence:DashboardRecommendationEvidenceApi,
  environment:ApplicationEnvironment,
):NormalisedQuoteVM|null {
  const quote=item.normalisedQuote;
  if(!quote) return null;
  return {
    normalisedQuoteId:quote.normalisedQuoteId,
    quoteRequestId:item.quoteRequestId,
    scenarioId:item.scenarioId,
    marketRoute:{
      marketRouteId:item.marketRoute.marketRouteId,
      routeKey:item.marketRoute.routeKey,
      displayName:presentationRouteName(item.marketRoute),
      providerKey:item.marketRoute.providerKey,
      channelKey:item.marketRoute.channelKey,
      environment,
      adapterVersion:item.marketRoute.adapterVersion,
      mappingVersion:item.marketRoute.mappingVersion,
      certificationState:null,
    },
    comparisonState:quote.comparisonState,
    comparisonReason:quote.comparisonReason,
    ordinal:evidence.ordinal,
    objectiveMetric:evidence.objectiveMetric,
    objectiveMetricValuePence:evidence.objectiveMetricValuePence,
    pricing:{
      annualCashPremiumPence:quote.annualCashPremiumPence,
      financeCostPence:quote.financeCostPence,
      monthlyCommitmentPence:null,
      totalPayablePence:null,
    },
    excess:{
      compulsoryExcessPence:quote.compulsoryExcessPence,
      voluntaryExcessPence:quote.voluntaryExcessPence,
      totalExcessExposurePence:evidence.evidence.totalExcessExposurePence??null,
    },
    normalisationVersion:quote.normalisationVersion,
    eligible:evidence.status==="ELIGIBLE",
    exclusionReason:evidence.exclusionReason,
    openAction:{state:"AVAILABLE",reason:null},
  };
}

function quoteDistribution(values:ReadonlyArray<number>):ReadonlyArray<DashboardQuoteDistributionBucketVM> {
  const definitions=[
    {bucketId:"UNDER_400",label:"Under £400",min:0,max:39999},
    {bucketId:"400_499",label:"£400–£499",min:40000,max:49999},
    {bucketId:"500_599",label:"£500–£599",min:50000,max:59999},
    {bucketId:"600_699",label:"£600–£699",min:60000,max:69999},
    {bucketId:"700_PLUS",label:"£700+",min:70000,max:Number.POSITIVE_INFINITY},
  ] as const;
  return definitions.map(bucket=>({
    bucketId:bucket.bucketId,
    label:bucket.label,
    count:values.filter(value=>value>=bucket.min&&value<=bucket.max).length,
  }));
}

function available(reason:string|null=null):ActionAvailabilityVM {
  return {state:"AVAILABLE",reason};
}
function blocked(reason:string):ActionAvailabilityVM {
  return {state:"BLOCKED",reason};
}

function buildJourney(args:{
  hasProfile:boolean;
  validated:boolean;
  profileLocked:boolean;
  hasObjective:boolean;
  scenarioCount:number;
  quoteCount:number;
  hasResult:boolean;
  environment:ApplicationEnvironment;
}):ReadonlyArray<DashboardJourneyStepVM> {
  const complete=(id:DashboardJourneyStepVM["id"],label:string,done:boolean,detail:string|null=null):DashboardJourneyStepVM=>({
    id,label,state:done?"COMPLETE":"PENDING",detail,
  });
  return [
    complete("PROFILE_CAPTURE","Profile capture",args.hasProfile),
    complete("VALIDATION","Validation",args.validated),
    complete("PROFILE_LOCK","Locked profile",args.profileLocked),
    complete("OBJECTIVE","Objective",args.hasObjective),
    complete("SCENARIOS","Scenarios",args.scenarioCount>0),
    complete("QUOTES","Quotes",args.quoteCount>0),
    complete("RESULTS","Your Results",args.hasResult),
    {
      id:"HANDOFF",
      label:"Handoff",
      state:args.environment==="PRODUCTION"?"PENDING":"NOT_AUTHORISED",
      detail:args.environment==="PRODUCTION"?"No handoff state has been supplied.":"No purchase or binding is authorised in this environment.",
    },
  ];
}

export function composeCustomerDashboardVM(input:DashboardCompositionInput):CustomerDashboardVM {
  if(!input.profileId || !input.snapshot){
    return {
      pageState:pageState("EMPTY","NO_PROFILE","No active case","Start or open a synthetic profile to populate this dashboard."),
      profileId:null,
      profileVersion:null,
      objective:null,
      scenarios:{explorationFingerprint:null,generatedScenarioCount:0,rejectedCombinationCount:0,explorationCount:0},
      quotes:{quoteCount:0,minimumAnnualPremiumPence:null,maximumAnnualPremiumPence:null,distribution:quoteDistribution([])},
      result:null,
      journey:buildJourney({hasProfile:false,validated:false,profileLocked:false,hasObjective:false,scenarioCount:0,quoteCount:0,hasResult:false,environment:input.environment}),
      quickActions:[],
      latestUpdatedAt:null,
    };
  }

  const current=selectCurrentProfileVersion(input.snapshot);
  if(!current){
    return {
      pageState:pageState("EMPTY","NO_PROFILE","Profile not found","No profile version is available for this reference."),
      profileId:input.profileId,
      profileVersion:null,
      objective:null,
      scenarios:{explorationFingerprint:null,generatedScenarioCount:0,rejectedCombinationCount:0,explorationCount:0},
      quotes:{quoteCount:0,minimumAnnualPremiumPence:null,maximumAnnualPremiumPence:null,distribution:quoteDistribution([])},
      result:null,
      journey:buildJourney({hasProfile:false,validated:false,profileLocked:false,hasObjective:false,scenarioCount:0,quoteCount:0,hasResult:false,environment:input.environment}),
      quickActions:[],
      latestUpdatedAt:null,
    };
  }

  const objectiveRaw=selectLatestObjective(input.objectives);
  const objective:DashboardObjectiveSummaryVM|null=objectiveRaw?{
    customerObjectiveId:objectiveRaw.customerObjectiveId,
    objectiveId:objectiveRaw.objectiveId,
    label:OBJECTIVE_LABELS[objectiveRaw.objectiveId],
    selectedAt:objectiveRaw.selectedAt,
  }:null;

  const scenarioCount=input.selectedExploration
    ? input.selectedExploration.items.length
    : input.explorations.reduce((sum,item)=>sum+item.items.length,0);
  const rejectionCount=input.selectedExploration
    ? input.selectedExploration.rejections.length
    : input.explorations.reduce((sum,item)=>sum+item.rejections.length,0);
  const scenarios:DashboardScenarioSummaryVM={
    explorationFingerprint:input.selectedExploration?.explorationFingerprint??null,
    generatedScenarioCount:scenarioCount,
    rejectedCombinationCount:rejectionCount,
    explorationCount:input.explorations.length,
  };

  const premiums=input.routeQuotes.flatMap(item=>item.normalisedQuote?[item.normalisedQuote.annualCashPremiumPence]:[]);
  const quotes={
    quoteCount:premiums.length,
    minimumAnnualPremiumPence:premiums.length?Math.min(...premiums):null,
    maximumAnnualPremiumPence:premiums.length?Math.max(...premiums):null,
    distribution:quoteDistribution(premiums),
  };

  let result:DashboardResultSummaryVM|null=null;
  if(input.recommendation?.surfacedNormalisedQuoteId){
    const evidence=input.recommendation.eligible.find(item=>
      item.normalisedQuoteId===input.recommendation?.surfacedNormalisedQuoteId
      && item.status==="ELIGIBLE"
    );
    const routeQuote=input.routeQuotes.find(item=>item.normalisedQuote?.normalisedQuoteId===input.recommendation?.surfacedNormalisedQuoteId);
    if(evidence&&routeQuote){
      const surfacedResult=toNormalisedQuoteVM(routeQuote,evidence,input.environment);
      if(surfacedResult){
        result={
          recommendationSetId:input.recommendation.recommendationSetId,
          recommendationFingerprint:input.recommendation.recommendationFingerprint,
          surfacedResult,
        };
      }
    }
  }

  const profileVersion:ProfileVersionVM={
    versionId:current.versionId,
    versionNo:current.versionNo,
    status:current.status,
    lockedAt:current.lockedAt,
  };
  const validated=input.snapshot.audit.some(event=>
    event.eventType==="profile_validated"
    && event.entityId===current.versionId
    && typeof event.metadataJson==="object"
    && event.metadataJson!==null
    && (event.metadataJson as {valid?:unknown}).valid===true
  );
  const latestUpdatedAt=[...input.snapshot.audit]
    .map(item=>item.occurredAt)
    .filter(Boolean)
    .sort((a,b)=>Date.parse(b)-Date.parse(a))[0]??null;
  const locked=current.status==="LOCKED";
  const legacyProfileBase=`/profile/${encodeURIComponent(input.profileId)}`;
  const profileQuery=`?profileId=${encodeURIComponent(input.profileId)}`;
  const optimisationHref=`${legacyProfileBase}/recommendations`;

  const quickActions=[
    {actionId:"REVIEW_PROFILE" as const,label:"Review profile",href:`/profile/review${profileQuery}`,availability:available()},
    {actionId:"SET_OBJECTIVE" as const,label:"Set objective",href:locked?optimisationHref:null,availability:locked?available():blocked("Lock the applicable profile version first.")},
    {actionId:"VIEW_SCENARIOS" as const,label:"View scenarios",href:objective?optimisationHref+"#sp4-scenarios":null,availability:objective?available():blocked("Select an objective first.")},
    {actionId:"COMPARE_QUOTES" as const,label:"Compare quotes",href:quotes.quoteCount?optimisationHref+"#sp4-route-summary":null,availability:quotes.quoteCount?available():blocked("No quotation evidence is available yet.")},
    {actionId:"OPEN_RESULTS" as const,label:"Open Your Results",href:result?optimisationHref+"#sp4-explanation":null,availability:result?available():blocked("No surfaced result is available yet.")},
  ];

  return {
    pageState:pageState("SUCCESS",null,null,null),
    profileId:input.profileId,
    profileVersion,
    objective,
    scenarios,
    quotes,
    result,
    journey:buildJourney({
      hasProfile:true,
      validated,
      profileLocked:locked,
      hasObjective:Boolean(objective),
      scenarioCount:scenarios.generatedScenarioCount,
      quoteCount:quotes.quoteCount,
      hasResult:Boolean(result),
      environment:input.environment,
    }),
    quickActions,
    latestUpdatedAt,
  };
}
