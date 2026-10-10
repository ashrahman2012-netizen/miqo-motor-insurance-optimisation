import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  evaluate,assertSchema,validateDecision,fingerprint
} from "./reference.mjs";
import {syntheticRequest,COVERAGE} from "./fixtures.mjs";
import {
  customerObjectiveModel,assertExecutableCustomerObjective
} from "../../packages/optimisation/src/index.ts";
import {analyseSprint4Recommendations} from "../../packages/comparison/src/index.ts";
const sample=syntheticRequest;
const quote=(r,id)=>r.quotes.find(q=>q.quote_id===id);
const run=r=>evaluate(r);
const codes=(r,id)=>r.excluded.find(x=>x.quote_id===id)?.codes??[];
const expectExcluded=(r,id,reason)=>{
 const result=run(r);
 assert.ok(codes(result,id).some(x=>x.startsWith(reason)),
   "Expected "+id+" excluded by "+reason+", saw "+JSON.stringify(codes(result,id)));
 return result;
};

test("BV-A01 contract schema accepts complete synthetic request",()=>{
 assert.equal(assertSchema(sample()),true);
 assert.equal(validateDecision(run(sample())),true);
});
test("BV-A01 evaluator is deterministic and returns SHA256 evidence",()=>{
 const a=run(sample()),b=run(sample());
 assert.deepEqual(a,b);
 assert.match(a.input_fingerprint,/^[0-9a-f]{64}$/);
 assert.match(a.result_fingerprint,/^[0-9a-f]{64}$/);
});
test("BV-A02 £600 total-excess customer limit chooses £612/£550 option",()=>{
 const r=run(sample());
 assert.equal(r.status,"PROVISIONAL_SYNTHETIC_SELECTION");
 assert.equal(r.selected_quote_id,"MOCK-S7-ALPHA");
 assert.equal(r.selected_total_payable_pence,61200);
 assert.equal(r.selected_total_excess_pence,55000);
 assert.equal(r.absolute_cheapest_eligible_quote_id,"MOCK-S6-ALPHA");
 assert.equal(r.cheapest_total_payable_pence,57100);
 assert.equal(r.cheapest_total_excess_pence,85000);
 assert.ok(r.explanations.includes("SELECTED_PREMIUM_DIFFERENCE_VS_CHEAPEST_PENCE:4100"));
 assert.ok(r.explanations.includes("SELECTED_EXCESS_DIFFERENCE_VS_CHEAPEST_PENCE:-30000"));
});
test("BV-A02 £200 fixture-only discount from S0 is 24.63%, not actuarial savings",()=>{
 const r=run(sample()),s0=sample().quotes.find(q=>q.quote_id==="MOCK-S0-ALPHA");
 assert.equal(s0.price.total_payable_pence-r.selected_total_payable_pence,20000);
 assert.equal(Number(((s0.price.total_payable_pence-r.selected_total_payable_pence)/
   s0.price.total_payable_pence*100).toFixed(2)),24.63);
});
test("BV-A03 missing max excess never secretly introduces 600 GBP",()=>{
 const r=sample();delete r.preferences.max_total_excess_pence;
 const d=run(r);
 assert.equal(d.selected_quote_id,"MOCK-S6-ALPHA");
 assert.ok(d.explanations.includes("EXCESS_LIMIT:NOT_SPECIFIED"));
});
test("BV-A03 exact 550 GBP total excess is included",()=>{
 const r=sample();r.preferences.max_total_excess_pence=55000;
 assert.equal(run(r).selected_quote_id,"MOCK-S7-ALPHA");
});
test("BV-A03 at most 500 GBP total excess selects S7 Charlie (same synthetic coverage)",()=>{
 const r=sample();r.preferences.max_total_excess_pence=50000;
 assert.equal(run(r).selected_quote_id,"MOCK-S7-CHARLIE");
});
test("BV-A03 no option under 499 GBP returns no match without relaxing constraints",()=>{
 const r=sample();r.preferences.max_total_excess_pence=49900;
 const d=run(r);
 assert.equal(d.status,"NO_QUOTES_MEET_PREFERENCES");
 assert.equal(d.selected_quote_id,null);
 assert.equal(d.absolute_cheapest_eligible_quote_id,"MOCK-S6-ALPHA");
 assert.equal(d.cheapest_total_payable_pence,57100);
});
test("BV-A04 no quotes returns distinct no-eligible status",()=>{
 const r=sample();r.quotes=[];
 const d=run(r);
 assert.equal(d.status,"NO_ELIGIBLE_QUOTES");
 assert.deepEqual(d.pareto_frontier_quote_ids,[]);
 assert.equal(d.selected_quote_id,null);
});
test("BV-A04 expired quote excluded at injected clock",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").valid_until="2026-10-10T09:15:00+01:00";
 expectExcluded(r,"MOCK-S7-ALPHA","E-02");
});
test("BV-A04 future issued quote excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").issued_at="2026-10-10T09:30:00+01:00";
 expectExcluded(r,"MOCK-S7-ALPHA","E-02");
});
test("BV-A04 missing verified mock provenance excludes",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").provenance_verified=false;
 expectExcluded(r,"MOCK-S7-ALPHA","E-02");
});
test("BV-A04 missing quote usage/retention permission excludes",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").quotation_permission=false;
 expectExcluded(r,"MOCK-S7-ALPHA","E-02");
});
test("BV-A05 incomplete required benefit excludes, not assume full cover",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").benefits.courtesy_car=null;
 expectExcluded(r,"MOCK-S7-ALPHA","E-03");
});
test("BV-A05 differing non-required benefit fails strict coverage parity",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").benefits.breakdown=true;
 expectExcluded(r,"MOCK-S7-ALPHA","E-03");
});
test("BV-A05 explicit required windscreen missing excludes",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").benefits.windscreen=false;
 expectExcluded(r,"MOCK-S7-ALPHA","E-03");
});
test("BV-A05 third-party quote is not comprehensive",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").policy_type="THIRD_PARTY";
 expectExcluded(r,"MOCK-S7-ALPHA","E-03");
});
test("BV-A05 undisclosed restrictions prevent comparability",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").restrictions_verified=false;
 expectExcluded(r,"MOCK-S7-ALPHA","E-03");
});
test("BV-A05 all mandatory costs and IPT must be verified",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").price.mandatory_fees_ipt_included=false;
 expectExcluded(r,"MOCK-S7-ALPHA","E-04");
});
test("BV-A05 mismatched finance / total payable is excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").price.total_payable_pence=61100;
 expectExcluded(r,"MOCK-S7-ALPHA","E-04");
});
test("BV-A05 monthly quote with complete disclosed cash, finance, APR & repayments is eligible when permitted",()=>{
 const r=sample();r.preferences.allowed_payment_modes=["ANNUAL","MONTHLY"];
 const d=run(r);
 assert.ok(d.eligible_quote_ids.includes("MOCK-S3-ALPHA"));
});
test("BV-A05 monthly quote missing finance APR is invalid, not guessed",()=>{
 const r=sample();r.preferences.allowed_payment_modes=["ANNUAL","MONTHLY"];
 quote(r,"MOCK-S3-ALPHA").price.finance_apr_bps=null;
 expectExcluded(r,"MOCK-S3-ALPHA","E-05");
});
test("BV-A05 monthly quote with invalid repayment sum is rejected",()=>{
 const r=sample();r.preferences.allowed_payment_modes=["ANNUAL","MONTHLY"];
 quote(r,"MOCK-S3-ALPHA").price.instalment_amount_pence=100;
 expectExcluded(r,"MOCK-S3-ALPHA","E-05");
});
test("BV-A07 monthly quoted basis without customer acceptance excluded",()=>{
 const r=sample();expectExcluded(r,"MOCK-S3-ALPHA","E-08");
});
test("BV-A07 telematics rejection excludes offers requiring telematics",()=>{
 const r=sample();r.preferences.telematics_accepted=false;
 const d=run(r);
 assert.ok(codes(d,"MOCK-S7-ALPHA").some(x=>x.startsWith("E-06")));
 assert.equal(d.selected_quote_id,"MOCK-S7-CHARLIE");
});
test("BV-A06 locked facts mutation is a hard fail",()=>{
 const r=sample();r.locked_profile.facts.annual_mileage=199;
 assert.throws(()=>run(r),/BV_LOCKED_FACTS_HASH_MISMATCH/);
});
test("BV-A06 wrong quote profile fingerprint is excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").facts_sha256="a".repeat(64);
 expectExcluded(r,"MOCK-S7-ALPHA","E-01");
});
test("BV-A06 wrong quote profile version is excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").profile_version=2;
 expectExcluded(r,"MOCK-S7-ALPHA","E-01");
});
test("BV-A06 unknown named driver excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").named_driver_ids=["ND-NOT-LOCKED"];
 expectExcluded(r,"MOCK-S7-ALPHA","E-07");
});
test("BV-A06 main driver cannot be a named driver",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").named_driver_ids=[r.locked_profile.facts.main_driver_id];
 expectExcluded(r,"MOCK-S7-ALPHA","E-07");
});
test("BV-A06 locked main driver cannot be included in available named-driver pool",()=>{
 const r=sample();r.locked_profile.facts.genuine_named_driver_ids.push(r.locked_profile.facts.main_driver_id);
 r.locked_profile.facts_sha256=fingerprint(r.locked_profile.facts);
 assert.throws(()=>run(r),/BV_MAIN_DRIVER_IN_NAMED_DRIVER_POOL/);
});
test("BV-A09 inconsistent scenario voluntary excess excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").scenario.voluntary_excess_pence=50000;
 expectExcluded(r,"MOCK-S7-ALPHA","E-09");
});
test("BV-A09 quoted telematics must be accepted by scenario",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").scenario.telematics_preference=false;
 expectExcluded(r,"MOCK-S7-ALPHA","E-09");
});
test("BV-A09 wrong scenario named-driver IDs excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").scenario.genuine_named_driver_inclusion=[];
 expectExcluded(r,"MOCK-S7-ALPHA","E-07");
});
test("BV-A09 later policy date than required start excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").scenario.policy_start_date="2026-11-01";
 expectExcluded(r,"MOCK-S7-ALPHA","E-09");
});
test("BV-A09 impossible calendar date excluded",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").scenario.policy_start_date="2026-02-30";
 expectExcluded(r,"MOCK-S7-ALPHA","E-09");
});
test("BV-A10 Pareto lists S6, S7 Alpha and S7 Charlie but excludes dominated Bravo",()=>{
 const d=run(sample());
 assert.deepEqual(d.pareto_frontier_quote_ids,
   ["MOCK-S6-ALPHA","MOCK-S7-ALPHA","MOCK-S7-CHARLIE"]);
 assert.ok(!d.pareto_frontier_quote_ids.includes("MOCK-S7-BRAVO"));
});
test("BV-A10 sorting and input/output fingerprints invariant to quote permutations",()=>{
 const r=sample(),a=run(r);
 r.quotes.reverse();
 const b=run(r);
 assert.deepEqual(a,b);
});
test("BV-A10 equal premium selects lower excess deterministically",()=>{
 const r=sample();
 const q=quote(r,"MOCK-S7-BRAVO");
 q.price.total_payable_pence=61200;q.price.annual_cash_premium_pence=61200;
 q.excess.compulsory_pence=29000;
 const d=run(r);
 assert.equal(d.selected_quote_id,"MOCK-S7-BRAVO");
});
test("BV-A10 exact premium and excess ties resolve by stable quote ID",()=>{
 const r=sample();
 const a=quote(r,"MOCK-S7-ALPHA"),b=quote(r,"MOCK-S7-BRAVO");
 b.price.total_payable_pence=a.price.total_payable_pence;
 b.price.annual_cash_premium_pence=a.price.annual_cash_premium_pence;
 b.excess.compulsory_pence=a.excess.compulsory_pence;
 const d=run(r);
 assert.equal(d.selected_quote_id,"MOCK-S7-ALPHA");
 assert.ok(d.pareto_frontier_quote_ids.includes("MOCK-S7-BRAVO"));
});
test("BV-A11 hidden commission/affiliate rank field is prohibited by strict schema",()=>{
 const r=sample();quote(r,"MOCK-S7-ALPHA").commission_score=1000;
 assert.throws(()=>run(r),/BV_CONTRACT_SCHEMA_INVALID/);
});
test("BV-A11 unknown root partner operation is prohibited",()=>{
 const r=sample();r.live_partner_url="https://example.com/mock";
 assert.throws(()=>run(r),/BV_CONTRACT_SCHEMA_INVALID/);
});
test("BV-A11 duplicate quote identifiers rejected",()=>{
 const r=sample();r.quotes[1].quote_id=r.quotes[0].quote_id;
 assert.throws(()=>run(r),/BV_DUPLICATE_QUOTE_ID/);
});
test("BV-A08 missing required customer intent revision rejected",()=>{
 const r=sample();delete r.preferences.intent_revision;
 assert.throws(()=>run(r),/BV_CONTRACT_SCHEMA_INVALID/);
});
test("BV-A08 contradictory required cover baseline rejected",()=>{
 const r=sample();r.preferences.coverage_baseline.windscreen=false;
 assert.throws(()=>run(r),/BV_REQUIRED_BENEFIT_CONTRADICTION/);
});
test("BV-A08 customer-confirmed constraint mandatory",()=>{
 const r=sample();r.preferences.customer_confirmed=false;
 assert.throws(()=>run(r),/BV_CONTRACT_SCHEMA_INVALID/);
});
test("BV-A08 budget constraint is explicit and never relaxed",()=>{
 const r=sample();r.preferences.max_total_payable_pence=60000;
 const d=run(r);
 assert.equal(d.status,"NO_QUOTES_MEET_PREFERENCES");
 assert.ok(codes(d,"MOCK-S7-ALPHA").includes("E-10_PREMIUM_OVER_CUSTOMER_BUDGET"));
});
test("BV-A12 existing Sprint 4 objective remains dormant",()=>{
 const objective=customerObjectiveModel().objectives.find(o=>o.objectiveId==="BALANCED_COST_AND_EXPOSURE");
 assert.equal(objective?.executable,false);
 assert.throws(()=>assertExecutableCustomerObjective("BALANCED_COST_AND_EXPOSURE"),/DORMANT/);
 assert.throws(()=>analyseSprint4Recommendations({
   objectiveId:"BALANCED_COST_AND_EXPOSURE",objectiveVersion:"sp4-objectives-v1",
   catalogueVersion:"sp4-catalogue-v2.1",policyFingerprint:"f".repeat(64),
   explorationFingerprint:"e".repeat(64),quotes:[]
 }),/DORMANT/);
});
test("BV-A12 DB objective constraint continues to forbid activation",()=>{
 const sql=readFileSync("packages/db/migrations/0008_optimisation_policy_persistence.sql","utf8");
 const a=sql.indexOf("CONSTRAINT customer_objective_executable_v1"),b=sql.indexOf("),",a);
 assert.ok(a>=0&&b>a);
 assert.doesNotMatch(sql.slice(a,b),/BALANCED_COST_AND_EXPOSURE/);
});
test("BV-A14 no live execution when live mode is enabled",()=>{
 const r=sample(),old=process.env.MIQO_LIVE_PROVIDERS_ENABLED;
 try{
   process.env.MIQO_LIVE_PROVIDERS_ENABLED="true";
   assert.throws(()=>run(r),/BV_LIVE_MODE_FORBIDDEN/);
 }finally{
   if(old===undefined)delete process.env.MIQO_LIVE_PROVIDERS_ENABLED;
   else process.env.MIQO_LIVE_PROVIDERS_ENABLED=old;
 }
});
test("BV-A15 output always synthetic demo classification, no handoff/binding/payment",()=>{
 const d=run(sample());
 assert.equal(d.classification,"SYNTHETIC_DEMO_ONLY");
 assert.ok(d.explanations.includes("DEMO_ONLY_NOT_INSURANCE_ADVICE"));
 assert.equal(d.partner_handoff,undefined);
 assert.equal(d.binding_reference,undefined);
 assert.equal(d.payment_token,undefined);
});
