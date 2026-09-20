import type {
  ActionAvailabilityVM,
  ApplicationEnvironment,
  FinalIntegrityStateVM,
  NormalisedQuoteVM,
  PageStateVM,
  ResultDetailVM,
  ResultReasonVM,
  ResultsPageVM,
  QuoteComparisonPageVM,
} from "@miqo/application-contracts";

export interface ResultRecommendationEvidenceApi {
  readonly recommendationQuoteEvidenceId:string;
  readonly normalisedQuoteId:string;
  readonly quoteRequestId:string;
  readonly scenarioId:string;
  readonly marketRouteId:string;
  readonly status:"ELIGIBLE"|"EXCLUDED";
  readonly ordinal:number|null;
  readonly objectiveMetric:string|null;
  readonly objectiveMetricValuePence:number|null;
  readonly exclusionReason:string|null;
  readonly evidence:Readonly<Record<string,unknown>>;
  readonly evidenceFingerprint:string;
}

export interface ResultRecommendationApi {
  readonly recommendationSetId:string;
  readonly customerObjectiveId:string;
  readonly riskProfileVersionId:string;
  readonly explorationFingerprint:string;
  readonly objectiveId:string;
  readonly objectiveVersion:string;
  readonly catalogueVersion:string;
  readonly policyFingerprint:string;
  readonly recommendationRuleVersion:string;
  readonly recommendationFingerprint:string;
  readonly surfacedNormalisedQuoteId:string|null;
  readonly createdAt:string;
  readonly eligible:ReadonlyArray<ResultRecommendationEvidenceApi>;
  readonly excluded:ReadonlyArray<ResultRecommendationEvidenceApi>;
}

export interface ResultExplanationControlApi {
  readonly explanationId:string;
  readonly fieldOrControl:string;
  readonly classification:string;
  readonly source:string;
  readonly customerCanChange:boolean;
  readonly baselineValue:unknown;
  readonly scenarioValue:unknown;
  readonly quotedEffectIfObservable:unknown;
  readonly legitimacyReason:string;
  readonly providerChannelApplicability:Readonly<Record<string,unknown>>;
  readonly ruleVersion:string;
  readonly explanationFingerprint:string;
}

export interface ResultExplanationApi {
  readonly recommendationExplanationId:string;
  readonly recommendationSetId:string;
  readonly objectiveId:string;
  readonly objectiveVersion:string;
  readonly catalogueVersion:string;
  readonly policyFingerprint:string;
  readonly recommendationRuleVersion:string;
  readonly explanationRuleVersion:string;
  readonly surfacedScenarioId:string;
  readonly surfacedMarketRouteId:string;
  readonly surfacedNormalisedQuoteId:string;
  readonly eligibleEvidence:ReadonlyArray<Readonly<Record<string,unknown>>>;
  readonly excludedEvidence:ReadonlyArray<Readonly<Record<string,unknown>>>;
  readonly materialReasons:ReadonlyArray<{readonly code:string;readonly detail:string}>;
  readonly explanationFingerprint:string;
  readonly controls:ReadonlyArray<ResultExplanationControlApi>;
  readonly createdAt:string;
}

export interface ResultSelectionApi {
  readonly selectionId:string;
  readonly normalisedQuoteId:string;
  readonly scenarioId:string;
  readonly quoteRequestId:string;
  readonly riskProfileVersionId:string;
  readonly status:string;
  readonly finalIntegrity:{
    readonly ruleVersion:string;
    readonly outcome:"PASS"|"BLOCKED";
    readonly evidence:Readonly<Record<string,unknown>>;
  }|null;
  readonly completion:{
    readonly status:string;
    readonly dataClassification:string;
    readonly liveProviderActivity:string;
  }|null;
}

function state(
  state:PageStateVM["state"],
  code:PageStateVM["code"],
  title:string|null,
  message:string|null,
):PageStateVM{
  return {state,code,title,message,retryable:false,referenceId:null};
}

function action(value:ActionAvailabilityVM["state"],reason:string|null=null):ActionAvailabilityVM{
  return {state:value,reason};
}

function reasonTitle(code:string){
  const known:Record<string,string>={
    CUSTOMER_OBJECTIVE_APPLIED:"Selected customer objective",
    SURFACED_QUOTE_RANKED_FIRST:"Ranked first for the selected objective",
    ELIGIBILITY_EVIDENCE_PRESERVED:"Eligible and excluded evidence retained",
    COMMERCIAL_INPUTS_EXCLUDED:"Commercial independence",
  };
  return known[code]??code.replaceAll("_"," ").toLowerCase().replace(/^./,value=>value.toUpperCase());
}

