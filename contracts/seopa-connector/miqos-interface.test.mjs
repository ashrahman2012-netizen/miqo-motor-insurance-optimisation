import test from "node:test";
import assert from "node:assert/strict";
import {CONNECTOR_VERSION,STATES,ERROR_CODES,validateConnectorRequest,transition,simulateConnector,assertProductionCapability,makeCertificationReceipt} from "./miqos-interface.mjs";
process.env.MIQO_DATA_CLASSIFICATION="SYNTHETIC";
process.env.MIQO_LIVE_PROVIDERS_ENABLED="false";
const context={executionMode:"BOUNDED_SYNTHETIC_CERTIFICATION"};
const request=()=>({
 interfaceVersion:CONNECTOR_VERSION,environment:"SYNTHETIC_ONLY",requestId:"MOCK-REQUEST-001",
 idempotencyKey:"MOCK-IDEMPOTENT-001",createdAt:"2026-10-10T10:00:00Z",expiresAt:"2026-10-10T11:00:00Z",
 profile:{profileId:"MOCK-PROFILE-1",profileVersion:1,status:"LOCKED_SYNTHETIC",factsFingerprint:"a".repeat(64),syntheticFactsRef:"MOCK-SNAPSHOT-001"},
 intent:{revision:"MOCK-INTENT-1",confirmed:true,cover:"COMPREHENSIVE",paymentModes:["ANNUAL"],
  maxTotalExcessPence:null,telematicsAccepted:true},providerSlot:"SEOPA_UNMAPPED"
});
const response=()=>({kind:"MOCK_RESPONSE",requestId:"MOCK-REQUEST-001",
 profileFingerprint:"a".repeat(64),mappingVersion:"UNMAPPED_SYNTHETIC_V1",
 payloadFingerprint:"b".repeat(64),quotes:[{mockQuoteId:"MOCK-Q1"}]});
test("SIF-01 deterministic locked synthetic request validated",()=>{
 const a=validateConnectorRequest(request(),context);
 assert.equal(a.validated,true);assert.match(a.requestFingerprint,/^[a-f0-9]{64}$/);
 assert.deepEqual(a,validateConnectorRequest(request(),context));
});
test("SIF-02 synthetic lifecycle success, no public quote eligibility",()=>{
 const r=simulateConnector(request(),response(),context);
 assert.deepEqual(r.trace,["CREATED","VALIDATED","SUBMITTED","RESPONDED"]);
 assert.equal(r.productionPermitted,false);assert.equal(r.response.quotes[0].readiness,"UNVERIFIED");
});
test("SIF-03 stable no-go certification receipt",()=>{
 const r=makeCertificationReceipt(request(),response(),context);
 assert.equal(r.providerApiCalled,false);
 assert.equal(r.canBind,false);
 assert.equal(r.releaseDisposition,"EXTERNAL_SPEC_AND_APPROVAL_REQUIRED");
 assert.deepEqual(r,makeCertificationReceipt(request(),response(),context));
});
const invalid=[
 ["no context",x=>x,null,"IF_LIVE_MODE_BLOCKED"],
 ["live request",x=>{x.environment="LIVE";},context,"IF_LIVE_MODE_BLOCKED"],
 ["wrong version",x=>{x.interfaceVersion="v2";},context,"IF_CONTRACT_INVALID"],
 ["extra request field",x=>{x.customerName="PERSON";},context,"IF_CONTRACT_INVALID"],
 ["missing request id",x=>{delete x.requestId;},context,"IF_CONTRACT_INVALID"],
 ["profile unlocked",x=>{x.profile.status="DRAFT";},context,"IF_CUSTOMER_FACTS_UNLOCKED"],
 ["profile fingerprint",x=>{x.profile.factsFingerprint="invalid";},context,"IF_FACTS_FINGERPRINT_INVALID"],
 ["real facts reference",x=>{x.profile.syntheticFactsRef="REAL-ONE";},context,"IF_FACTS_FINGERPRINT_INVALID"],
 ["intent not confirmed",x=>{x.intent.confirmed=false;},context,"IF_INTENT_NOT_CONFIRMED"],
 ["no payment choice",x=>{x.intent.paymentModes=[];},context,"IF_INTENT_NOT_CONFIRMED"],
 ["unapproved risk cap",x=>{x.intent.maxTotalExcessPence=-1;},context,"IF_INTENT_NOT_CONFIRMED"],
 ["unsupported insurance cover",x=>{x.intent.cover="THIRD_PARTY";},context,"IF_INTENT_NOT_CONFIRMED"],
 ["expired window",x=>{x.expiresAt=x.createdAt;},context,"IF_REQUEST_EXPIRED"],
 ["unknown provider slot",x=>{x.providerSlot="SEOPA_LIVE";},context,"IF_CONTRACT_INVALID"]
];
for(const [name,change,ctx,code] of invalid)test("SIF-negative "+name,()=>{
 const x=request();if(typeof change==="function")change(x);
 assert.throws(()=>validateConnectorRequest(x,ctx),e=>e.code===code);
});
test("SIF-18 response cannot have mismatched risk fingerprint",()=>{
 const f=response();f.profileFingerprint="c".repeat(64);
 assert.throws(()=>simulateConnector(request(),f,context),e=>e.code==="IF_RESPONSE_UNVERIFIED");
});
test("SIF-19 response cannot claim approved mapping",()=>{
 const f=response();f.mappingVersion="SEOPA_APPROVED";
 assert.throws(()=>simulateConnector(request(),f,context),e=>e.code==="IF_RESPONSE_UNVERIFIED");
});
test("SIF-20 no empty spec masquerading as verified quote",()=>{
 const f=response();f.quotes=[{mockQuoteId:"MOCK-Q1",totalPremium:900}];
 const r=simulateConnector(request(),f,context);
 assert.equal(Object.hasOwn(r.response.quotes[0],"totalPremium"),false);
});
test("SIF-21 lifecycle prevents skipping certification phases",()=>{
 assert.equal(transition("CREATED","VALIDATED"),"VALIDATED");
 assert.throws(()=>transition("CREATED","RESPONDED"),e=>e.code==="IF_INVALID_TRANSITION");
 assert.throws(()=>transition("NORMALISED","SUBMITTED"),e=>e.code==="IF_INVALID_TRANSITION");
});
test("SIF-22 production capability fails closed",()=>{
 assert.throws(assertProductionCapability,e=>e.code==="IF_PARTNER_SPEC_UNAVAILABLE");
});
test("SIF-23 explicit non-functional regulatory/auth reasons",()=>{
 assert.ok(ERROR_CODES.includes("IF_PARTNER_RIGHTS_UNVERIFIED"));
 assert.ok(ERROR_CODES.includes("IF_PARTNER_AUTH_NOT_CONFIGURED"));
 assert.ok(STATES.includes("EXPIRED"));
});
