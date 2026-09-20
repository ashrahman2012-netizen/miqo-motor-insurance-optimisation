import {describe,expect,it} from "vitest";
import type {QuoteComparisonPageVM,NormalisedQuoteVM} from "@miqo/application-contracts";
import {
  composeResultsPageVM,
  type ResultExplanationApi,
  type ResultRecommendationApi,
} from "../src/results";

function quote(id:string,ordinal:number,annual:number):NormalisedQuoteVM{
  return {
    normalisedQuoteId:id,quoteRequestId:"REQ-"+id,scenarioId:"SCN-"+ordinal,
    marketRoute:{marketRouteId:"MR-"+ordinal,routeKey:"ROUTE-"+ordinal,displayName:"Route "+ordinal,providerKey:"MOCK-PROVIDER-001",channelKey:"DIRECT_SYNTHETIC",environment:"SYNTHETIC",adapterVersion:"v1",mappingVersion:"v1",certificationState:null},
    comparisonState:"DIRECTLY_COMPARABLE",comparisonReason:"REQUIRED_FIELDS_PRESENT",ordinal,
    objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:annual,
    pricing:{annualCashPremiumPence:annual,financeCostPence:0,monthlyCommitmentPence:null,totalPayablePence:null},
    excess:{compulsoryExcessPence:25000,voluntaryExcessPence:25000,totalExcessExposurePence:50000},
    normalisationVersion:"sp2-normaliser-v1",eligible:true,exclusionReason:null,openAction:{state:"HIDDEN",reason:null},
  };
}
const comparison:QuoteComparisonPageVM={
  profileId:"PRO-1",profileVersion:{versionId:"RPV-1",versionNo:1,status:"LOCKED",lockedAt:"2026-09-20T12:00:00Z"},
  customerObjectiveId:"OBJ-1",explorationFingerprint:"EXP-1",
  explorations:[{explorationFingerprint:"EXP-1",generationVersion:"sp4-gen-v1",scenarioCount:2,rejectedCombinationCount:0}],
  comparison:{
    objective:{customerObjectiveId:"OBJ-1",objectiveId:"LOWEST_ANNUAL_PREMIUM",label:"Lowest annual premium",explanation:"Annual premium only.",primaryDimension:"annual_cash_premium_pence",executable:true,selected:true,objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1"},
    directlyComparable:[quote("NOR-1",1,65000),quote("NOR-2",2,68000)],
    notComparable:[],unavailableRoutes:[],pageState:{state:"SUCCESS",code:null,title:null,message:null,retryable:false,referenceId:null},
  },
  objectiveExcluded:[],quoteCount:2,normalisedQuoteCount:2,unavailableQuoteCount:0,
  comparisonRuleVersion:"sp4-objective-comparison-v1",comparisonFingerprint:"cf",
  runAction:{state:"AVAILABLE",reason:null},
  pageState:{state:"SUCCESS",code:null,title:null,message:null,retryable:false,referenceId:null},
};
const recommendation:ResultRecommendationApi={
  recommendationSetId:"REC-1",customerObjectiveId:"OBJ-1",riskProfileVersionId:"RPV-1",explorationFingerprint:"EXP-1",
  objectiveId:"LOWEST_ANNUAL_PREMIUM",objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"pf",
  recommendationRuleVersion:"sp4-recommendation-v1",recommendationFingerprint:"rf",surfacedNormalisedQuoteId:"NOR-1",createdAt:"2026-09-20T12:05:00Z",
  eligible:[
    {recommendationQuoteEvidenceId:"E1",normalisedQuoteId:"NOR-1",quoteRequestId:"REQ-NOR-1",scenarioId:"SCN-1",marketRouteId:"MR-1",status:"ELIGIBLE",ordinal:1,objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:65000,exclusionReason:null,evidence:{},evidenceFingerprint:"ef1"},
    {recommendationQuoteEvidenceId:"E2",normalisedQuoteId:"NOR-2",quoteRequestId:"REQ-NOR-2",scenarioId:"SCN-2",marketRouteId:"MR-2",status:"ELIGIBLE",ordinal:2,objectiveMetric:"annual_cash_premium_pence",objectiveMetricValuePence:68000,exclusionReason:null,evidence:{},evidenceFingerprint:"ef2"},
  ],excluded:[],
};
const explanation:ResultExplanationApi={
  recommendationExplanationId:"REX-1",recommendationSetId:"REC-1",objectiveId:"LOWEST_ANNUAL_PREMIUM",objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"pf",
  recommendationRuleVersion:"sp4-recommendation-v1",explanationRuleVersion:"sp4-explainability-v1",surfacedScenarioId:"SCN-1",surfacedMarketRouteId:"MR-1",surfacedNormalisedQuoteId:"NOR-1",
  eligibleEvidence:[],excludedEvidence:[],materialReasons:[
    {code:"CUSTOMER_OBJECTIVE_APPLIED",detail:"Recommendation ordering uses the selected objective."},
    {code:"COMMERCIAL_INPUTS_EXCLUDED",detail:"Commercial inputs are not used."},
  ],
  explanationFingerprint:"xf",controls:[{
    explanationId:"OEX-1",fieldOrControl:"voluntary_excess",classification:"CONTROLLABLE",source:"scenario_delta",customerCanChange:true,baselineValue:500,scenarioValue:250,quotedEffectIfObservable:null,legitimacyReason:"Permitted O-class choice.",providerChannelApplicability:{},ruleVersion:"sp4-explainability-v1",explanationFingerprint:"oxf",
  }],createdAt:"2026-09-20T12:05:00Z",
};

describe("BUILD-001F results adapter",()=>{
  it("does not invent results before RecommendationSet persistence",()=>{
    const vm=composeResultsPageVM({profileId:"PRO-1",comparisonPage:comparison,recommendation:null,explanation:null,selection:null,environment:"SYNTHETIC"});
    expect(vm.detail).toBeNull();
    expect(vm.generateAction.state).toBe("AVAILABLE");
    expect(vm.pageState.state).toBe("EMPTY");
  });

  it("maps persisted surfaced, alternatives and explanation evidence",()=>{
    const vm=composeResultsPageVM({profileId:"PRO-1",comparisonPage:comparison,recommendation,explanation,selection:null,environment:"SYNTHETIC"});
    expect(vm.detail?.surfacedResult?.normalisedQuoteId).toBe("NOR-1");
    expect(vm.detail?.alternatives.map(item=>item.normalisedQuoteId)).toEqual(["NOR-2"]);
    expect(vm.detail?.whyThisSurfaced.some(item=>item.title==="Commercial independence")).toBe(true);
    expect(vm.detail?.whyThisSurfaced.some(item=>item.controlId==="voluntary_excess"&&item.controlClass==="O")).toBe(true);
    expect(vm.detail?.integrity.outcome).toBe("INFORMATIONAL");
    expect(vm.detail?.handoff.action.state).toBe("NOT_AUTHORISED");
  });

  it("shows authoritative final integrity only after persisted selection evidence exists",()=>{
    const vm=composeResultsPageVM({
      profileId:"PRO-1",comparisonPage:comparison,recommendation,explanation,environment:"SYNTHETIC",
      selection:{selectionId:"SEL-1",normalisedQuoteId:"NOR-1",scenarioId:"SCN-1",quoteRequestId:"REQ-NOR-1",riskProfileVersionId:"RPV-1",status:"ACCEPTED",finalIntegrity:{ruleVersion:"final-v1",outcome:"PASS",evidence:{signals:[]}},completion:{status:"PROTOTYPE_JOURNEY_COMPLETE",dataClassification:"SYNTHETIC",liveProviderActivity:"DISABLED"}},
    });
    expect(vm.finalIntegrity?.outcome).toBe("PASS");
    expect(vm.detail?.integrity.outcome).toBe("PASS");
    expect(vm.finalIntegrity?.liveProviderActivity).toBe("DISABLED");
    expect(vm.detail?.handoff.action.state).toBe("NOT_AUTHORISED");
  });
});
