import test from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_OBJECTIVE_MODEL_VERSION,
  FACTUAL_FIELDS_PROHIBITED_AS_OPTIMISATION,
  MARKET_ROUTE_DIMENSIONS,
  OPTIMISATION_CATALOGUE_VERSION,
  assertExecutableCustomerObjective,
  assertPermittedOptimisationControl,
  controlIsApplicable,
  customerObjectiveModel,
  optimisationCatalogue,
  optimisationPolicyFingerprint,
} from "../src/index.ts";

test("Optimisation Catalogue v2 is versioned and O-only",()=>{
  const catalogue=optimisationCatalogue();
  assert.equal(catalogue.catalogueVersion,OPTIMISATION_CATALOGUE_VERSION);
  assert.ok(catalogue.controls.length>=6);
  assert.ok(catalogue.controls.every(control=>control.controlClass==="O"));
});

test("locked factual fields cannot be promoted into optimisation controls",()=>{
  for(const field of FACTUAL_FIELDS_PROHIBITED_AS_OPTIMISATION){
    assert.throws(
      ()=>assertPermittedOptimisationControl(field,{vehicleMode:"CURRENT_VEHICLE"}),
      new RegExp(`CONTROL_NOT_IN_OPTIMISATION_CATALOGUE:${field}`),
    );
  }
});

test("provider and distribution channel are MarketRoute dimensions, not scenario controls",()=>{
  assert.deepEqual([...MARKET_ROUTE_DIMENSIONS],["provider","distribution_channel"]);
  for(const field of MARKET_ROUTE_DIMENSIONS){
    assert.throws(
      ()=>assertPermittedOptimisationControl(field,{vehicleMode:"CURRENT_VEHICLE"}),
      new RegExp(`CONTROL_NOT_IN_OPTIMISATION_CATALOGUE:${field}`),
    );
  }
});

test("candidate vehicle is O only in PRE_PURCHASE mode",()=>{
  assert.equal(controlIsApplicable("candidate_vehicle",{vehicleMode:"CURRENT_VEHICLE"}),false);
  assert.equal(controlIsApplicable("candidate_vehicle",{vehicleMode:"PRE_PURCHASE"}),true);
  assert.throws(
    ()=>assertPermittedOptimisationControl("candidate_vehicle",{vehicleMode:"CURRENT_VEHICLE"}),
    /CONTROL_NOT_APPLICABLE:candidate_vehicle/,
  );
  assert.equal(
    assertPermittedOptimisationControl("candidate_vehicle",{vehicleMode:"PRE_PURCHASE"}).controlId,
    "candidate_vehicle",
  );
});

test("Customer Objective Model v1 exposes four executable objectives and one dormant objective",()=>{
  const model=customerObjectiveModel();
  assert.equal(model.objectiveModelVersion,CUSTOMER_OBJECTIVE_MODEL_VERSION);
  assert.equal(model.objectives.filter(item=>item.executable).length,4);
  assert.equal(model.objectives.filter(item=>!item.executable).length,1);
  assert.equal(assertExecutableCustomerObjective("LOWEST_ANNUAL_PREMIUM").primaryDimension,"annual_cash_premium_pence");
  assert.throws(
    ()=>assertExecutableCustomerObjective("BALANCED_COST_AND_EXPOSURE"),
    /CUSTOMER_OBJECTIVE_DORMANT:BALANCED_COST_AND_EXPOSURE/,
  );
});

test("policy fingerprint is deterministic and version-bound",()=>{
  const one=optimisationPolicyFingerprint();
  const two=optimisationPolicyFingerprint();
  assert.equal(one,two);
  assert.match(one,/^[0-9a-f]{64}$/);
});
