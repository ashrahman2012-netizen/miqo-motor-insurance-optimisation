import type {
  AdminAuditTraceFiltersVM,
  AdminAuditTracePageVM,
  AdminCurrentArtefactVM,
  AdminGovernanceSummaryVM,
  AdminIntegrityQueueItemVM,
  AdminNormalisedEvidenceVM,
  AdminRawProviderResponseVM,
  ApplicationEnvironment,
  AuditEventVM,
  AuditTimelineVM,
  LineageExplorerVM,
  LineageNodeVM,
  PageStateVM,
  StatusVM,
} from "@miqo/application-contracts";

export interface AdminAuditEventApi {
  readonly auditEventId:string;
  readonly eventType:string;
  readonly entityType:string;
  readonly entityId:string;
  readonly traceId:string|null;
  readonly occurredAt:string;
  readonly metadataJson:Readonly<Record<string,unknown>>|null;
}

export interface AdminRawProviderResponseApi {
  readonly rawProviderResponseId:string;
  readonly quoteRequestId:string;
  readonly providerReference:string|null;
  readonly responseTimestamp:string|null;
  readonly payloadText:string;
  readonly payload:unknown;
  readonly payloadSha256:string;
  readonly receivedAt:string|null;
}

export interface AdminSprint4TraceApi {
  readonly profile:{readonly profileId:string};
  readonly riskProfileVersion:{
    readonly riskProfileVersionId:string;
    readonly versionNo:number;
    readonly status:"DRAFT"|"LOCKED"|"SUPERSEDED";
    readonly lockedAt:string|null;
  };
  readonly customerObjective:{
    readonly customerObjectiveId:string;
    readonly objectiveId:string;
    readonly objectiveVersion:string;
    readonly catalogueVersion:string;
    readonly policyFingerprint:string;
    readonly selectedAt:string|null;
  };
  readonly exploration:{
    readonly explorationFingerprint:string;
    readonly generationVersion:string|null;
    readonly scenarioCount:number;
    readonly scenarios:ReadonlyArray<{
      readonly scenarioId:string;
      readonly generationOrdinal:number|null;
      readonly generationVersion:string;
      readonly candidateFingerprint:string;
      readonly catalogueVersion:string;
      readonly policyFingerprint:string;
      readonly deltas:ReadonlyArray<{readonly fieldId:string;readonly controlClass:string;readonly value:unknown}>;
    }>;
  };
  readonly marketRouteQuotes:ReadonlyArray<{
    readonly evidenceStatus:"ELIGIBLE"|"EXCLUDED";
    readonly ordinal:number|null;
    readonly objectiveMetric:string|null;
    readonly objectiveMetricValuePence:number|null;
    readonly exclusionReason:string|null;
    readonly evidenceFingerprint:string;
    readonly scenarioId:string;
    readonly marketRoute:{
      readonly marketRouteId:string;
      readonly routeKey:string;
      readonly routeCatalogueVersion:string;
      readonly providerKey:string;
      readonly channelKey:string;
      readonly adapterVersion:string;
      readonly mappingVersion:string;
      readonly routeFingerprint:string;
    };
    readonly quoteRequest:{
      readonly quoteRequestId:string;
      readonly requestFingerprint:string;
      readonly adapterVersion:string;
      readonly mappingVersion:string;
      readonly orchestrationVersion:string;
    };
    readonly rawProviderResponse:{
      readonly rawProviderResponseId:string;
      readonly providerReference:string|null;
      readonly payloadSha256:string;
    };
    readonly normalisedQuote:{
      readonly normalisedQuoteId:string;
      readonly normalisationVersion:string;
      readonly normalisationFingerprint:string;
      readonly comparisonState:"DIRECTLY_COMPARABLE"|"ADJUSTED_COMPARABLE"|"NOT_COMPARABLE";
      readonly annualCashPremiumPence:number;
      readonly financeCostPence:number|null;
      readonly compulsoryExcessPence:number;
      readonly voluntaryExcessPence:number;
    };
  }>;
  readonly recommendation:{
    readonly recommendationSetId:string;
    readonly recommendationRuleVersion:string;
    readonly recommendationFingerprint:string;
    readonly surfacedNormalisedQuoteId:string|null;
    readonly explanation:{
      readonly recommendationExplanationId:string;
      readonly explanationRuleVersion:string;
      readonly explanationFingerprint:string;
      readonly materialReasons:ReadonlyArray<{readonly code:string;readonly detail:string}>;
    };
  };
  readonly recommendationSelectionLink:{
    readonly auditEventId:string;
    readonly recommendationSetId:string;
    readonly recommendationFingerprint:unknown;
    readonly explorationFingerprint:unknown;
    readonly customerObjectiveId:unknown;
  };
  readonly selection:{
    readonly selectionId:string;
    readonly status:string;
    readonly selectedAt:string;
  };
  readonly shortlist:{
    readonly shortlistId:string;
    readonly comparisonRuleVersion:string;
    readonly comparisonFingerprint:string;
  };
  readonly finalIntegrity:{
    readonly finalIntegrityResultId:string;
    readonly ruleVersion:string;
    readonly outcome:"PASS"|"BLOCKED";
    readonly evidence:Readonly<Record<string,unknown>>;
  }|null;
  readonly completion:{
    readonly prototypeCompletionId:string;
    readonly status:string;
    readonly dataClassification:string;
    readonly liveProviderActivity:string;
  }|null;
}

