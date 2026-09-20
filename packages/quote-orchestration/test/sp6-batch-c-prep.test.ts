import test from "node:test";
import assert from "node:assert/strict";
import {
  UNSET_PROVIDER_REQUIRED,
  assertCredentialUsable,
  assertDistinctEnvironmentBindings,
  assertProviderResiliencePolicyComplete,
  assertRouteModeMatchesBinding,
  bindEnvironment,
  executeCertificationHarness,
  redactProviderOperationalText,
  rotateCredential,
  unresolvedResilienceFields,
  type ProviderCredentialReference,
  type ProviderEndpointReference,
  type ProviderResiliencePolicy,
  type SecretProvider,
} from "../src/sp6-certification-readiness.ts";

const certEndpoint:ProviderEndpointReference={
  providerKey:"PROVIDER-FIXTURE",routeKey:"ROUTE-FIXTURE",environmentClass:"CERTIFICATION",
  endpointReference:"https://cert.invalid.example",approved:true,
};
const prodEndpoint:ProviderEndpointReference={
  providerKey:"PROVIDER-FIXTURE",routeKey:"ROUTE-FIXTURE",environmentClass:"PRODUCTION",
  endpointReference:"https://prod.invalid.example",approved:true,
};
const certCredential:ProviderCredentialReference={
  providerKey:"PROVIDER-FIXTURE",routeKey:"ROUTE-FIXTURE",
  credentialReference:"secret://miqos/certification/provider-fixture/route-fixture",
  credentialScope:"CERTIFICATION",version:1,state:"ACTIVE",
};
const prodCredential:ProviderCredentialReference={
  providerKey:"PROVIDER-FIXTURE",routeKey:"ROUTE-FIXTURE",
  credentialReference:"secret://miqos/production/provider-fixture/route-fixture",
  credentialScope:"PRODUCTION",version:1,state:"ACTIVE",
};
const certBinding=bindEnvironment({endpoint:certEndpoint,credential:certCredential,configurationVersion:"fixture-config-v1"});
const prodBinding=bindEnvironment({endpoint:prodEndpoint,credential:prodCredential,configurationVersion:"fixture-config-v1"});

test("S6-G7 PREP binds certification and production endpoints/credentials independently",()=>{
  assert.equal(assertDistinctEnvironmentBindings(certBinding,prodBinding),true);
  assert.doesNotThrow(()=>assertRouteModeMatchesBinding("CERTIFICATION",certBinding));
  assert.doesNotThrow(()=>assertRouteModeMatchesBinding("LIVE",prodBinding));
  assert.throws(()=>bindEnvironment({endpoint:certEndpoint,credential:prodCredential,configurationVersion:"v1"}),/SCOPE_MISMATCH/);
  assert.throws(()=>assertRouteModeMatchesBinding("LIVE",certBinding),/LIVE_ROUTE_REQUIRES_PRODUCTION_BINDING/);
  assert.throws(()=>assertDistinctEnvironmentBindings(certBinding,{...prodBinding,endpointReference:certBinding.endpointReference}),/ENDPOINT_MUST_DIFFER/);
  assert.throws(()=>assertDistinctEnvironmentBindings(certBinding,{...prodBinding,credentialReference:certBinding.credentialReference}),/CREDENTIAL_MUST_DIFFER/);
});

test("S6-G8 PREP credential lifecycle is externalised versioned rotatable revocable and fail closed",()=>{
  const secrets:SecretProvider={has:ref=>ref===certCredential.credentialReference};
  assert.doesNotThrow(()=>assertCredentialUsable(certCredential,secrets));
  assert.throws(()=>assertCredentialUsable({...certCredential,state:"REVOKED"},secrets),/CREDENTIAL_REVOKED/);
  assert.throws(()=>assertCredentialUsable({...certCredential,state:"EXPIRED"},secrets),/CREDENTIAL_EXPIRED/);
  assert.throws(()=>assertCredentialUsable(certCredential,{has:()=>false}),/CREDENTIAL_UNAVAILABLE/);
  const rotation=rotateCredential(certCredential,"secret://miqos/certification/provider-fixture/route-fixture-v2");
  assert.equal(rotation.previous.state,"REVOKED");
  assert.equal(rotation.replacement.version,2);
  assert.equal(rotation.replacement.state,"ACTIVE");
  assert.notEqual(rotation.replacement.credentialReference,certCredential.credentialReference);
  const redacted=redactProviderOperationalText("Bearer abc.def.ghi password=hunter2");
  assert.equal(redacted.includes("abc.def.ghi"),false);
  assert.equal(redacted.includes("hunter2"),false);
});

