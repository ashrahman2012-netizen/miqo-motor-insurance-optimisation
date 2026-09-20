import {describe,expect,it} from "vitest";
import {
  composeCustomerDashboardVM,
  selectCurrentProfileVersion,
  selectDashboardExploration,
  selectLatestObjective,
  selectLatestRecommendation,
  type DashboardCompositionInput,
} from "../src/index";

const base:DashboardCompositionInput={
  profileId:"PRO-SYN-001",
  environment:"SYNTHETIC",
  snapshot:{
    versions:[{versionId:"RPV-1",versionNo:1,status:"LOCKED",lockedAt:"2026-09-20T12:00:00.000Z"}],
    audit:[
      {auditEventId:"AUD-1",eventType:"profile_validated",entityType:"risk_profile_version",entityId:"RPV-1",occurredAt:"2026-09-20T11:59:00.000Z",metadataJson:{valid:true}},
      {auditEventId:"AUD-2",eventType:"profile_locked",entityType:"risk_profile_version",entityId:"RPV-1",occurredAt:"2026-09-20T12:00:00.000Z",metadataJson:{}},
    ],
  },
  objectives:[{
    customerObjectiveId:"OBJ-1",riskProfileVersionId:"RPV-1",objectiveId:"LOWEST_ANNUAL_PREMIUM",
    objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"POL-1",
    selectedAt:"2026-09-20T12:01:00.000Z",
  }],
  explorations:[{
    customerObjectiveId:"OBJ-1",explorationFingerprint:"EXP-1",generationVersion:"sp4-gen-v1",
    items:[
      {scenarioId:"SCN-1",generationOrdinal:1,generationVersion:"sp4-gen-v1",candidateFingerprint:"A"},
      {scenarioId:"SCN-2",generationOrdinal:2,generationVersion:"sp4-gen-v1",candidateFingerprint:"B"},
    ],
    rejections:[],
  }],
  selectedExploration:{
    customerObjectiveId:"OBJ-1",explorationFingerprint:"EXP-1",generationVersion:"sp4-gen-v1",
    items:[
      {scenarioId:"SCN-1",generationOrdinal:1,generationVersion:"sp4-gen-v1",candidateFingerprint:"A"},
      {scenarioId:"SCN-2",generationOrdinal:2,generationVersion:"sp4-gen-v1",candidateFingerprint:"B"},
    ],
    rejections:[],
  },
  routeQuotes:[{
    customerObjectiveId:"OBJ-1",riskProfileVersionId:"RPV-1",scenarioId:"SCN-1",
    marketRoute:{marketRouteId:"MR-1",routeKey:"MOCK-001-DIRECT",providerKey:"MOCK-PROVIDER-001",channelKey:"DIRECT_SYNTHETIC",adapterVersion:"mock-adapter-v1",mappingVersion:"mock-mapping-v1",synthetic:true},
    quoteRequestId:"QR-1",
    normalisedQuote:{normalisedQuoteId:"NQ-1",normalisationVersion:"norm-v1",comparisonState:"DIRECTLY_COMPARABLE",comparisonReason:"Comparable",annualCashPremiumPence:64215,financeCostPence:0,compulsoryExcessPence:25000,voluntaryExcessPence:50000},
  }],
  recommendation:{
    recommendationSetId:"REC-1",customerObjectiveId:"OBJ-1",riskProfileVersionId:"RPV-1",explorationFingerprint:"EXP-1",
    objectiveId:"LOWEST_ANNUAL_PREMIUM",recommendationFingerprint:"RF-1",surfacedNormalisedQuoteId:"NQ-1",
    createdAt:"2026-09-20T12:02:00.000Z",
    eligible:[{normalisedQuoteId:"NQ-1",quoteRequestId:"QR-1",scenarioId:"SCN-1",marketRouteId:"MR-1",status:"ELIGIBLE",ordinal:1,objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:64215,exclusionReason:null,evidence:{totalExcessExposurePence:75000}}],
    excluded:[],
  },
};

describe("BUILD-001B dashboard application adapter",()=>{
  it("uses persisted recommendation evidence for the surfaced result rather than ranking in the UI",()=>{
    const vm=composeCustomerDashboardVM(base);
    expect(vm.result?.surfacedResult.normalisedQuoteId).toBe("NQ-1");
    expect(vm.result?.surfacedResult.ordinal).toBe(1);
    expect(vm.result?.surfacedResult.marketRoute.providerKey).toBe("MOCK-PROVIDER-001");
    expect(vm.result?.surfacedResult.pricing.annualCashPremiumPence).toBe(64215);
  });

  it("keeps handoff not authorised in synthetic mode",()=>{
    const vm=composeCustomerDashboardVM(base);
    expect(vm.journey.find(item=>item.id==="HANDOFF")?.state).toBe("NOT_AUTHORISED");
  });

  it("renders an empty dashboard without inventing a profile",()=>{
    const vm=composeCustomerDashboardVM({...base,profileId:null,snapshot:null,objectives:[],explorations:[],selectedExploration:null,routeQuotes:[],recommendation:null});
    expect(vm.pageState.code).toBe("NO_PROFILE");
    expect(vm.result).toBeNull();
    expect(vm.quotes.quoteCount).toBe(0);
  });

  it("selects lifecycle read models deterministically",()=>{
    expect(selectCurrentProfileVersion({versions:[
      {versionId:"RPV-1",versionNo:1,status:"SUPERSEDED",lockedAt:null},
      {versionId:"RPV-2",versionNo:2,status:"DRAFT",lockedAt:null},
    ],audit:[]})?.versionId).toBe("RPV-2");
    expect(selectLatestObjective([
      {...base.objectives[0],customerObjectiveId:"OBJ-A",selectedAt:"2026-09-20T10:00:00.000Z"},
      {...base.objectives[0],customerObjectiveId:"OBJ-B",selectedAt:"2026-09-20T11:00:00.000Z"},
    ])?.customerObjectiveId).toBe("OBJ-B");
    expect(selectLatestRecommendation([
      {...base.recommendation!,recommendationSetId:"REC-A",createdAt:"2026-09-20T10:00:00.000Z"},
      {...base.recommendation!,recommendationSetId:"REC-B",createdAt:"2026-09-20T11:00:00.000Z"},
    ])?.recommendationSetId).toBe("REC-B");
  });

  it("does not choose arbitrarily among multiple explorations without recommendation evidence",()=>{
    const two=[base.explorations[0],{...base.explorations[0],explorationFingerprint:"EXP-2"}];
    expect(selectDashboardExploration(two,null)).toBeNull();
    expect(selectDashboardExploration(two,base.recommendation!)?.explorationFingerprint).toBe("EXP-1");
  });
});
