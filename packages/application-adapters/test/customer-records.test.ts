import {describe,expect,it} from "vitest";
import type {CustomerDashboardVM,NormalisedQuoteVM} from "@miqo/application-contracts";
import {
  composeCustomerActivityPageVM,
  composeCustomerDocumentsPageVM,
  composeCustomerSupportPageVM,
} from "../src/customer-records";

const quote:NormalisedQuoteVM={
  normalisedQuoteId:"NOR-001H",
  quoteRequestId:"REQ-001H",
  scenarioId:"SCN-001H",
  marketRoute:{
    marketRouteId:"MR-001H",routeKey:"SYNTHETIC_DIRECT",displayName:"Synthetic Direct Route",
    providerKey:"MOCK-PROVIDER-001",channelKey:"DIRECT_SYNTHETIC",environment:"SYNTHETIC",
    adapterVersion:"adapter-v1",mappingVersion:"map-v1",certificationState:null,
  },
  comparisonState:"DIRECTLY_COMPARABLE",comparisonReason:"REQUIRED_FIELDS_PRESENT",ordinal:1,
  objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:65000,
  pricing:{annualCashPremiumPence:65000,financeCostPence:0,monthlyCommitmentPence:null,totalPayablePence:null},
  excess:{compulsoryExcessPence:25000,voluntaryExcessPence:25000,totalExcessExposurePence:50000},
  normalisationVersion:"norm-v1",eligible:true,exclusionReason:null,openAction:{state:"AVAILABLE",reason:null},
};

const dashboard:CustomerDashboardVM={
  pageState:{state:"SUCCESS",code:null,title:null,message:null,retryable:false,referenceId:null},
  profileId:"PRO-001H",
  profileVersion:{versionId:"RPV-001H",versionNo:1,status:"LOCKED",lockedAt:"2026-09-20T12:00:00Z"},
  objective:{customerObjectiveId:"OBJ-001H",objectiveId:"LOWEST_ANNUAL_PREMIUM",label:"Lowest annual premium",selectedAt:"2026-09-20T12:01:00Z"},
  scenarios:{explorationFingerprint:"EXP-001H",generatedScenarioCount:4,rejectedCombinationCount:1,explorationCount:1},
  quotes:{quoteCount:8,minimumAnnualPremiumPence:65000,maximumAnnualPremiumPence:88000,distribution:[]},
  result:{recommendationSetId:"REC-001H",recommendationFingerprint:"rec-fp-001h",surfacedResult:quote},
  journey:[],
  quickActions:[],
  latestUpdatedAt:"2026-09-20T12:15:00Z",
};

describe("BUILD-001H customer records, activity and support adapters",()=>{
  it("exposes application records without pretending downloadable documents exist",()=>{
    const vm=composeCustomerDocumentsPageVM({dashboard});
    expect(vm.records.map(item=>item.kind)).toEqual([
      "PROFILE_RECORD","SCENARIO_EXPLORATION","QUOTE_EVIDENCE","RESULT_SET",
    ]);
    expect(vm.records.every(item=>item.downloadAction.state==="BLOCKED")).toBe(true);
    expect(vm.uploadAction.state).toBe("BLOCKED");
    expect(vm.records.find(item=>item.kind==="RESULT_SET")?.fingerprint).toBe("rec-fp-001h");
  });

  it("projects only customer-facing audit events and excludes low-level provider internals",()=>{
    const vm=composeCustomerActivityPageVM({
      profileId:"PRO-001H",
      auditEvents:[
        {eventType:"profile_locked",entityId:"RPV-001H",occurredAt:"2026-09-20T12:00:00Z"},
        {eventType:"raw_provider_response_captured",entityId:"RAW-001H",occurredAt:"2026-09-20T12:05:00Z"},
        {eventType:"sp4_scenario_exploration_generated",entityId:"OBJ-001H",occurredAt:"2026-09-20T12:07:00Z"},
        {eventType:"sp4_recommendation_set_created",entityId:"REC-001H",occurredAt:"2026-09-20T12:10:00Z"},
        {eventType:"sp4_recommendation_explanation_created",entityId:"EXP-001H",occurredAt:"2026-09-20T12:12:00Z"},
        {eventType:"final_integrity_passed",entityId:"SEL-001H",occurredAt:"2026-09-20T12:15:00Z"},
      ],
    });
    expect(vm.events.map(item=>item.title)).toEqual([
      "Final integrity passed","Why This Surfaced created","Your Results created","Scenarios generated","Profile locked",
    ]);
    expect(new Set(vm.events.map(item=>item.activityId)).size).toBe(vm.events.length);
    expect(vm.events.every(item=>item.sourceAuditEventId==="REDACTED")).toBe(true);
    expect(vm.events.some(item=>item.title==="Raw provider response captured")).toBe(false);
    expect(vm.fullAuditAction.state).toBe("HIDDEN");
  });

  it("keeps support guidance available while in-app messaging remains out of scope",()=>{
    const vm=composeCustomerSupportPageVM({profileId:"PRO-001H",environment:"SYNTHETIC"});
    expect(vm.topics.some(item=>item.topicId==="ENVIRONMENT"&&item.summary.includes("synthetic"))).toBe(true);
    expect(vm.topics.find(item=>item.topicId==="PROFILE")?.href).toContain("profileId=PRO-001H");
    expect(vm.contactAction.state).toBe("BLOCKED");
  });
});
