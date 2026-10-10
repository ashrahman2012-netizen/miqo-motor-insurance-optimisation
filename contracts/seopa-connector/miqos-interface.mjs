// MIQOS-side SEOPA connector interface freeze, synthetic simulation ONLY.
// This file does not describe, implement or assume SEOPA's actual API.
import {createHash} from "node:crypto";
export const CONNECTOR_VERSION="MIQOS-SEOPA-CONNECTOR-IF-001-v1.0";
export const STATES=Object.freeze(["CREATED","VALIDATED","SUBMITTED","RESPONDED","NORMALISED","REJECTED","EXPIRED","CANCELLED"]);
export const ERROR_CODES=Object.freeze([
 "IF_CONTRACT_INVALID","IF_UNSUPPORTED_VERSION","IF_LIVE_MODE_BLOCKED",
 "IF_CUSTOMER_FACTS_UNLOCKED","IF_FACTS_FINGERPRINT_INVALID","IF_INTENT_NOT_CONFIRMED",
 "IF_REQUEST_EXPIRED","IF_DUPLICATE_IDEMPOTENCY_CONFLICT","IF_PARTNER_SPEC_UNAVAILABLE",
 "IF_PARTNER_AUTH_NOT_CONFIGURED","IF_PARTNER_RIGHTS_UNVERIFIED","IF_NETWORK_FORBIDDEN",
 "IF_RESPONSE_UNVERIFIED","IF_QUOTE_EXPIRED","IF_QUOTE_FINANCE_INCOMPLETE",
 "IF_COVERAGE_UNVERIFIED","IF_PREMIUM_INCOMPLETE","IF_MAPPING_VERSION_UNAPPROVED",
 "IF_INVALID_TRANSITION"
]);
const hex=/^[a-f0-9]{64}$/;
const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const keys=(x,expected)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).every(k=>expected.includes(k));
export function validateConnectorRequest(request,context={}){
 if(context.executionMode!=="BOUNDED_SYNTHETIC_CERTIFICATION" ||
   process.env.MIQO_DATA_CLASSIFICATION!=="SYNTHETIC" ||
   process.env.MIQO_LIVE_PROVIDERS_ENABLED!=="false" ||
   request?.environment!=="SYNTHETIC_ONLY")fail("IF_LIVE_MODE_BLOCKED");
 if(!keys(request,["interfaceVersion","environment","requestId","idempotencyKey","createdAt","expiresAt","profile","intent","providerSlot"])||
 request.interfaceVersion!==CONNECTOR_VERSION||
 typeof request.requestId!=="string"||!request.requestId.startsWith("MOCK-")||
 typeof request.idempotencyKey!=="string"||!request.idempotencyKey.startsWith("MOCK-")||
 request.providerSlot!=="SEOPA_UNMAPPED"||
 !Number.isFinite(Date.parse(request.createdAt))||
 !Number.isFinite(Date.parse(request.expiresAt)))fail("IF_CONTRACT_INVALID");
 if(Date.parse(request.expiresAt)<=Date.parse(request.createdAt))fail("IF_REQUEST_EXPIRED");
 if(!keys(request.profile,["profileId","profileVersion","status","factsFingerprint","syntheticFactsRef"])||
 request.profile.status!=="LOCKED_SYNTHETIC"||!Number.isSafeInteger(request.profile.profileVersion)||
 request.profile.profileVersion<1)fail("IF_CUSTOMER_FACTS_UNLOCKED");
 if(!hex.test(request.profile.factsFingerprint)||typeof request.profile.syntheticFactsRef!=="string"||
 !request.profile.syntheticFactsRef.startsWith("MOCK-"))fail("IF_FACTS_FINGERPRINT_INVALID");
 if(!keys(request.intent,["revision","confirmed","cover","paymentModes","maxTotalExcessPence","telematicsAccepted"])||
 request.intent.confirmed!==true||typeof request.intent.revision!=="string"||
 !request.intent.revision.startsWith("MOCK-")||
 request.intent.cover!=="COMPREHENSIVE"||
 !Array.isArray(request.intent.paymentModes)||request.intent.paymentModes.length<1||
 !request.intent.paymentModes.every(x=>x==="ANNUAL"||x==="MONTHLY")||
 typeof request.intent.telematicsAccepted!=="boolean"||
 (request.intent.maxTotalExcessPence!==null&&
 (!Number.isSafeInteger(request.intent.maxTotalExcessPence)||request.intent.maxTotalExcessPence<0)))
 fail("IF_INTENT_NOT_CONFIRMED");
 return Object.freeze({validated:true,requestFingerprint:digest(request),interfaceVersion:CONNECTOR_VERSION});
}
const transitions=Object.freeze({
 CREATED:["VALIDATED","REJECTED","CANCELLED"],
 VALIDATED:["SUBMITTED","REJECTED","EXPIRED","CANCELLED"],
 SUBMITTED:["RESPONDED","REJECTED","EXPIRED","CANCELLED"],
 RESPONDED:["NORMALISED","REJECTED","EXPIRED"],
 NORMALISED:[],REJECTED:[],EXPIRED:[],CANCELLED:[]
});
export function transition(state,next){
 if(!STATES.includes(state)||!transitions[state].includes(next))fail("IF_INVALID_TRANSITION");
 return next;
}
export function simulateConnector(request,fixture,context){
 const v=validateConnectorRequest(request,context);
 if(fixture?.kind!=="MOCK_RESPONSE"||
 fixture.requestId!==request.requestId||
 fixture.profileFingerprint!==request.profile.factsFingerprint||
 fixture.mappingVersion!=="UNMAPPED_SYNTHETIC_V1"||
 !hex.test(fixture.payloadFingerprint??""))fail("IF_RESPONSE_UNVERIFIED");
 if(!Array.isArray(fixture.quotes))fail("IF_RESPONSE_UNVERIFIED");
 // Validation does NOT declare any insurer terms complete or provider permissions established.
 const response=Object.freeze({
  interfaceVersion:CONNECTOR_VERSION,environment:"SYNTHETIC_ONLY",
  requestId:request.requestId,requestFingerprint:v.requestFingerprint,
  state:"RESPONDED",providerSlot:"SEOPA_UNMAPPED",
  partnerCertified:false,rightsVerified:false,
  mappingVersion:fixture.mappingVersion,payloadFingerprint:fixture.payloadFingerprint,
  quotes:fixture.quotes.map(q=>Object.freeze({
   mockQuoteId:q.mockQuoteId,readiness:"UNVERIFIED",
   blockingCodes:["IF_PARTNER_SPEC_UNAVAILABLE","IF_PARTNER_RIGHTS_UNVERIFIED",
    "IF_COVERAGE_UNVERIFIED","IF_PREMIUM_INCOMPLETE","IF_QUOTE_FINANCE_INCOMPLETE"]
  }))
 });
 return Object.freeze({response,trace:Object.freeze(["CREATED","VALIDATED","SUBMITTED","RESPONDED"]),productionPermitted:false});
}
export function assertProductionCapability(){fail("IF_PARTNER_SPEC_UNAVAILABLE");}
export function makeCertificationReceipt(request,fixture,context){
 const result=simulateConnector(request,fixture,context);
 return Object.freeze({
  interfaceVersion:CONNECTOR_VERSION,classification:"SYNTHETIC_ONLY",
  requestFingerprint:result.response.requestFingerprint,
  responseFingerprint:digest(result.response),state:result.response.state,
  quoteCount:result.response.quotes.length,
  providerApiCalled:false,realCustomerData:false,
  partnerCertified:false,canBind:false,canRedirect:false,canTakePayment:false,
  releaseDisposition:"EXTERNAL_SPEC_AND_APPROVAL_REQUIRED"
 });
}
