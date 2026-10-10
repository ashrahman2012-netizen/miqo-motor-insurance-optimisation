import test from "node:test";
import assert from "node:assert/strict";
import {baseProfile,scenarioRows,quoteRows,TEST_CLOCK} from "./fixtures.mjs";
import {
  executeSyntheticUat,lockedProfile,buildScenario,buildRequest,mockQuoteResponse,
  normaliseRaw,recommend,finalHandoff,factsHash
} from "./engine.mjs";

const deep = value => structuredClone(value);

test("T01-T08: eight requests, eight responses, ten normalised quotations, blocked handoff",()=>{
  const run=executeSyntheticUat();
  assert.equal(run.T01_CustomerProfile.data_classification,"SYNTHETIC_ONLY");
  assert.equal(run.T02_LockedRiskProfile.status,"LOCKED_SYNTHETIC");
  assert.equal(run.T03_OptimisationScenarios.length,8);
  assert.equal(run.T04_SEOPAQuoteRequests.length,8);
  assert.equal(run.T05_RawQuoteResponses.length,8);
  assert.equal(run.T06_NormalisedQuotes.length,10);
  assert.equal(run.evidence.live_partner_requests,0);
  assert.equal(run.evidence.live_purchase_attempts,0);
  assert.equal(run.T08_FinalHandoff.integrity.status,"PASS_SYNTHETIC");
  assert.equal(run.T08_FinalHandoff.partner_handoff.status,"BLOCKED_NO_PARTNER_CONTRACT");
  assert.equal(run.T08_FinalHandoff.policy_bound,false);
  assert.equal(run.T08_FinalHandoff.premium_collected,false);
});

test("locked facts fingerprint is shared and outbound named-driver facts are anchored",()=>{
  const r=executeSyntheticUat();
  const p=r.T02_LockedRiskProfile;
  assert.equal(factsHash(p.facts),p.facts_sha256);
  assert.equal(p.facts.genuine_named_drivers[0].id,"ND-001");
  for(const [i,request] of r.T04_SEOPAQuoteRequests.entries()){
    assert.equal(request.facts_sha256,p.facts_sha256);
    assert.equal(factsHash(request.canonical_risk_facts),p.facts_sha256);
    assert.equal(request.scenario_id,r.T03_OptimisationScenarios[i].scenario_id);
    assert.equal(request.mode,"MOCK_ONLY");
    assert.equal(request.partner_mapping.status,"UNCONFIRMED");
    assert.equal(request.idempotency_key,r.T04_SEOPAQuoteRequests[i].idempotency_key);
    assert.equal(request.included_named_drivers.length,
      r.T03_OptimisationScenarios[i].o_class_deltas.genuine_named_driver_inclusion.length);
  }
});

test("real MIQOS normaliser and comparison are used; missing monthly cash basis excluded",()=>{
  const r=executeSyntheticUat();
  const monthly=r.T06_NormalisedQuotes.find(q=>q.scenario_id==="S3");
  assert.equal(monthly.total_payable_pence,75240);
  assert.equal(monthly.annual_cash_premium_pence,null);
  assert.equal(monthly.comparison_state,"NOT_COMPARABLE");
  assert.equal(r.T07_RecommendationSet.cheapest_quote_id,"MOCK-S6-ALPHA");
  assert.match(r.T07_RecommendationSet.direct_comparison_fingerprint,/^[a-f0-9]{64}$/);
});

test("the Balanced Value demonstration uses 600 GBP excess threshold, not dormant live objective",()=>{
  const r=executeSyntheticUat();
  const d=r.T07_RecommendationSet;
  assert.equal(d.recommended_quote_id,"MOCK-S7-ALPHA");
  assert.equal(d.annual_premium_pence,61200);
  assert.equal(d.total_excess_pence,55000);
  assert.equal(d.cheapest_premium_pence,57100);
  assert.equal(d.cheapest_excess_pence,85000);
  assert.equal(d.savings_vs_baseline_pence,20000);
  assert.equal(d.savings_vs_baseline_pct,24.63);
  assert.equal(d.premium_more_than_cheapest_pence,4100);
  assert.equal(d.excess_less_than_cheapest_pence,30000);
  assert.equal(d.decision_status,"PROVISIONAL_MOCK_RECOMMENDATION");
  assert.equal(d.objective_status,"SYNTHETIC_RULE_ONLY_PRODUCTION_OBJECTIVE_DORMANT");
});

test("deterministic scenario and transaction replay",()=>{
  assert.deepEqual(executeSyntheticUat(),executeSyntheticUat());
});

test("reject factual changes after lock",()=>{
  assert.throws(()=>executeSyntheticUat({mutateLockedProfile:p=>{
    p.facts.annual_mileage=1000;
  }}),/PROFILE_FINGERPRINT_MISMATCH/);
});

test("reject unapproved factual delta disguised as O-control",()=>{
  const p=lockedProfile();
  const s=buildScenario(p,scenarioRows[0]);
  s.o_class_deltas.occupation="retired";
  assert.throws(()=>buildRequest(p,s),/UNAUTHORISED_O_CLASS_DELTA/);
});

