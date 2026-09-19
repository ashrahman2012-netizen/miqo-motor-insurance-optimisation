import test from "node:test";
import assert from "node:assert/strict";
import {
  SP4_SCENARIO_GENERATOR_VERSION,
  buildSprint4ScenarioCandidates,
  deterministicSprint4ScenarioId,
  scenarioExplorationFingerprint,
} from "../src/sprint4.ts";

const context={
  vehicleMode:"CURRENT_VEHICLE" as const,
  mainDriverId:"DRV-MAIN",
  genuineNamedDriverIds:["DRV-2","DRV-3"],
  candidateVehicleIds:[],
};

test("Sprint 4 candidate matrix is deterministic and creates multiple O-choice combinations",()=>{
  const one=buildSprint4ScenarioCandidates({
    context,
    choiceSets:{
      voluntary_excess:[500,250],
      payment_structure:["MONTHLY","ANNUAL"],
    },
  });
  const two=buildSprint4ScenarioCandidates({
    context,
    choiceSets:{
      payment_structure:["ANNUAL","MONTHLY"],
      voluntary_excess:[250,500],
    },
  });
  assert.equal(one.length,4);
  assert.deepEqual(two,one);
  assert.ok(one.every(candidate=>candidate.rejections.length===0));
  assert.deepEqual(one.map(item=>item.ordinal),[1,2,3,4]);
});

test("invalid factual/policy choice is rejected deterministically rather than becoming a scenario delta",()=>{
  const candidates=buildSprint4ScenarioCandidates({
    context,
    choiceSets:{annual_mileage:[6000]},
  });
  assert.equal(candidates.length,1);
  assert.deepEqual(candidates[0].rejections.map(item=>item.ruleId),["CONTROL_NOT_IN_OPTIMISATION_CATALOGUE"]);
});

test("contradictory named-driver candidate is rejected",()=>{
  const candidates=buildSprint4ScenarioCandidates({
    context,
    choiceSets:{genuine_named_driver_inclusion:[["DRV-MAIN","DRV-2"]]},
  });
  assert.ok(candidates[0].rejections.some(item=>item.ruleId==="MAIN_DRIVER_CANNOT_BE_NAMED_DRIVER_DELTA"));
});

test("impossible enum value is rejected",()=>{
  const candidates=buildSprint4ScenarioCandidates({
    context,
    choiceSets:{voluntary_excess:[999]},
  });
  assert.deepEqual(candidates[0].rejections.map(item=>item.ruleId),["VALUE_OUTSIDE_CATALOGUE"]);
});

test("candidate vehicle remains policy-ineligible in CURRENT_VEHICLE mode",()=>{
  const candidates=buildSprint4ScenarioCandidates({
    context,
    choiceSets:{candidate_vehicle:["VEH-CAND-1"]},
  });
  assert.ok(candidates[0].rejections.some(item=>item.ruleId==="CONTROL_NOT_APPLICABLE"));
});

test("exploration fingerprint and scenario ID are stable",()=>{
  const input={
    riskProfileVersionId:"RPV-1",
    customerObjectiveId:"OBJ-1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"a".repeat(64),
    choiceSets:{payment_structure:["ANNUAL","MONTHLY"]},
    context,
  };
  const one=scenarioExplorationFingerprint(input);
  const two=scenarioExplorationFingerprint(input);
  assert.equal(one,two);
  assert.match(one,/^[0-9a-f]{64}$/);
  assert.equal(
    deterministicSprint4ScenarioId(one,"b".repeat(64)),
    deterministicSprint4ScenarioId(two,"b".repeat(64)),
  );
  assert.equal(SP4_SCENARIO_GENERATOR_VERSION,"sp4-gen-v1");
});

test("exploration limit blocks combinatorial explosion",()=>{
  assert.throws(()=>buildSprint4ScenarioCandidates({
    context,
    choiceSets:{
      policy_start_date:Array.from({length:9},(_,i)=>`2026-10-${String(i+1).padStart(2,"0")}`),
      voluntary_excess:[250,500,750],
      payment_structure:["ANNUAL","MONTHLY"],
      telematics_preference:[false,true],
    },
  }),/SCENARIO_EXPLORATION_LIMIT_EXCEEDED:108/);
});


test("candidate vehicle is accepted only from persisted PRE_PURCHASE evidence",()=>{
  const prePurchaseContext={
    vehicleMode:"PRE_PURCHASE" as const,
    mainDriverId:"DRV-MAIN",
    genuineNamedDriverIds:["DRV-2"],
    candidateVehicleIds:["VEH-CAND-1"],
    currentVehicleId:"VEH-CURRENT",
  };
  const accepted=buildSprint4ScenarioCandidates({
    context:prePurchaseContext,
    choiceSets:{candidate_vehicle:["VEH-CAND-1"]},
  });
  assert.equal(accepted[0].rejections.length,0);

  const unknown=buildSprint4ScenarioCandidates({
    context:prePurchaseContext,
    choiceSets:{candidate_vehicle:["VEH-UNKNOWN"]},
  });
  assert.ok(unknown[0].rejections.some(item=>item.ruleId==="UNKNOWN_CANDIDATE_VEHICLE"));

  const current=buildSprint4ScenarioCandidates({
    context:{...prePurchaseContext,candidateVehicleIds:["VEH-CURRENT"]},
    choiceSets:{candidate_vehicle:["VEH-CURRENT"]},
  });
  assert.ok(current[0].rejections.some(item=>item.ruleId==="CURRENT_VEHICLE_CANNOT_BE_CANDIDATE"));
});


test("S4-G12 commercial metadata is not part of scenario generation inputs or fingerprints",()=>{
  const base={
    riskProfileVersionId:"RPV-COMMERCIAL-INDEPENDENCE",
    customerObjectiveId:"OBJ-COMMERCIAL-INDEPENDENCE",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"9".repeat(64),
    choiceSets:{voluntary_excess:[250,500],payment_structure:["ANNUAL","MONTHLY"]},
    context,
  };
  const withoutCommercial=scenarioExplorationFingerprint(base);
  const highCommission=scenarioExplorationFingerprint({
    ...base,
    commercialMetadata:{providerRemunerationPence:999999,introducerRemunerationPence:500000},
  } as any);
  const lowCommission=scenarioExplorationFingerprint({
    ...base,
    commercialMetadata:{providerRemunerationPence:0,introducerRemunerationPence:0},
  } as any);
  assert.equal(highCommission,withoutCommercial);
  assert.equal(lowCommission,withoutCommercial);

  const one=buildSprint4ScenarioCandidates({
    context,
    choiceSets:base.choiceSets,
  });
  const two=buildSprint4ScenarioCandidates({
    context,
    choiceSets:base.choiceSets,
    commercialMetadata:{providerRemunerationPence:999999},
  } as any);
  assert.deepEqual(two,one);
});
