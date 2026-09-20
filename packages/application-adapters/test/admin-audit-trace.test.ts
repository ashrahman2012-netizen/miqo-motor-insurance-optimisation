import {describe,expect,it} from "vitest";
import {
  composeAdminAuditTracePageVM,
  type AdminAuditEventApi,
  type AdminRawProviderResponseApi,
  type AdminSprint4TraceApi,
} from "../src/admin-audit-trace";

const trace:AdminSprint4TraceApi={
  profile:{profileId:"PRO-001G"},
  riskProfileVersion:{riskProfileVersionId:"RPV-001G",versionNo:1,status:"LOCKED",lockedAt:"2026-09-20T12:00:00Z"},
  customerObjective:{customerObjectiveId:"OBJ-001G",objectiveId:"LOWEST_ANNUAL_PREMIUM",objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"policy-fp",selectedAt:"2026-09-20T12:01:00Z"},
  exploration:{
    explorationFingerprint:"EXP-001G",generationVersion:"sp4-gen-v1",scenarioCount:1,
    scenarios:[{scenarioId:"SCN-001G",generationOrdinal:1,generationVersion:"sp4-gen-v1",candidateFingerprint:"candidate-fp",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"policy-fp",deltas:[{fieldId:"voluntary_excess",controlClass:"O",value:250}]}],
  },
  marketRouteQuotes:[{
    evidenceStatus:"ELIGIBLE",ordinal:1,objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:65000,exclusionReason:null,evidenceFingerprint:"evidence-fp",scenarioId:"SCN-001G",
    marketRoute:{marketRouteId:"MR-001G",routeKey:"SYNTHETIC_DIRECT",routeCatalogueVersion:"routes-v1",providerKey:"MOCK-PROVIDER-001",channelKey:"DIRECT_SYNTHETIC",adapterVersion:"adapter-v1",mappingVersion:"map-v1",routeFingerprint:"route-fp"},
    quoteRequest:{quoteRequestId:"REQ-001G",requestFingerprint:"request-fp",adapterVersion:"adapter-v1",mappingVersion:"map-v1",orchestrationVersion:"orch-v1"},
    rawProviderResponse:{rawProviderResponseId:"RAW-001G",providerReference:"MOCK-REF",payloadSha256:"sha-001g"},
    normalisedQuote:{normalisedQuoteId:"NOR-001G",normalisationVersion:"norm-v1",normalisationFingerprint:"norm-fp",comparisonState:"DIRECTLY_COMPARABLE",annualCashPremiumPence:65000,financeCostPence:0,compulsoryExcessPence:25000,voluntaryExcessPence:25000},
  }],
  recommendation:{
    recommendationSetId:"REC-001G",recommendationRuleVersion:"rec-v1",recommendationFingerprint:"rec-fp",surfacedNormalisedQuoteId:"NOR-001G",
    explanation:{recommendationExplanationId:"REX-001G",explanationRuleVersion:"explain-v1",explanationFingerprint:"explain-fp",materialReasons:[
      {code:"CUSTOMER_OBJECTIVE_APPLIED",detail:"Selected objective used."},
      {code:"COMMERCIAL_INPUTS_EXCLUDED",detail:"Commercial inputs excluded."},
    ]},
  },
  recommendationSelectionLink:{auditEventId:"AUD-LINK",recommendationSetId:"REC-001G",recommendationFingerprint:"rec-fp",explorationFingerprint:"EXP-001G",customerObjectiveId:"OBJ-001G"},
  selection:{selectionId:"SEL-001G",status:"ACCEPTED",selectedAt:"2026-09-20T12:10:00Z"},
  shortlist:{shortlistId:"SL-001G",comparisonRuleVersion:"compare-v1",comparisonFingerprint:"compare-fp"},
  finalIntegrity:{finalIntegrityResultId:"FIR-001G",ruleVersion:"final-v1",outcome:"PASS",evidence:{signals:[]}},
  completion:{prototypeCompletionId:"COMP-001G",status:"PROTOTYPE_JOURNEY_COMPLETE",dataClassification:"SYNTHETIC",liveProviderActivity:"DISABLED"},
};

