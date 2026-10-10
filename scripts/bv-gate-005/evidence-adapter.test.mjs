import test from "node:test";
import assert from "node:assert/strict";
import {normaliseMockProviderPayload} from "../../packages/normalisation/src/index.ts";
import {syntheticRequest} from "../bv-gate-003/fixtures.mjs";
import {adaptSprint4Evidence,previewAdaptedSprint4Evidence} from "./evidence-adapter.mjs";
process.env.MIQO_DATA_CLASSIFICATION="SYNTHETIC";
process.env.MIQO_LIVE_PROVIDERS_ENABLED="false";
const hash="a".repeat(64);
function sample(){
 const request=syntheticRequest(),q=structuredClone(request.quotes.find(x=>x.quote_id==="MOCK-S7-ALPHA"));
 const normalised=normaliseMockProviderPayload({
  payloadSha256:hash,payloadText:JSON.stringify({provider:"MOCK-PROVIDER-001",
   quote:{annualPremiumPence:q.price.annual_cash_premium_pence,baseExcessPence:q.excess.compulsory_pence,
   voluntaryExcessPence:q.excess.voluntary_pence,paymentBasis:"ANNUAL",coverageMarkers:["COMPREHENSIVE"]}})
 });
 const source={
  synthetic:true,providerKey:"MOCK-PROVIDER-001",normalisedQuoteId:q.quote_id,
  quoteRequestId:"REQ-SYN-001",scenarioId:q.scenario_id,
  marketRouteId:"RTE-SYN-001",routeKey:q.route_key,mappingVersion:"MOCK-MAPPING-001",
  routeFingerprint:"b".repeat(64),normalisationFingerprint:normalised.normalisationFingerprint,
  profileId:q.profile_id,profileVersion:q.profile_version,factsSha256:q.facts_sha256
 };
 const attestation={...q,evidence_classification:"INDEPENDENT_SYNTHETIC_TEST_ATTESTATION"};
 return {request,normalised,source,attestation};
}
test("BV5-AD01 enriched mock quote can be validated and selected without registration",()=>{
 const x=previewAdaptedSprint4Evidence(sample());
 assert.equal(x.adapter.status,"SYNTHETIC_ADAPTER_READY");
 assert.equal(x.result.decision.selected_quote_id,"MOCK-S7-ALPHA");
 assert.equal(x.adapter.publicApiRegistered,false);
});
test("BV5-AD02 naked Sprint 4 normaliser never produces an eligible quote",()=>{
 const x=sample();x.attestation={};
 const y=adaptSprint4Evidence(x);
 assert.equal(y.quote,null);
 assert.equal(y.receipt.status,"ADAPTER_INCOMPLETE");
 assert.ok(y.receipt.reasons.includes("ATTESTATION_MISSING_benefits"));
});
const mutations=[
 ["benefits",x=>{delete x.attestation.benefits;},"ATTESTATION_MISSING_benefits"],
 ["IPT",x=>{x.attestation.price.mandatory_fees_ipt_included=false;},"IPT_FEES_COMPLETENESS_UNVERIFIED"],
 ["finance",x=>{x.attestation.price.finance_terms_complete=false;},"FINANCE_COMPLETENESS_UNVERIFIED"],
 ["expiry",x=>{x.attestation.valid_until="2026-10-10T09:00:00+01:00";},"QUOTE_TIME_MISSING_OR_EXPIRED"],
 ["profile",x=>{x.source.factsSha256="c".repeat(64);},"SOURCE_FACTS_HASH_MISMATCH"],
 ["route",x=>{x.attestation.route_key="DIFFERENT";},"ROUTE_KEY_SOURCE_MISMATCH"],
 ["scenario",x=>{x.attestation.scenario_id="S8";},"SCENARIO_ID_SOURCE_MISMATCH"],
 ["name",x=>{x.attestation.named_driver_ids=null;},"NAMED_DRIVERS_UNVERIFIED"],
 ["permission",x=>{x.attestation.quotation_permission=false;},"QUOTATION_PERMISSION_UNVERIFIED"],
 ["restrictions",x=>{x.attestation.restrictions_verified=false;},"RESTRICTIONS_UNVERIFIED"],
 ["compulsory excess",x=>{x.attestation.excess.compulsory_pence=99000;},"COMPULSORY_EXCESS_MISMATCH"],
 ["voluntary excess",x=>{x.attestation.excess.voluntary_pence=99000;},"VOLUNTARY_EXCESS_MISMATCH"],
 ["premium",x=>{x.attestation.price.annual_cash_premium_pence=99000;},"ANNUAL_PRICE_MISMATCH"],
 ["attestation class",x=>{x.attestation.evidence_classification="LIVE";},"EVIDENCE_CLASSIFICATION_NOT_TEST_ONLY"],
 ["date",x=>{delete x.attestation.issued_at;},"ATTESTATION_MISSING_issued_at"],
 ["mapping",x=>{delete x.source.mappingVersion;},"SOURCE_MISSING_mappingVersion"],
 ["normaliser hash",x=>{x.source.normalisationFingerprint="c".repeat(64);},"SOURCE_NORMALISATION_FINGERPRINT_MISMATCH"]
];
for(const [name,mutate,code] of mutations)test("BV5-AD negative "+name,()=>{
 const x=sample();mutate(x);
 const y=previewAdaptedSprint4Evidence(x);
 assert.equal(y.result,null);
 assert.ok(y.adapter.reasons.includes(code),JSON.stringify(y.adapter.reasons));
});
test("BV5-AD safe result is invariant across repeated evaluations",()=>{
 const x=sample(),a=previewAdaptedSprint4Evidence(x),b=previewAdaptedSprint4Evidence(x);
 assert.deepEqual(a,b);
});
test("BV5-AD no source factual changes accepted",()=>{
 const x=sample();x.attestation.facts_sha256="d".repeat(64);
 assert.equal(previewAdaptedSprint4Evidence(x).result,null);
});
test("BV5-AD reject a live environment",()=>{
 const x=sample();x.request.environment="LIVE";
 assert.throws(()=>previewAdaptedSprint4Evidence(x),/BV5_ADAPTER_SYNTHETIC_ONLY/);
});
test("BV5-AD source normaliser zero finance is not proof of monthly terms",()=>{
 const x=sample();x.attestation.price.payment_mode="MONTHLY";
 assert.equal(previewAdaptedSprint4Evidence(x).result,null);
});