function pageState(
  state:PageStateVM["state"],
  code:PageStateVM["code"],
  title:string|null,
  message:string|null,
):PageStateVM{
  return {state,code,title,message,retryable:false,referenceId:null};
}

function status(code:string,label:string,semanticFamily:StatusVM["semanticFamily"],reason:string|null=null):StatusVM{
  return {code,label,semanticFamily,reason};
}

function eventSummary(event:AdminAuditEventApi){
  const labels:Record<string,string>={
    profile_created:"Profile created",
    fact_saved:"Factual field recorded",
    profile_correction_started:"Profile correction started",
    profile_validated:"Profile validated",
    profile_locked:"Profile locked",
    customer_objective_selected:"Customer objective selected",
    optimisation_preferences_saved:"Optimisation choices saved",
    scenario_generated:"Scenario generated",
    sp4_scenario_exploration_generated:"Scenario exploration generated",
    quote_request_prepared:"Quote request prepared",
    raw_provider_response_captured:"Raw provider response captured",
    provider_response_normalised:"Provider response normalised",
    comparison_generated:"Comparison generated",
    shortlist_created:"Shortlist created",
    sp4_recommendation_set_created:"Recommendation set created",
    sp4_recommendation_explanation_created:"Recommendation explanation created",
    quote_selection_attempted:"Quote selection attempted",
    quote_selected:"Quote selected",
    final_integrity_blocked:"Final integrity blocked",
    final_integrity_passed:"Final integrity passed",
    prototype_completed:"Synthetic journey completed",
  };
  return labels[event.eventType]??event.eventType.replaceAll("_"," ").replace(/^./,value=>value.toUpperCase());
}

function withinDate(value:string,from:string|null,to:string|null){
  const instant=new Date(value).getTime();
  if(!Number.isFinite(instant))return true;
  if(from){
    const start=new Date(from+"T00:00:00.000Z").getTime();
    if(Number.isFinite(start)&&instant<start)return false;
  }
  if(to){
    const end=new Date(to+"T23:59:59.999Z").getTime();
    if(Number.isFinite(end)&&instant>end)return false;
  }
  return true;
}

function filteredTimeline(profileId:string,events:ReadonlyArray<AdminAuditEventApi>,filters:AdminAuditTraceFiltersVM):AuditTimelineVM{
  const selected=events.filter(event=>{
    if(filters.eventType&&event.eventType!==filters.eventType)return false;
    if(filters.scenarioId){
      const scenarioId=event.metadataJson?.scenarioId;
      if(event.entityId!==filters.scenarioId&&scenarioId!==filters.scenarioId)return false;
    }
    return withinDate(event.occurredAt,filters.dateFrom,filters.dateTo);
  });
  const mapped:ReadonlyArray<AuditEventVM>=selected.map(event=>({
    auditEventId:event.auditEventId,
    eventType:event.eventType,
    entityType:event.entityType,
    entityId:event.entityId,
    occurredAt:event.occurredAt,
    summary:eventSummary(event),
  }));
  return {
    profileId,
    events:mapped,
    pageState:mapped.length
      ?pageState("SUCCESS",null,null,null)
      :pageState("EMPTY",null,"No matching audit events","No append-only audit events match the current console filters."),
  };
}

