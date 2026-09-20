import {describe,expect,it} from "vitest";
import {composeScenarioExplorerVM,type CurrentOptimisationPolicyApi} from "../src/optimise";

const policy:CurrentOptimisationPolicyApi={
  catalogueVersion:"sp4-catalogue-v2.1",
  objectiveModelVersion:"sp4-objectives-v1",
  policyFingerprint:"abc123",
  scenarioGeneratorVersion:"sp4-gen-v1",
  catalogue:{catalogueVersion:"sp4-catalogue-v2.1",controls:[
    {controlId:"voluntary_excess",controlClass:"O",catalogueVersion:"sp4-catalogue-v2.1",label:"Voluntary excess",permittedValues:{kind:"ENUM",values:[250,500,750]},dependencies:[],constraints:["Premium and excess remain separate."],applicability:"ALWAYS",factualBoundary:"Only customer choice may vary."},
    {controlId:"candidate_vehicle",controlClass:"O",catalogueVersion:"sp4-catalogue-v2.1",label:"Candidate vehicle",permittedValues:{kind:"DYNAMIC",source:"candidate_vehicle",rule:"Persisted candidates only."},dependencies:[],constraints:[],applicability:"PRE_PURCHASE_ONLY",factualBoundary:"Must not overwrite current vehicle."},
  ]},
  objectiveModel:{objectiveModelVersion:"sp4-objectives-v1",objectives:[
    {objectiveId:"LOWEST_ANNUAL_PREMIUM",objectiveVersion:"sp4-objectives-v1",executable:true,label:"Lowest annual premium",primaryDimension:"annual_cash_premium_pence",explanation:"Annual premium only."},
    {objectiveId:"BALANCED_COST_AND_EXPOSURE",objectiveVersion:"sp4-objectives-v1",executable:false,label:"Balanced cost and exposure",primaryDimension:"UNAPPROVED_MULTI_DIMENSION_METHOD",explanation:"Dormant."},
  ]},
};

const version={versionId:"RPV-1",versionNo:1,status:"LOCKED" as const,lockedAt:"2026-09-20T12:00:00Z",values:[
  {fieldId:"annual_mileage",controlClass:"F" as const,value:8000,sourceType:"customer_declared"},
]};

describe("BUILD-001D scenario explorer adapter",()=>{
  it("keeps dormant objectives visible but non-executable and exposes only O-class controls",()=>{
    const vm=composeScenarioExplorerVM({profileId:"PRO-1",version,policy,persistedObjectives:[],selectedCustomerObjectiveId:null,candidateVehicles:[],exploration:null});
    expect(vm.objectiveSelector.objectives.find(item=>item.objectiveId==="BALANCED_COST_AND_EXPOSURE")?.executable).toBe(false);
    expect(vm.controls.every(item=>item.controlClass==="O")).toBe(true);
    expect(vm.controls.find(item=>item.controlId==="candidate_vehicle")?.action.state).toBe("BLOCKED");
  });

  it("maps accepted and rejected persisted scenario evidence without ranking or quote fields",()=>{
    const objective={customerObjectiveId:"OBJ-1",riskProfileVersionId:"RPV-1",objectiveId:"LOWEST_ANNUAL_PREMIUM" as const,objectiveVersion:"sp4-objectives-v1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"abc123",selectedAt:"2026-09-20T12:01:00Z"};
    const vm=composeScenarioExplorerVM({
      profileId:"PRO-1",version,policy,persistedObjectives:[objective],selectedCustomerObjectiveId:"OBJ-1",candidateVehicles:[],
      exploration:{
        customerObjectiveId:"OBJ-1",explorationFingerprint:"EXP-1",generationVersion:"sp4-gen-v1",
        items:[{scenarioId:"SCN-1",riskProfileVersionId:"RPV-1",customerObjectiveId:"OBJ-1",generationVersion:"sp4-gen-v1",generationOrdinal:1,explorationFingerprint:"EXP-1",candidateFingerprint:"CAND-1",catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"abc123",deltas:[{fieldId:"voluntary_excess",controlClass:"O",value:250}]}],
        rejections:[{rejectionId:"REJ-1",candidateFingerprint:"CAND-X",candidate:{voluntary_excess:999},ruleId:"VALUE_OUTSIDE_CATALOGUE",category:"IMPOSSIBLE",reason:"outside permitted catalogue",catalogueVersion:"sp4-catalogue-v2.1",generationVersion:"sp4-gen-v1"}],
      },
    });
    expect(vm.exploration?.scenarios[0].deltas[0].displayValue).toBe("£250");
    expect(vm.exploration?.rejections[0].ruleId).toBe("VALUE_OUTSIDE_CATALOGUE");
    expect(vm.pageState.state).toBe("SUCCESS");
  });

  it("blocks scenario work when the current profile version is not locked",()=>{
    const vm=composeScenarioExplorerVM({profileId:"PRO-1",version:{...version,status:"DRAFT",lockedAt:null},policy,persistedObjectives:[],selectedCustomerObjectiveId:null,candidateVehicles:[],exploration:null});
    expect(vm.pageState.code).toBe("PROFILE_NOT_LOCKED");
    expect(vm.controls.every(item=>item.action.state==="BLOCKED")).toBe(true);
  });
});
