import {describe,expect,it} from "vitest";
import {
  composeQuoteComparisonPageVM,
  type ObjectiveQuoteComparisonApi,
} from "../src/quote-comparison";

const version={
  versionId:"RPV-1",versionNo:1,status:"LOCKED" as const,lockedAt:"2026-09-20T12:00:00Z",
  values:[],
};
const objective={
  customerObjectiveId:"OBJ-1",riskProfileVersionId:"RPV-1",objectiveId:"LOWEST_ANNUAL_PREMIUM" as const,
  objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"a".repeat(64),selectedAt:"2026-09-20T12:01:00Z",
};
const exploration={
  customerObjectiveId:"OBJ-1",explorationFingerprint:"EXP-1",generationVersion:"sp4-gen-v1",
  items:[{scenarioId:"SCN-1",riskProfileVersionId:"RPV-1",customerObjectiveId:"OBJ-1",generationVersion:"sp4-gen-v1",generationOrdinal:1,explorationFingerprint:"EXP-1",candidateFingerprint:"C-1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"a".repeat(64),deltas:[]}],
  rejections:[],
};
function evidence(overrides:Partial<ObjectiveQuoteComparisonApi["eligible"][number]>={}):ObjectiveQuoteComparisonApi["eligible"][number]{
  return {
    normalisedQuoteId:"NOR-1",quoteRequestId:"REQ-1",scenarioId:"SCN-1",
    marketRoute:{marketRouteId:"MR-1",routeKey:"MOCK-001-DIRECT",routeCatalogueVersion:"routes-v1",providerKey:"MOCK-PROVIDER-001",channelKey:"DIRECT_SYNTHETIC",adapterVersion:"mock-adapter-v1",mappingVersion:"mock-mapping-v1",routeFingerprint:"rf",synthetic:true},
    normalisedQuote:{normalisedQuoteId:"NOR-1",normalisationVersion:"sp2-normaliser-v1",normalisationFingerprint:"nf",comparisonState:"DIRECTLY_COMPARABLE",comparisonReason:"REQUIRED_FIELDS_PRESENT",annualCashPremiumPence:65000,financeCostPence:0,compulsoryExcessPence:25000,voluntaryExcessPence:50000},
    paymentStructure:"ANNUAL",totalExcessExposurePence:75000,ordinal:1,objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:65000,status:"ELIGIBLE",exclusionReason:null,evidenceFingerprint:"ef",
    ...overrides,
  };
}
const comparison:ObjectiveQuoteComparisonApi={
  customerObjectiveId:"OBJ-1",riskProfileVersionId:"RPV-1",explorationFingerprint:"EXP-1",
  objective:{objectiveId:"LOWEST_ANNUAL_PREMIUM",objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1",label:"Lowest annual premium",explanation:"Annual premium only.",primaryDimension:"annual_cash_premium_pence",executable:true},
  comparisonRuleVersion:"sp4-objective-comparison-v1",comparisonFingerprint:"cf",orchestrationVersion:"route-v1",
  quoteCount:1,normalisedQuoteCount:1,unavailableQuoteCount:0,eligible:[evidence()],excluded:[],
};

describe("BUILD-001E quote comparison adapter",()=>{
  it("maps eligible objective evidence into ranked directly-comparable quotes",()=>{
    const vm=composeQuoteComparisonPageVM({profileId:"PRO-1",version,persistedObjectives:[objective],selectedCustomerObjectiveId:"OBJ-1",explorations:[exploration],selectedExplorationFingerprint:"EXP-1",comparison,environment:"SYNTHETIC"});
    expect(vm.pageState.state).toBe("SUCCESS");
    expect(vm.comparison?.directlyComparable[0].ordinal).toBe(1);
    expect(vm.comparison?.directlyComparable[0].pricing.annualCashPremiumPence).toBe(65000);
    expect(vm.runAction.state).toBe("AVAILABLE");
  });

  it("keeps adjusted-comparable evidence out of ranked results",()=>{
    const adjusted=evidence({
      normalisedQuoteId:"NOR-X",status:"EXCLUDED",ordinal:null,objectiveMetric:null,objectiveMetricValuePence:null,
      exclusionReason:"COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE",
      normalisedQuote:{...evidence().normalisedQuote,normalisedQuoteId:"NOR-X",comparisonState:"ADJUSTED_COMPARABLE"},
    });
    const vm=composeQuoteComparisonPageVM({profileId:"PRO-1",version,persistedObjectives:[objective],selectedCustomerObjectiveId:"OBJ-1",explorations:[exploration],selectedExplorationFingerprint:"EXP-1",comparison:{...comparison,quoteCount:2,normalisedQuoteCount:2,excluded:[adjusted]},environment:"SYNTHETIC"});
    expect(vm.comparison?.directlyComparable).toHaveLength(1);
    expect(vm.comparison?.notComparable[0].comparisonState).toBe("ADJUSTED_COMPARABLE");
    expect(vm.comparison?.notComparable[0].ordinal).toBeNull();
  });

  it("separates directly-comparable quotes that are ineligible for the selected objective",()=>{
    const annual=evidence({
      normalisedQuoteId:"NOR-A",status:"EXCLUDED",ordinal:null,objectiveMetric:null,objectiveMetricValuePence:null,
      exclusionReason:"PAYMENT_STRUCTURE_NOT_MONTHLY",
      normalisedQuote:{...evidence().normalisedQuote,normalisedQuoteId:"NOR-A"},
    });
    const vm=composeQuoteComparisonPageVM({profileId:"PRO-1",version,persistedObjectives:[{...objective,objectiveId:"LOWEST_MONTHLY_COMMITMENT"}],selectedCustomerObjectiveId:"OBJ-1",explorations:[exploration],selectedExplorationFingerprint:"EXP-1",comparison:{...comparison,objective:{...comparison.objective,objectiveId:"LOWEST_MONTHLY_COMMITMENT",label:"Lowest monthly commitment",primaryDimension:"monthly_commitment_pence"},eligible:[],excluded:[annual]},environment:"SYNTHETIC"});
    expect(vm.objectiveExcluded).toHaveLength(1);
    expect(vm.comparison?.notComparable).toHaveLength(0);
  });

  it("does not authorise the synthetic route executor outside synthetic runtime",()=>{
    const vm=composeQuoteComparisonPageVM({profileId:"PRO-1",version,persistedObjectives:[objective],selectedCustomerObjectiveId:"OBJ-1",explorations:[exploration],selectedExplorationFingerprint:"EXP-1",comparison:null,environment:"PRODUCTION"});
    expect(vm.runAction.state).toBe("NOT_AUTHORISED");
  });
});