function displayValue(value:unknown){
  if(value===null||value===undefined)return "Not supplied";
  if(Array.isArray(value))return value.length?value.map(displayValue).join(", "):"None";
  if(typeof value==="boolean")return value?"Yes":"No";
  if(typeof value==="object")return JSON.stringify(value);
  return String(value);
}

function explanationReasons(explanation:ResultExplanationApi):ReadonlyArray<ResultReasonVM>{
  const material=explanation.materialReasons.map((item,index):ResultReasonVM=>({
    reasonId:`material-${index}-${item.code}`,
    title:reasonTitle(item.code),
    detail:item.detail,
    controlId:null,
    controlClass:null,
  }));
  const controls=explanation.controls.map((item):ResultReasonVM=>({
    reasonId:item.explanationId,
    title:item.fieldOrControl.replaceAll("_"," "),
    detail:`Choice moved from ${displayValue(item.baselineValue)} to ${displayValue(item.scenarioValue)}. ${item.legitimacyReason}`,
    controlId:item.fieldOrControl,
    controlClass:"O",
  }));
  return [...material,...controls];
}

function finalIntegrity(selection:ResultSelectionApi|null):FinalIntegrityStateVM|null{
  if(!selection)return null;
  return {
    selectionId:selection.selectionId,
    status:selection.status,
    outcome:selection.finalIntegrity?.outcome??"UNKNOWN",
    ruleVersion:selection.finalIntegrity?.ruleVersion??null,
    completed:Boolean(selection.completion),
    dataClassification:selection.completion?.dataClassification??null,
    liveProviderActivity:selection.completion?.liveProviderActivity??null,
  };
}

function handoff(environment:ApplicationEnvironment,integrity:FinalIntegrityStateVM|null){
  if(environment!=="PRODUCTION"){
    return {
      action:action("NOT_AUTHORISED","Live insurer handoff is not authorised outside the production environment."),
      label:"Go to insurer",
      disclosure:"This environment cannot purchase, bind or redirect to a live insurer. Final integrity proof is separate from provider handoff.",
    };
  }
  if(integrity?.outcome!=="PASS"){
    return {
      action:action("BLOCKED","Final integrity must pass before a provider handoff can be considered."),
      label:"Go to insurer",
      disclosure:"Provider handoff remains blocked until final integrity succeeds.",
    };
  }
  return {
    action:action("BLOCKED","No production provider handoff contract or destination is configured in BUILD-001F."),
    label:"Go to insurer",
    disclosure:"BUILD-001F prepares the handoff state but does not invent provider URLs, purchase flows or binding capability.",
  };
}

function resultSetIntegrity(selection:ResultSelectionApi|null,explanation:ResultExplanationApi){
  if(selection?.finalIntegrity){
    const signals=Array.isArray((selection.finalIntegrity.evidence as any)?.signals)
      ?(selection.finalIntegrity.evidence as any).signals.map((item:any)=>String(item?.ruleId??item))
      :[];
    return {
      outcome:selection.finalIntegrity.outcome,
      ruleVersion:selection.finalIntegrity.ruleVersion,
      reasons:signals.length?signals:["Final selection integrity evaluated against persisted lineage evidence."],
    } as const;
  }
  const commercial=explanation.materialReasons.some(item=>item.code==="COMMERCIAL_INPUTS_EXCLUDED");
  return {
    outcome:"INFORMATIONAL" as const,
    ruleVersion:explanation.explanationRuleVersion,
    reasons:[
      "Recommendation and explanation evidence are persisted and fingerprinted.",
      commercial
        ?"The persisted explanation states that commercial inputs were excluded from recommendation ordering."
        :"Commercial-independence explanation evidence was not found.",
      "Final selection integrity has not yet been executed.",
    ],
  };
}