test("S6-G9 PREP resilience policy refuses implicit provider defaults",()=>{
  const incomplete:ProviderResiliencePolicy={
    version:"provider-policy-v1",
    requestTimeoutMs:UNSET_PROVIDER_REQUIRED,
    connectTimeoutMs:UNSET_PROVIDER_REQUIRED,
    maxAttempts:UNSET_PROVIDER_REQUIRED,
    retryableStatuses:UNSET_PROVIDER_REQUIRED,
    retryableErrorClasses:UNSET_PROVIDER_REQUIRED,
    backoffPolicy:UNSET_PROVIDER_REQUIRED,
    maxBackoffMs:UNSET_PROVIDER_REQUIRED,
    requestsPerWindow:UNSET_PROVIDER_REQUIRED,
    rateWindowMs:UNSET_PROVIDER_REQUIRED,
    circuitOpenThreshold:UNSET_PROVIDER_REQUIRED,
    circuitResetPeriodMs:UNSET_PROVIDER_REQUIRED,
    idempotencyPolicy:UNSET_PROVIDER_REQUIRED,
  };
  assert.equal(unresolvedResilienceFields(incomplete).length,12);
  assert.throws(()=>assertProviderResiliencePolicyComplete(incomplete),/PROVIDER_RESILIENCE_VALUES_REQUIRED/);
  const complete:ProviderResiliencePolicy={
    ...incomplete,
    requestTimeoutMs:3000,connectTimeoutMs:1000,maxAttempts:3,
    retryableStatuses:[429,500,502,503],retryableErrorClasses:["TIMEOUT","CONNECTION_RESET"],
    backoffPolicy:"EXPONENTIAL",maxBackoffMs:5000,requestsPerWindow:20,rateWindowMs:1000,
    circuitOpenThreshold:3,circuitResetPeriodMs:30000,idempotencyPolicy:"REQUIRED",
  };
  assert.equal(assertProviderResiliencePolicyComplete(complete),true);
});

test("S6-G10 PREP harness distinguishes BLOCKED from FAIL and PASS",()=>{
  const policy:ProviderResiliencePolicy={
    version:"provider-policy-v1",
    requestTimeoutMs:3000,connectTimeoutMs:1000,maxAttempts:3,
    retryableStatuses:[429,500],retryableErrorClasses:["TIMEOUT"],
    backoffPolicy:"EXPONENTIAL",maxBackoffMs:5000,requestsPerWindow:10,rateWindowMs:1000,
    circuitOpenThreshold:3,circuitResetPeriodMs:30000,idempotencyPolicy:"REQUIRED",
  };
  const secrets:SecretProvider={has:ref=>ref===certCredential.credentialReference};
  const base={
    candidateApproved:true,providerAccessGranted:true,certificationContractApproved:true,schemaApproved:true,
    certificationTestPackReference:"PACK-001",endpointBinding:certBinding,credential:certCredential,
    secretProvider:secrets,resiliencePolicy:policy,providerAuthorityAllowsCertification:true,
  } as const;

  const blocked=executeCertificationHarness({...base,providerAccessGranted:false},()=>({passed:true,evidence:{}}));
  assert.equal(blocked.state,"CERTIFICATION_BLOCKED");
  assert.equal(blocked.reason,"PROVIDER_ACCESS_NOT_GRANTED");

  const blockedUnset=executeCertificationHarness({...base,resiliencePolicy:{...policy,requestTimeoutMs:UNSET_PROVIDER_REQUIRED}},()=>({passed:true,evidence:{}}));
  assert.equal(blockedUnset.state,"CERTIFICATION_BLOCKED");
  assert.match(blockedUnset.reason,/PROVIDER_RESILIENCE_VALUES_REQUIRED/);

  const failed=executeCertificationHarness(base,()=>({passed:false,reason:"QUOTE_ASSERTION_FAILED",evidence:{case:"fixture"}}));
  assert.equal(failed.state,"CERTIFICATION_FAIL");
  assert.equal(failed.reason,"QUOTE_ASSERTION_FAILED");

  const passed=executeCertificationHarness(base,()=>({passed:true,evidence:{case:"fixture"}}));
  assert.equal(passed.state,"CERTIFICATION_PASS");
  assert.equal(passed.reason,"CERTIFICATION_TEST_PACK_PASSED");
});