const events:ReadonlyArray<AdminAuditEventApi>=[
  {auditEventId:"AUD-1",eventType:"profile_locked",entityType:"risk_profile_version",entityId:"RPV-001G",traceId:"PRO-001G",occurredAt:"2026-09-20T12:00:00Z",metadataJson:{}},
  {auditEventId:"AUD-2",eventType:"sp4_scenario_exploration_generated",entityType:"scenario_exploration",entityId:"EXP-001G",traceId:"PRO-001G",occurredAt:"2026-09-20T12:02:00Z",metadataJson:{scenarioId:"SCN-001G"}},
  {auditEventId:"AUD-3",eventType:"final_integrity_passed",entityType:"selection",entityId:"SEL-001G",traceId:"PRO-001G",occurredAt:"2026-09-20T12:11:00Z",metadataJson:{scenarioId:"SCN-001G"}},
];

const raw:AdminRawProviderResponseApi={
  rawProviderResponseId:"RAW-001G",quoteRequestId:"REQ-001G",providerReference:"MOCK-REF",
  responseTimestamp:"2026-09-20T12:05:00Z",payloadText:'{"premium":650}',payload:{premium:650},
  payloadSha256:"sha-001g",receivedAt:"2026-09-20T12:05:01Z",
};

describe("BUILD-001G admin audit and trace adapter",()=>{
  it("preserves raw and normalised evidence as distinct lineage nodes",()=>{
    const vm=composeAdminAuditTracePageVM({
      filters:{profileId:null,selectionId:"SEL-001G",scenarioId:null,eventType:null,dateFrom:null,dateTo:null},
      environment:"SYNTHETIC",trace,auditEvents:events,rawProviderResponse:raw,
    });
    expect(vm.pageState.state).toBe("SUCCESS");
    expect(vm.lineage?.nodes.map(item=>item.kind)).toEqual([
      "PROFILE","PROFILE_VERSION","OBJECTIVE","SCENARIO","MARKET_ROUTE","QUOTE_REQUEST",
      "RAW_PROVIDER_RESPONSE","NORMALISED_QUOTE","RECOMMENDATION_SET","EXPLANATION","SELECTION",
      "FINAL_INTEGRITY","COMPLETION",
    ]);
    expect(vm.rawProviderResponse?.rawProviderResponseId).toBe("RAW-001G");
    expect(vm.normalisedEvidence?.normalisedQuoteId).toBe("NOR-001G");
    expect(vm.currentArtefact?.recommendationFingerprint).toBe("rec-fp");
  });

  it("filters the append-only timeline without mutating or reinterpreting events",()=>{
    const vm=composeAdminAuditTracePageVM({
      filters:{profileId:"PRO-001G",selectionId:null,scenarioId:"SCN-001G",eventType:"final_integrity_passed",dateFrom:"2026-09-20",dateTo:"2026-09-20"},
      environment:"SYNTHETIC",trace:null,auditEvents:events,rawProviderResponse:null,
    });
    expect(vm.timeline?.events).toHaveLength(1);
    expect(vm.timeline?.events[0]?.auditEventId).toBe("AUD-3");
    expect(vm.lineage).toBeNull();
    expect(vm.pageState.state).toBe("PARTIAL");
  });

  it("derives governance state only from persisted evidence",()=>{
    const vm=composeAdminAuditTracePageVM({
      filters:{profileId:null,selectionId:"SEL-001G",scenarioId:null,eventType:null,dateFrom:null,dateTo:null},
      environment:"SYNTHETIC",trace,auditEvents:events,rawProviderResponse:raw,
    });
    expect(vm.governance.commercialIndependence.code).toBe("VERIFIED");
    expect(vm.integrityQueue.find(item=>item.category==="FINAL_INTEGRITY")?.status.code).toBe("PASS");

    const withoutCommercial={
      ...trace,
      recommendation:{...trace.recommendation,explanation:{...trace.recommendation.explanation,materialReasons:[]}},
    };
    const second=composeAdminAuditTracePageVM({
      filters:{profileId:null,selectionId:"SEL-001G",scenarioId:null,eventType:null,dateFrom:null,dateTo:null},
      environment:"SYNTHETIC",trace:withoutCommercial,auditEvents:events,rawProviderResponse:raw,
    });
    expect(second.governance.commercialIndependence.code).toBe("INFORMATIONAL");
  });
});
