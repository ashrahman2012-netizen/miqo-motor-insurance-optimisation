import test from "node:test";
import assert from "node:assert/strict";
import {
  SP5_PROVIDER_CONTRACT_VERSION,
  assertEnvironmentConfiguration,
  assertProviderMappingPreservesCanonicalRequest,
  assertRouteExecutionAllowed,
  assertSecretsExternalised,
  canonicalRequestHash,
  redactOperationalText,
  type CanonicalQuoteRequest,
  type MarketRoute,
  type ProviderAdapter,
} from "../src/sp5-production-boundary.ts";

const request:CanonicalQuoteRequest=Object.freeze({
  requestId:"REQ-SP5-001",
  riskProfileVersionId:"RPV-SYN-001",
  scenarioId:"SCN-SYN-001",
  facts:Object.freeze({postcode:"SW1A1AA",occupation:"SOFTWARE_ENGINEER"}),
  options:Object.freeze({voluntaryExcess:500}),
});

const syntheticRoute:MarketRoute=Object.freeze({routeKey:"MOCK-DIRECT",providerKey:"MOCK",channel:"DIRECT_INSURER",mode:"SYNTHETIC",adapterVersion:"a1",mappingVersion:"m1"});
const liveInactive:MarketRoute=Object.freeze({...syntheticRoute,routeKey:"LIVE-DIRECT",mode:"LIVE"});
const liveActive:MarketRoute=Object.freeze({...liveInactive,activationReference:"APPROVAL-001"});

const adapter:ProviderAdapter={
  providerKey:"MOCK",adapterVersion:"a1",mappingVersion:"m1",
  mapRequest(input,route){return Object.freeze({contractVersion:SP5_PROVIDER_CONTRACT_VERSION,routeKey:route.routeKey,providerKey:route.providerKey,adapterVersion:route.adapterVersion,mappingVersion:route.mappingVersion,canonicalRequestHash:canonicalRequestHash(input),payload:Object.freeze({occupation:input.facts.occupation,voluntaryExcess:input.options.voluntaryExcess})});}
};

test("S5-G1 environment classes fail closed",()=>{
  assert.doesNotThrow(()=>assertEnvironmentConfiguration({environment:"SYNTHETIC",realDataEnabled:false,productionAuthorised:false}));
  assert.throws(()=>assertEnvironmentConfiguration({environment:"SYNTHETIC",realDataEnabled:true,productionAuthorised:false}),/NON_PRODUCTION_CAPABILITY_ACTIVATION_BLOCKED/);
  assert.throws(()=>assertEnvironmentConfiguration({environment:"CERTIFICATION",realDataEnabled:false,productionAuthorised:true}),/NON_PRODUCTION_CAPABILITY_ACTIVATION_BLOCKED/);
  assert.throws(()=>assertEnvironmentConfiguration({environment:"PRODUCTION",realDataEnabled:true,productionAuthorised:false}),/REAL_DATA_REQUIRES_PRODUCTION_AUTHORISATION/);
});

test("S5-G2 ProviderAdapter is versioned and canonical-request preserving",()=>{
  const envelope=adapter.mapRequest(request,syntheticRoute);
  assert.equal(envelope.contractVersion,"sp5-provider-contract-v1");
  assert.equal(envelope.adapterVersion,"a1");
  assert.equal(envelope.mappingVersion,"m1");
  assert.doesNotThrow(()=>assertProviderMappingPreservesCanonicalRequest({request,envelope}));
  assert.throws(()=>assertProviderMappingPreservesCanonicalRequest({request,envelope:{...envelope,canonicalRequestHash:"tampered"}}),/CANONICAL_REQUEST_MISMATCH/);
});

test("S5-G3 live route requires production environment and explicit activation",()=>{
  assert.throws(()=>assertRouteExecutionAllowed({environment:"SYNTHETIC",route:liveActive,realDataEnabled:false}),/ROUTE_MODE_BLOCKED/);
  assert.throws(()=>assertRouteExecutionAllowed({environment:"CERTIFICATION",route:liveActive,realDataEnabled:false}),/LIVE_ROUTE_BLOCKED/);
  assert.throws(()=>assertRouteExecutionAllowed({environment:"PRODUCTION",route:liveInactive,realDataEnabled:false}),/LIVE_ROUTE_ACTIVATION_REQUIRED/);
  assert.doesNotThrow(()=>assertRouteExecutionAllowed({environment:"PRODUCTION",route:liveActive,realDataEnabled:false}));
});

test("S5-G4 secrets cannot be inline and operational text is redacted",()=>{
  assert.doesNotThrow(()=>assertSecretsExternalised({providerEndpoint:"https://invalid.example"}));
  assert.throws(()=>assertSecretsExternalised({PROVIDER_API_KEY:"not-a-real-secret"}),/INLINE_SECRET_FORBIDDEN/);
  const redacted=redactOperationalText("Bearer abc.def.ghi password=hunter2");
  assert.equal(redacted.includes("abc.def.ghi"),false);
  assert.equal(redacted.includes("hunter2"),false);
});