export function composeResultsPageVM(args:{
  profileId:string;
  comparisonPage:QuoteComparisonPageVM;
  recommendation:ResultRecommendationApi|null;
  explanation:ResultExplanationApi|null;
  selection:ResultSelectionApi|null;
  environment:ApplicationEnvironment;
}):ResultsPageVM{
  const comparison=args.comparisonPage.comparison;
  const canGenerate=
    args.comparisonPage.profileVersion.status==="LOCKED"
    && Boolean(args.comparisonPage.customerObjectiveId)
    && Boolean(args.comparisonPage.explorationFingerprint)
    && Boolean(comparison?.directlyComparable.length);

  const generateAction=args.recommendation
    ? action("HIDDEN","Your Results are already persisted for this objective and scenario exploration.")
    : args.environment!=="SYNTHETIC"
      ? action("NOT_AUTHORISED","The current recommendation executor is authorised only in the controlled synthetic runtime.")
      : canGenerate
        ? action("AVAILABLE")
        : action("BLOCKED","Comparable quotation evidence is required before Your Results can be generated.");

  if(!args.recommendation){
    return {
      profileId:args.profileId,
      profileVersion:args.comparisonPage.profileVersion,
      customerObjectiveId:args.comparisonPage.customerObjectiveId,
      explorationFingerprint:args.comparisonPage.explorationFingerprint,
      detail:null,
      provenance:null,
      generateAction,
      finalIntegrityAction:action("HIDDEN","No persisted result set exists yet."),
      finalIntegrity:null,
      pageState:canGenerate
        ?state("EMPTY","NO_ELIGIBLE_RESULTS","Your Results are ready to generate","Persist the objective-specific result set and explanation from the existing comparison evidence.")
        :state(args.comparisonPage.pageState.state,args.comparisonPage.pageState.code,args.comparisonPage.pageState.title,args.comparisonPage.pageState.message),
    };
  }

  if(!args.explanation||!comparison){
    return {
      profileId:args.profileId,
      profileVersion:args.comparisonPage.profileVersion,
      customerObjectiveId:args.comparisonPage.customerObjectiveId,
      explorationFingerprint:args.comparisonPage.explorationFingerprint,
      detail:null,
      provenance:null,
      generateAction,
      finalIntegrityAction:action("BLOCKED","Persisted explanation and comparison evidence are required."),
      finalIntegrity:null,
      pageState:state("ERROR",null,"Result evidence incomplete","A RecommendationSet exists but its explanation or comparison evidence could not be composed."),
    };
  }

  const allQuotes=[
    ...comparison.directlyComparable,
    ...comparison.notComparable,
    ...args.comparisonPage.objectiveExcluded.map(item=>item.quote),
  ];
  const surfaced=allQuotes.find(item=>item.normalisedQuoteId===args.recommendation?.surfacedNormalisedQuoteId)??null;
  const alternatives=comparison.directlyComparable
    .filter(item=>item.normalisedQuoteId!==surfaced?.normalisedQuoteId)
    .sort((a,b)=>Number(a.ordinal??Number.MAX_SAFE_INTEGER)-Number(b.ordinal??Number.MAX_SAFE_INTEGER));
  const excluded=[
    ...comparison.notComparable,
    ...args.comparisonPage.objectiveExcluded.map(item=>item.quote),
  ];
  const integrity=finalIntegrity(args.selection);
  const selectionMatches=!args.selection
    || (
      args.selection.riskProfileVersionId===args.comparisonPage.profileVersion.versionId
      && args.selection.normalisedQuoteId===surfaced?.normalisedQuoteId
    );

  const finalIntegrityAction=!surfaced
    ?action("BLOCKED","A surfaced result is required.")
    :args.selection
      ?action("HIDDEN","Final integrity has already been evaluated for this selected result.")
      :args.environment==="SYNTHETIC"
        ?action("AVAILABLE")
        :action("NOT_AUTHORISED","Synthetic final-integrity proof is not exposed in this environment.");

  const detail:ResultDetailVM={
    resultSetId:args.recommendation.recommendationSetId,
    sourceRecommendationSetId:args.recommendation.recommendationSetId,
    objective:comparison.objective,
    surfacedResult:surfaced,
    alternatives,
    excluded,
    whyThisSurfaced:explanationReasons(args.explanation),
    integrity:resultSetIntegrity(args.selection,args.explanation),
    handoff:handoff(args.environment,integrity),
    pageState:surfaced
      ?state("SUCCESS",null,null,null)
      :state("ERROR",null,"Surfaced result unavailable","The persisted surfaced quote is not present in the selected comparison evidence."),
  };

  return {
    profileId:args.profileId,
    profileVersion:args.comparisonPage.profileVersion,
    customerObjectiveId:args.comparisonPage.customerObjectiveId,
    explorationFingerprint:args.comparisonPage.explorationFingerprint,
    detail,
    provenance:{
      recommendationRuleVersion:args.recommendation.recommendationRuleVersion,
      recommendationFingerprint:args.recommendation.recommendationFingerprint,
      explanationRuleVersion:args.explanation.explanationRuleVersion,
      explanationFingerprint:args.explanation.explanationFingerprint,
    },
    generateAction,
    finalIntegrityAction,
    finalIntegrity:integrity,
    pageState:selectionMatches
      ?detail.pageState
      :state("ERROR",null,"Integrity evidence mismatch","The requested selection does not belong to the surfaced result for this result set."),
  };
}