function selectedEvidence(trace:AdminSprint4TraceApi){
  return trace.marketRouteQuotes.find(item=>
    item.normalisedQuote.normalisedQuoteId===trace.recommendation.surfacedNormalisedQuoteId
    && item.scenarioId===trace.exploration.scenarios.find(s=>s.scenarioId===item.scenarioId)?.scenarioId
    && item.quoteRequest.quoteRequestId
  )??null;
}

function node(
  nodeId:string,
  kind:LineageNodeVM["kind"],
  label:string,
  metadata:Readonly<Record<string,unknown>>,
  nodeStatus:StatusVM|null=null,
):LineageNodeVM{
  return {nodeId,kind,label,status:nodeStatus,metadata};
}

function buildLineage(trace:AdminSprint4TraceApi):LineageExplorerVM{
  const selected=selectedEvidence(trace);
  const surfacedScenario=trace.exploration.scenarios.find(item=>item.scenarioId===selected?.scenarioId)
    ??trace.exploration.scenarios[0]??null;
  const nodes:LineageNodeVM[]=[
    node(trace.profile.profileId,"PROFILE","Profile",{}),
    node(
      trace.riskProfileVersion.riskProfileVersionId,
      "PROFILE_VERSION",
      `Profile version ${trace.riskProfileVersion.versionNo}`,
      {versionNo:trace.riskProfileVersion.versionNo,lockedAt:trace.riskProfileVersion.lockedAt},
      status(trace.riskProfileVersion.status,trace.riskProfileVersion.status,trace.riskProfileVersion.status==="LOCKED"?"info":"neutral"),
    ),
    node(
      trace.customerObjective.customerObjectiveId,
      "OBJECTIVE",
      trace.customerObjective.objectiveId.replaceAll("_"," "),
      {objectiveVersion:trace.customerObjective.objectiveVersion,catalogueVersion:trace.customerObjective.catalogueVersion},
    ),
  ];
  if(surfacedScenario){
    nodes.push(node(
      surfacedScenario.scenarioId,
      "SCENARIO",
      `Scenario ${surfacedScenario.generationOrdinal??""}`.trim(),
      {generationVersion:surfacedScenario.generationVersion,candidateFingerprint:surfacedScenario.candidateFingerprint},
    ));
  }
  if(selected){
    nodes.push(
      node(selected.marketRoute.marketRouteId,"MARKET_ROUTE",selected.marketRoute.routeKey,{
        providerKey:selected.marketRoute.providerKey,channelKey:selected.marketRoute.channelKey,
        adapterVersion:selected.marketRoute.adapterVersion,mappingVersion:selected.marketRoute.mappingVersion,
      }),
      node(selected.quoteRequest.quoteRequestId,"QUOTE_REQUEST","Quote request",{
        requestFingerprint:selected.quoteRequest.requestFingerprint,orchestrationVersion:selected.quoteRequest.orchestrationVersion,
      }),
      node(selected.rawProviderResponse.rawProviderResponseId,"RAW_PROVIDER_RESPONSE","Raw provider response",{
        payloadSha256:selected.rawProviderResponse.payloadSha256,providerReference:selected.rawProviderResponse.providerReference,
      }),
      node(
        selected.normalisedQuote.normalisedQuoteId,
        "NORMALISED_QUOTE",
        "Normalised quote",
        {normalisationVersion:selected.normalisedQuote.normalisationVersion,normalisationFingerprint:selected.normalisedQuote.normalisationFingerprint},
        status(
          selected.normalisedQuote.comparisonState,
          selected.normalisedQuote.comparisonState.replaceAll("_"," "),
          selected.normalisedQuote.comparisonState==="DIRECTLY_COMPARABLE"?"success":selected.normalisedQuote.comparisonState==="ADJUSTED_COMPARABLE"?"dormant":"neutral",
        ),
      ),
    );
  }
  nodes.push(
    node(trace.recommendation.recommendationSetId,"RECOMMENDATION_SET","Recommendation set",{
      recommendationRuleVersion:trace.recommendation.recommendationRuleVersion,
      recommendationFingerprint:trace.recommendation.recommendationFingerprint,
    }),
    node(trace.recommendation.explanation.recommendationExplanationId,"EXPLANATION","Recommendation explanation",{
      explanationRuleVersion:trace.recommendation.explanation.explanationRuleVersion,
      explanationFingerprint:trace.recommendation.explanation.explanationFingerprint,
    }),
    node(
      trace.selection.selectionId,"SELECTION","Selection",{selectedAt:trace.selection.selectedAt},
      status(trace.selection.status,trace.selection.status,trace.selection.status==="ACCEPTED"?"success":"warning"),
    ),
  );
  if(trace.finalIntegrity){
    nodes.push(node(
      trace.finalIntegrity.finalIntegrityResultId,"FINAL_INTEGRITY","Final integrity",
      {ruleVersion:trace.finalIntegrity.ruleVersion},
      status(trace.finalIntegrity.outcome,trace.finalIntegrity.outcome,trace.finalIntegrity.outcome==="PASS"?"success":"danger"),
    ));
  }
  if(trace.completion){
    nodes.push(node(trace.completion.prototypeCompletionId,"COMPLETION","Synthetic completion",{
      status:trace.completion.status,
      dataClassification:trace.completion.dataClassification,
      liveProviderActivity:trace.completion.liveProviderActivity,
    }));
  }
  return {
    selectionId:trace.selection.selectionId,
    nodes,
    pageState:pageState("SUCCESS",null,null,null),
  };
}

