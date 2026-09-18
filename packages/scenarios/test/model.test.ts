import test from "node:test";
import assert from "node:assert/strict";
import { lockProfileVersion } from "../../domain/src/model.ts";
import { createOptimisationPreference, generateScenario } from "../src/model.ts";

const locked = lockProfileVersion({
  id: "RPV-SYN-001-V1",
  version: 1,
  values: [
    {fieldId:"annual_mileage",controlClass:"F",value:8000},
    {fieldId:"main_driver_id",controlClass:"F",value:"DRV-SYN-001"},
  ],
});

test("persists only approved O-class optimisation preferences",()=>{
  const preference=createOptimisationPreference({id:"OPT-001",profileVersion:locked,key:"voluntary_excess",value:{min:250,max:500}});
  assert.equal(preference.riskProfileVersionId,locked.id);
  assert.throws(()=>createOptimisationPreference({id:"OPT-BAD",profileVersion:locked,key:"annual_mileage",value:6000}),/not an approved O-class/);
});

test("rejects preferences for an unlocked profile",()=>{
  assert.throws(()=>createOptimisationPreference({
    id:"OPT-BAD",
    profileVersion:{...locked,status:"DRAFT"},
    key:"payment_structure",
    value:"ANNUAL",
  }),/LOCKED/);
});

test("generates an O-only scenario with complete provenance",()=>{
  const preference=createOptimisationPreference({id:"OPT-001",profileVersion:locked,key:"voluntary_excess",value:{min:250,max:500}});
  const generatedAt=new Date("2026-09-18T19:00:00Z");
  const scenario=generateScenario({
    id:"SCN-001",
    profileVersion:locked,
    preference,
    generationVersion:"sp2-gen-v1",
    generatedAt,
    deltas:[{fieldId:"voluntary_excess",controlClass:"O",value:500}],
  });
  assert.equal(scenario.optimisationPreferenceId,preference.id);
  assert.equal(scenario.riskProfileVersionId,locked.id);
  assert.equal(scenario.generationVersion,"sp2-gen-v1");
  assert.equal(scenario.generatedAt,generatedAt);
  assert.deepEqual(scenario.deltas,[{fieldId:"voluntary_excess",controlClass:"O",value:500}]);
});

test("rejects factual and unapproved scenario deltas",()=>{
  const preference=createOptimisationPreference({id:"OPT-001",profileVersion:locked,key:"payment_structure",value:"ANNUAL"});
  assert.throws(()=>generateScenario({id:"SCN-F",profileVersion:locked,preference,generationVersion:"v1",deltas:[{fieldId:"annual_mileage",controlClass:"F",value:6000}]}),/not an approved O-class/);
  assert.throws(()=>generateScenario({id:"SCN-I",profileVersion:locked,preference,generationVersion:"v1",deltas:[{fieldId:"occupation",controlClass:"O",value:"Other"}]}),/not an approved O-class/);
});

test("rejects scenario preference lineage from another profile version",()=>{
  const preference=createOptimisationPreference({id:"OPT-001",profileVersion:locked,key:"payment_structure",value:"ANNUAL"});
  const other={...locked,id:"RPV-SYN-002-V1"};
  assert.throws(()=>generateScenario({id:"SCN-BAD",profileVersion:other,preference,generationVersion:"v1",deltas:[]}),/same RiskProfileVersion/);
});
