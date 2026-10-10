import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runCandidateEvaluation,BV4_PRODUCT_STATE,assertSyntheticAuthority} from "../src/gate.mjs";
import {evaluate as bv3} from "../../../scripts/bv-gate-003/reference.mjs";
import {syntheticRequest} from "../../../scripts/bv-gate-003/fixtures.mjs";
import {fingerprint} from "../src/engine.mjs";
import {assertExecutableCustomerObjective,customerObjectiveModel} from "../../optimisation/src/index.ts";
import {analyseSprint4Recommendations} from "../../comparison/src/index.ts";
const ctx={boundedUatAuthority:"BV4_INTERNAL_SYNTHETIC_UAT"};
process.env.MIQO_DATA_CLASSIFICATION="SYNTHETIC";
process.env.MIQO_LIVE_PROVIDERS_ENABLED="false";
const run=r=>runCandidateEvaluation(r,ctx);
const quote=(r,id)=>r.quotes.find(x=>x.quote_id===id);
test("BV4-A01 engine preserves every BV3 deterministic selection property",()=>{
 const r=syntheticRequest(),a=run(r);
 assert.deepEqual(a.decision,bv3(r));
 assert.equal(a.decision.selected_quote_id,"MOCK-S7-ALPHA");
 assert.equal(a.decision.selected_total_payable_pence,61200);
 assert.equal(a.decision.selected_total_excess_pence,55000);
 assert.equal(a.decision.absolute_cheapest_eligible_quote_id,"MOCK-S6-ALPHA");
});
test("BV4-A02 customer explanation shows £41/£300 trade-off separately",()=>{
 const e=run(syntheticRequest()).explanation;
 assert.equal(e.selected.totalPayable,"£612.00");
 assert.equal(e.selected.totalExcess,"£550.00");
 assert.equal(e.cheapestBenchmark.totalPayable,"£571.00");
 assert.equal(e.cheapestBenchmark.totalExcess,"£850.00");
 assert.equal(e.tradeOff.additionalTotalPayablePence,4100);
 assert.equal(e.tradeOff.excessDifferencePence,-30000);
 assert.match(e.tradeOff.text,/£41.00/);
 assert.match(e.tradeOff.text,/£300.00/);
 assert.ok(e.warnings.some(x=>x.includes("not an annual premium saving")));
});
test("BV4-A03 no unstated excess ceiling is introduced",()=>{
 const r=syntheticRequest();delete r.preferences.max_total_excess_pence;
 const d=run(r);
 assert.equal(d.decision.selected_quote_id,"MOCK-S6-ALPHA");
 assert.equal(d.explanation.constraints.maxTotalExcess,"Not specified");
});
test("BV4-A04 customer explanation identifies no option and never relaxes budget",()=>{
 const r=syntheticRequest();r.preferences.max_total_payable_pence=100;
 const x=run(r);
 assert.equal(x.decision.status,"NO_QUOTES_MEET_PREFERENCES");
 assert.equal(x.explanation.selected,null);
 assert.match(x.explanation.nextStep,/No valid offer meets/);
});
test("BV4-A05 all expired quotes have NO_ELIGIBLE_QUOTES",()=>{
 const r=syntheticRequest();r.test_clock="2026-10-10T11:00:00+01:00";
 const x=run(r);
 assert.equal(x.decision.status,"NO_ELIGIBLE_QUOTES");
 assert.equal(x.explanation.selected,null);
});
test("BV4-A06 wrong named driver can't be selected",()=>{
 const r=syntheticRequest();quote(r,"MOCK-S7-ALPHA").named_driver_ids=["FAKE-ID"];
 const x=run(r);
 assert.ok(x.decision.excluded.some(z=>z.quote_id==="MOCK-S7-ALPHA"&&z.codes.some(c=>c.startsWith("E-07"))));
});
test("BV4-A07 unverifiable benefits fail closed",()=>{
 const r=syntheticRequest();quote(r,"MOCK-S7-ALPHA").benefits.courtesy_car=null;
 const x=run(r);
 assert.ok(x.decision.excluded.some(z=>z.quote_id==="MOCK-S7-ALPHA"&&z.codes.some(c=>c.startsWith("E-03"))));
});
test("BV4-A08 extension doesn't assume provider authorization",()=>{
 const r=syntheticRequest();quote(r,"MOCK-S7-ALPHA").quotation_permission=false;
 assert.notEqual(run(r).decision.selected_quote_id,"MOCK-S7-ALPHA");
});
test("BV4-A09 claimant data not leaked in explanation",()=>{
 const r=syntheticRequest();r.locked_profile.facts.occupation="UNIQUE_SYNTHETIC_PRIVATE_LABEL";
 r.locked_profile.facts_sha256=fingerprint(r.locked_profile.facts);
 r.quotes.forEach(q=>{q.facts_sha256=r.locked_profile.facts_sha256});
 const e=run(r).explanation;
 assert.doesNotMatch(JSON.stringify(e),/UNIQUE_SYNTHETIC_PRIVATE_LABEL/);
 assert.doesNotMatch(JSON.stringify(e),/SYNTHETIC_GOLF/);
});
test("BV4-A10 candidate cannot be invoked without explicit synthetic authority",()=>{
 assert.throws(()=>runCandidateEvaluation(syntheticRequest()),/BV4_BOUNDED_UAT_AUTHORITY_REQUIRED/);
});
test("BV4-A11 live classification cannot be used even with context",()=>{
 const r=syntheticRequest();r.environment="LIVE";
 assert.throws(()=>run(r),/BV4_SYNTHETIC_ENVIRONMENT_REQUIRED/);
});
test("BV4-A12 explicit false live-provider flag required",()=>{
 const old=process.env.MIQO_LIVE_PROVIDERS_ENABLED;
 try{
   delete process.env.MIQO_LIVE_PROVIDERS_ENABLED;
   assert.throws(()=>assertSyntheticAuthority(syntheticRequest(),ctx),/BV4_SYNTHETIC_ENVIRONMENT_REQUIRED/);
 }finally{process.env.MIQO_LIVE_PROVIDERS_ENABLED=old}
});
test("BV4-A13 partner credential presence blocks any candidate invocation",()=>{
 const old=process.env.SEOPA_API_KEY;
 try{
   process.env.SEOPA_API_KEY="SYNTHETIC_DO_NOT_USE";
   assert.throws(()=>run(syntheticRequest()),/BV4_PARTNER_ACCESS_FORBIDDEN/);
 }finally{
   if(old===undefined)delete process.env.SEOPA_API_KEY;
   else process.env.SEOPA_API_KEY=old;
 }
});
test("BV4-A14 commercial scores are not admissible in price ranking",()=>{
 const r=syntheticRequest();quote(r,"MOCK-S7-ALPHA").commission_weight=9000;
 assert.throws(()=>run(r),/BV_CONTRACT_SCHEMA_INVALID/);
});
test("BV4-A15 original four executable objectives remain unchanged",()=>{
 const defs=customerObjectiveModel().objectives;
 assert.deepEqual(defs.filter(x=>x.executable).map(x=>x.objectiveId).sort(),[
  "LOWEST_ANNUAL_PREMIUM","LOWEST_FINANCE_COST","LOWEST_MONTHLY_COMMITMENT","LOWER_EXCESS_EXPOSURE"].sort());
 assert.throws(()=>assertExecutableCustomerObjective("BALANCED_COST_AND_EXPOSURE"),/DORMANT/);
 assert.throws(()=>analyseSprint4Recommendations({
  objectiveId:"BALANCED_COST_AND_EXPOSURE",objectiveVersion:"sp4-objectives-v1",
  catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"f".repeat(64),
  explorationFingerprint:"e".repeat(64),quotes:[]
 }),/DORMANT/);
});
test("BV4-A16 existing DB constraint still forbids balanced objective",()=>{
 const migration=readFileSync("packages/db/migrations/0008_optimisation_policy_persistence.sql","utf8");
 const start=migration.indexOf("CONSTRAINT customer_objective_executable_v1");
 assert.ok(start>=0);
 assert.doesNotMatch(migration.slice(start,migration.indexOf("),",start)),/BALANCED_COST_AND_EXPOSURE/);
});
test("BV4-A17 no registered routes, provider connectors, policy binding or purchase hooks",()=>{
 assert.deepEqual(BV4_PRODUCT_STATE,{
   integration:"NOT_REGISTERED",executableCustomerObjective:false,providerConnectivity:"BLOCKED",
   customerFacingRoute:false,supportsLiveQuotes:false,mergeApproved:false,productionDeployable:false
 });
 assert.ok(!("partnerSession" in run(syntheticRequest())));
});
test("BV4-A18 explanation and candidate output fingerprints survive permutation",()=>{
 const r=syntheticRequest();const a=run(r);r.quotes.reverse();const b=run(r);
 assert.deepEqual(a,b);
 assert.match(a.explanation.explanationFingerprint,/^[0-9a-f]{64}$/);
});