function currentArtefact(trace:AdminSprint4TraceApi):AdminCurrentArtefactVM{
  const selected=selectedEvidence(trace);
  const surfacedScenario=selected?.scenarioId??null;
  return {
    profileId:trace.profile.profileId,
    profileVersionId:trace.riskProfileVersion.riskProfileVersionId,
    profileVersionNo:trace.riskProfileVersion.versionNo,
    profileStatus:trace.riskProfileVersion.status,
    customerObjectiveId:trace.customerObjective.customerObjectiveId,
    objectiveId:trace.customerObjective.objectiveId,
    scenarioId:surfacedScenario,
    explorationFingerprint:trace.exploration.explorationFingerprint,
    marketRouteId:selected?.marketRoute.marketRouteId??null,
    quoteRequestId:selected?.quoteRequest.quoteRequestId??null,
    rawProviderResponseId:selected?.rawProviderResponse.rawProviderResponseId??null,
    normalisedQuoteId:selected?.normalisedQuote.normalisedQuoteId??null,
    recommendationSetId:trace.recommendation.recommendationSetId,
    recommendationFingerprint:trace.recommendation.recommendationFingerprint,
    explanationFingerprint:trace.recommendation.explanation.explanationFingerprint,
    selectionId:trace.selection.selectionId,
    finalIntegrityResultId:trace.finalIntegrity?.finalIntegrityResultId??null,
    ruleVersions:{
      objective:trace.customerObjective.objectiveVersion,
      catalogue:trace.customerObjective.catalogueVersion,
      generation:trace.exploration.generationVersion??"unknown",
      comparison:trace.shortlist.comparisonRuleVersion,
      recommendation:trace.recommendation.recommendationRuleVersion,
      explanation:trace.recommendation.explanation.explanationRuleVersion,
      finalIntegrity:trace.finalIntegrity?.ruleVersion??"not evaluated",
    },
  };
}

function integrityQueue(trace:AdminSprint4TraceApi|null):ReadonlyArray<AdminIntegrityQueueItemVM>{
  if(!trace)return [];
  const commercial=trace.recommendation.explanation.materialReasons.some(item=>item.code==="COMMERCIAL_INPUTS_EXCLUDED");
  const items:AdminIntegrityQueueItemVM[]=[
    {
      itemId:trace.recommendation.recommendationSetId,
      category:"RECOMMENDATION",
      label:"Recommendation evidence",
      status:status("PASS","PASS","success"),
      detail:`Persisted recommendation set using ${trace.recommendation.recommendationRuleVersion}.`,
    },
    {
      itemId:trace.recommendation.explanation.recommendationExplanationId,
      category:"EXPLANATION",
      label:"Explainability evidence",
      status:status("PASS","PASS","success"),
      detail:`Persisted explanation using ${trace.recommendation.explanation.explanationRuleVersion}.`,
    },
    {
      itemId:"commercial-independence",
      category:"LINEAGE",
      label:"Commercial independence evidence",
      status:commercial?status("PASS","PASS","success"):status("INFORMATIONAL","REVIEW","warning"),
      detail:commercial
        ?"Persisted material reasons record that commercial inputs were excluded from recommendation ordering."
        :"No COMMERCIAL_INPUTS_EXCLUDED material reason is present in the persisted explanation.",
    },
  ];
  if(trace.finalIntegrity){
    items.push({
      itemId:trace.finalIntegrity.finalIntegrityResultId,
      category:"FINAL_INTEGRITY",
      label:"Final integrity",
      status:status(trace.finalIntegrity.outcome,trace.finalIntegrity.outcome,trace.finalIntegrity.outcome==="PASS"?"success":"danger"),
      detail:`Final integrity evaluated under ${trace.finalIntegrity.ruleVersion}.`,
    });
  }else{
    items.push({
      itemId:"final-integrity-not-evaluated",
      category:"FINAL_INTEGRITY",
      label:"Final integrity",
      status:status("PENDING","PENDING","warning"),
      detail:"No final-integrity result is persisted for this selection.",
    });
  }
  return items;
}