test("reject named driver not present in locked factual profile",()=>{
  const p=lockedProfile();
  const bad=deep(scenarioRows[7]);bad[5]=["ND-UNDECLARED"];
  assert.throws(()=>buildScenario(p,bad),/UNKNOWN_GENUINE_NAMED_DRIVER/);
});

test("reject main driver being invented as named driver",()=>{
  const p=lockedProfile();
  const bad=deep(scenarioRows[7]);bad[5]=["DR-001"];
  assert.throws(()=>buildScenario(p,bad),/UNKNOWN_GENUINE_NAMED_DRIVER/);
});

test("reject duplicate named-driver IDs",()=>{
  const p=lockedProfile();
  const bad=deep(scenarioRows[7]);bad[5]=["ND-001","ND-001"];
  assert.throws(()=>buildScenario(p,bad),/INVALID_NAMED_DRIVER_SET/);
});

test("reject ineligible or untruthful named-driver pool",()=>{
  const bad=deep(baseProfile);bad.genuine_named_drivers[0].will_genuinely_drive=false;
  assert.throws(()=>lockedProfile(bad),/INVALID_GENUINE_NAMED_DRIVER_DECLARATION/);
});

test("reject live mode and live environment",()=>{
  assert.throws(()=>executeSyntheticUat({partnerMode:"LIVE"}),/LIVE_PARTNER_OPERATION_FORBIDDEN/);
  const p=lockedProfile();const s=buildScenario(p,scenarioRows[0]);
  assert.throws(()=>buildRequest(p,s,{mode:"SANDBOX"}),/LIVE_PARTNER_OPERATION_FORBIDDEN/);
});

test("reject response with wrong lineage",()=>{
  assert.throws(()=>executeSyntheticUat({mutateResponse:rows=>{
    rows[7].correlation_id="WRONG";
  }}),/RESPONSE_LINEAGE_MISMATCH/);
});

test("reject duplicate quote IDs in a response",()=>{
  assert.throws(()=>executeSyntheticUat({mutateResponse:rows=>{
    rows[7].quotes[1].quote_id=rows[7].quotes[0].quote_id;
  }}),/DUPLICATE_OR_FOREIGN_QUOTE_ID/);
});

test("reject quote that has expired at the synthetic evaluation clock",()=>{
  assert.throws(()=>executeSyntheticUat({clock:"2026-10-10T10:01:00+01:00"}),/QUOTE_EXPIRED/);
});

test("reject unauthorised telematics requirement",()=>{
  assert.throws(()=>executeSyntheticUat({mutateResponse:rows=>{
    rows[0].quotes[0].requirements.telematics_required=true;
  }}),/UNAUTHORISED_TELEMATICS_REQUIREMENT/);
});

test("reject changed excess and mismatched payment basis",()=>{
  assert.throws(()=>executeSyntheticUat({mutateResponse:rows=>{
    rows[7].quotes[0].excess.voluntary_pence=10000;
  }}),/EXCESS_SCENARIO_MISMATCH/);
  assert.throws(()=>executeSyntheticUat({mutateResponse:rows=>{
    rows[7].quotes[0].price.payment_mode="monthly";
  }}),/PAYMENT_STRUCTURE_MISMATCH/);
});

test("reject forged purchase reference or a deep link",()=>{
  assert.throws(()=>executeSyntheticUat({mutateResponse:rows=>{
    rows[7].quotes[0].handoff.deep_link="https://example.org/fake-binding";
  }}),/LIVE_HANDOFF_REFERENCE_FORBIDDEN/);
});

test("reject missing mandatory fee inclusion",()=>{
  assert.throws(()=>executeSyntheticUat({mutateResponse:rows=>{
    rows[7].quotes[0].price.ipt_and_mandatory_fees_included=false;
  }}),/MANDATORY_FEES_UNVERIFIED/);
});

test("reject selection substitution",()=>{
  assert.throws(()=>executeSyntheticUat({selectedQuoteId:"MOCK-S6-ALPHA"}),
    /SELECTION_QUOTE_MISMATCH/);
});

test("reject missing response and duplicated scenario rows",()=>{
  const fewer=deep(quoteRows).filter(row=>row[0]!=="S2");
  assert.throws(()=>executeSyntheticUat({quoteRows:fewer}),/NO_MOCK_QUOTE_FIXTURE/);
  const duplicated=deep(scenarioRows);duplicated[1]=duplicated[0];
  assert.throws(()=>executeSyntheticUat({scenarioRows:duplicated}),/SCENARIO_SET_INVALID/);
});

test("provisional coverage cannot be claimed as complete",()=>{
  const r=executeSyntheticUat();
  assert.ok(r.T06_NormalisedQuotes.every(q=>q.coverage_details_verified===false));
  assert.equal(r.T07_RecommendationSet.coverage_details_verified,false);
  assert.match(r.T08_FinalHandoff.customer_facing_label,/NOT A REAL INSURANCE QUOTE/);
});
