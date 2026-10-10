import test from "node:test";
import assert from "node:assert/strict";
import {assessSyntheticIntegration,previewSyntheticIntegration,REQUIRED_SYNTHETIC_EVIDENCE_KEYS} from "./readiness.mjs";
import {syntheticRequest} from "../bv-gate-003/fixtures.mjs";
process.env.MIQO_DATA_CLASSIFICATION="SYNTHETIC";
process.env.MIQO_LIVE_PROVIDERS_ENABLED="false";
const ready=()=>Object.fromEntries(REQUIRED_SYNTHETIC_EVIDENCE_KEYS.map(x=>[x,x==="source_classification"?"SYNTHETIC":true]));
test("BV5-01 confirmed mock evidence permits non-routable candidate preview",()=>{
 const r=previewSyntheticIntegration(ready(),syntheticRequest());
 assert.equal(r.gate.eligibleForInternalUat,true);
 assert.equal(r.result.decision.selected_quote_id,"MOCK-S7-ALPHA");
 assert.equal(r.result.productState.customerFacingRoute,false);
 assert.equal(r.gate.seopaConnected,false);
});
test("BV5-02 missing coverage proof fails closed before candidate selection",()=>{
 const e=ready();delete e.cover_features_verified;
 const r=previewSyntheticIntegration(e,syntheticRequest());
 assert.equal(r.result,null);
 assert.ok(r.gate.reasons.includes("MISSING:cover_features_verified"));
});
test("BV5-03 unverified finance terms are not invented",()=>{
 const e=ready();e.finance_terms_verified=false;
 const r=previewSyntheticIntegration(e,syntheticRequest());
 assert.equal(r.result,null);
 assert.ok(r.gate.reasons.includes("UNVERIFIED:finance_terms_verified"));
});
test("BV5-04 missing retention/display right is a hard blocker",()=>{
 const e=ready();e.retention_rights_verified=false;
 assert.equal(previewSyntheticIntegration(e,syntheticRequest()).result,null);
});
test("BV5-05 unknown readiness properties cannot imply permission",()=>{
 const e=ready();e.seopa_live_access=true;
 assert.ok(assessSyntheticIntegration(e,syntheticRequest()).reasons.includes("UNRECOGNISED_FIELD:seopa_live_access"));
});
test("BV5-06 no implicit quote source classification",()=>{
 const e=ready();delete e.source_classification;
 assert.equal(assessSyntheticIntegration(e,syntheticRequest()).eligibleForInternalUat,false);
});
test("BV5-07 no actual/live input classification",()=>{
 const e=ready();e.source_classification="LIVE";
 assert.ok(assessSyntheticIntegration(e,syntheticRequest()).reasons.includes("NON_SYNTHETIC_SOURCE"));
});
test("BV5-08 pre-quote customer intention requires evidence",()=>{
 const e=ready();e.intent_confirmed=false;
 assert.equal(previewSyntheticIntegration(e,syntheticRequest()).result,null);
});
test("BV5-09 source lock cannot be merely assumed",()=>{
 const e=ready();e.profile_verified=false;
 assert.equal(previewSyntheticIntegration(e,syntheticRequest()).result,null);
});
test("BV5-10 wrong environment request is refused",()=>{
 const r=syntheticRequest();r.environment="LIVE";
 assert.throws(()=>assessSyntheticIntegration(ready(),r),/BV5_SYNTHETIC_ONLY/);
});
test("BV5-11 explicit disabled-live flag is mandatory",()=>{
 const old=process.env.MIQO_LIVE_PROVIDERS_ENABLED;
 try{delete process.env.MIQO_LIVE_PROVIDERS_ENABLED;
  assert.throws(()=>assessSyntheticIntegration(ready(),syntheticRequest()),/BV5_SYNTHETIC_ONLY/);
 }finally{process.env.MIQO_LIVE_PROVIDERS_ENABLED=old}
});
test("BV5-12 all failures are ordered deterministically and replayable",()=>{
 const e=ready();delete e.cover_features_verified;e.pricing_ipt_fees_verified=false;
 const a=assessSyntheticIntegration(e,syntheticRequest()),b=assessSyntheticIntegration(e,syntheticRequest());
 assert.deepEqual(a,b);
 assert.match(a.readinessFingerprint,/^[a-f0-9]{64}$/);
 assert.deepEqual(a.reasons,[...a.reasons].sort());
});
test("BV5-13 customer cap remains genuinely optional",()=>{
 const r=syntheticRequest();delete r.preferences.max_total_excess_pence;
 assert.equal(previewSyntheticIntegration(ready(),r).result.decision.selected_quote_id,"MOCK-S6-ALPHA");
});
test("BV5-14 expired mock quotation excluded, not repaired",()=>{
 const r=syntheticRequest();r.test_clock="2026-10-10T11:30:00+01:00";
 assert.equal(previewSyntheticIntegration(ready(),r).result.decision.status,"NO_ELIGIBLE_QUOTES");
});
test("BV5-15 no authority for customer API or SEOPA",()=>{
 const x=previewSyntheticIntegration(ready(),syntheticRequest());
 assert.equal(x.gate.runtimeConnected,false);
 assert.equal(x.gate.publicRouteMounted,false);
 assert.equal(x.gate.objectiveExecutable,false);
 assert.equal(x.gate.seopaConnected,false);
});
