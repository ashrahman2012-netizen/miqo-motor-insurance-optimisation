import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 customerObjectiveModel,assertExecutableCustomerObjective
} from "../../packages/optimisation/src/index.ts";
import {
 analyseSprint4Recommendations
} from "../../packages/comparison/src/index.ts";

test("Balanced Cost and Exposure is present but explicitly dormant",()=>{
  const v=customerObjectiveModel();
  const obj=v.objectives.find(x=>x.objectiveId==="BALANCED_COST_AND_EXPOSURE");
  assert.ok(obj);
  assert.equal(obj.executable,false);
  assert.equal(obj.primaryDimension,"UNAPPROVED_MULTI_DIMENSION_METHOD");
  assert.throws(()=>assertExecutableCustomerObjective("BALANCED_COST_AND_EXPOSURE"),
    /CUSTOMER_OBJECTIVE_DORMANT/);
});
test("Core recommendation engine rejects dormant objective rather than silently comparing",()=>{
  assert.throws(()=>analyseSprint4Recommendations({
    objectiveId:"BALANCED_COST_AND_EXPOSURE",
    objectiveVersion:"sp4-objectives-v1",
    catalogueVersion:"sp4-catalogue-v2.1",
    policyFingerprint:"f".repeat(64),
    explorationFingerprint:"e".repeat(64),
    quotes:[]
  }),/CUSTOMER_OBJECTIVE_DORMANT/);
});
test("Database objective constraint does not allow Balanced Cost and Exposure",()=>{
  const sql=readFileSync("packages/db/migrations/0008_optimisation_policy_persistence.sql","utf8");
  const begin=sql.indexOf("CONSTRAINT customer_objective_executable_v1");
  assert.notEqual(begin,-1);
  const text=sql.slice(begin,sql.indexOf("),",begin)+2);
  assert.match(text,/LOWER_EXCESS_EXPOSURE/);
  assert.doesNotMatch(text,/BALANCED_COST_AND_EXPOSURE/);
});
test("Existing executable objectives remain unchanged",()=>{
  const runnable=customerObjectiveModel().objectives.filter(x=>x.executable).map(x=>x.objectiveId).sort();
  assert.deepEqual(runnable,[
    "LOWEST_ANNUAL_PREMIUM","LOWEST_FINANCE_COST",
    "LOWEST_MONTHLY_COMMITMENT","LOWER_EXCESS_EXPOSURE"
  ].sort());
});