function governance(environment:ApplicationEnvironment,trace:AdminSprint4TraceApi|null):AdminGovernanceSummaryVM{
  const commercial=trace?.recommendation.explanation.materialReasons.some(item=>item.code==="COMMERCIAL_INPUTS_EXCLUDED")??false;
  return {
    auditTrail:status("ACTIVE","ACTIVE","success"),
    appendOnly:status("APPEND_ONLY","APPEND-ONLY","info"),
    commercialIndependence:commercial
      ?status("VERIFIED","VERIFIED","success")
      :status("INFORMATIONAL","NOT EVALUATED","warning"),
    environment,
    nonAdvised:status("NON_ADVISED","NON-ADVISED","info"),
  };
}

export function composeAdminAuditTracePageVM(args:{
  filters:AdminAuditTraceFiltersVM;
  environment:ApplicationEnvironment;
  trace:AdminSprint4TraceApi|null;
  auditEvents:ReadonlyArray<AdminAuditEventApi>;
  rawProviderResponse:AdminRawProviderResponseApi|null;
}):AdminAuditTracePageVM{
  const profileId=args.trace?.profile.profileId??args.filters.profileId;
  const timeline=profileId?filteredTimeline(profileId,args.auditEvents,args.filters):null;
  const lineage=args.trace?buildLineage(args.trace):null;
  const artefact=args.trace?currentArtefact(args.trace):null;
  const selected=args.trace?selectedEvidence(args.trace):null;

  const raw:AdminRawProviderResponseVM|null=args.rawProviderResponse?{
    rawProviderResponseId:args.rawProviderResponse.rawProviderResponseId,
    quoteRequestId:args.rawProviderResponse.quoteRequestId,
    providerReference:args.rawProviderResponse.providerReference,
    payloadSha256:args.rawProviderResponse.payloadSha256,
    payload:args.rawProviderResponse.payload,
    responseTimestamp:args.rawProviderResponse.responseTimestamp,
    receivedAt:args.rawProviderResponse.receivedAt,
  }:null;

  const normalised:AdminNormalisedEvidenceVM|null=selected?{
    normalisedQuoteId:selected.normalisedQuote.normalisedQuoteId,
    normalisationVersion:selected.normalisedQuote.normalisationVersion,
    normalisationFingerprint:selected.normalisedQuote.normalisationFingerprint,
    comparisonState:selected.normalisedQuote.comparisonState,
    annualCashPremiumPence:selected.normalisedQuote.annualCashPremiumPence,
    financeCostPence:selected.normalisedQuote.financeCostPence,
    compulsoryExcessPence:selected.normalisedQuote.compulsoryExcessPence,
    voluntaryExcessPence:selected.normalisedQuote.voluntaryExcessPence,
  }:null;

  let state:PageStateVM;
  if(args.trace){
    state=pageState("SUCCESS",null,null,null);
  }else if(profileId){
    state=pageState(
      timeline?.events.length?"PARTIAL":"EMPTY",
      null,
      timeline?.events.length?"Profile audit loaded":"No audit evidence found",
      timeline?.events.length
        ?"Audit history is available. Supply a selection ID to add end-to-end recommendation and quote lineage."
        :"No append-only audit evidence matches this profile and filter set.",
    );
  }else{
    state=pageState(
      "EMPTY",
      null,
      "Search the audit trail",
      "Enter a profile reference for lifecycle audit history or a selection reference for complete end-to-end lineage.",
    );
  }

  return {
    filters:args.filters,
    lineage,
    timeline,
    currentArtefact:artefact,
    rawProviderResponse:raw,
    normalisedEvidence:normalised,
    integrityQueue:integrityQueue(args.trace),
    governance:governance(args.environment,args.trace),
    pageState:state,
  };
}
