import {redactOperationalText} from "./sp5-production-boundary.ts";

export const SP6_CERTIFICATION_READINESS_VERSION="sp6-certification-readiness-v1" as const;
export const UNSET_PROVIDER_REQUIRED="UNSET_PROVIDER_REQUIRED" as const;

export type ProviderEnvironmentClass="CERTIFICATION"|"PRODUCTION";
export type CredentialScope="CERTIFICATION"|"PRODUCTION";
export type RouteExecutionMode="CERTIFICATION"|"LIVE";

export type ProviderEndpointReference=Readonly<{
  providerKey:string;
  routeKey:string;
  environmentClass:ProviderEnvironmentClass;
  endpointReference:string;
  approved:boolean;
}>;

export type ProviderCredentialReference=Readonly<{
  providerKey:string;
  routeKey:string;
  credentialReference:string;
  credentialScope:CredentialScope;
  version:number;
  state:"ACTIVE"|"REVOKED"|"EXPIRED";
}>;

export type EnvironmentBinding=Readonly<{
  version:typeof SP6_CERTIFICATION_READINESS_VERSION;
  providerKey:string;
  routeKey:string;
  environmentClass:ProviderEnvironmentClass;
  endpointReference:string;
  credentialReference:string;
  credentialScope:CredentialScope;
  configurationVersion:string;
}>;

function nonBlank(value:string,error:string){
  if(!value.trim())throw new Error(error);
}

export function assertCredentialReferenceFormat(ref:string){
  nonBlank(ref,"CREDENTIAL_REFERENCE_REQUIRED");
  if(!ref.startsWith("secret://"))throw new Error("CREDENTIAL_REFERENCE_MUST_BE_EXTERNAL");
  if(/(password|token|api[_-]?key)[ \\t]*[:=]/i.test(ref))throw new Error("CREDENTIAL_VALUE_FORBIDDEN");
}

export function bindEnvironment(args:Readonly<{
  endpoint:ProviderEndpointReference;
  credential:ProviderCredentialReference;
  configurationVersion:string;
}>):EnvironmentBinding{
  const {endpoint,credential}=args;
  nonBlank(args.configurationVersion,"ENVIRONMENT_CONFIGURATION_VERSION_REQUIRED");
  nonBlank(endpoint.endpointReference,"PROVIDER_ENDPOINT_REFERENCE_REQUIRED");
  assertCredentialReferenceFormat(credential.credentialReference);
  if(!endpoint.approved)throw new Error("PROVIDER_ENDPOINT_NOT_APPROVED");
  if(endpoint.providerKey!==credential.providerKey||endpoint.routeKey!==credential.routeKey)throw new Error("ENVIRONMENT_BINDING_PROVIDER_ROUTE_MISMATCH");
  if(endpoint.environmentClass!==credential.credentialScope)throw new Error("ENVIRONMENT_CREDENTIAL_SCOPE_MISMATCH");
  if(credential.state!=="ACTIVE")throw new Error("CREDENTIAL_NOT_ACTIVE");
  return Object.freeze({
    version:SP6_CERTIFICATION_READINESS_VERSION,
    providerKey:endpoint.providerKey,
    routeKey:endpoint.routeKey,
    environmentClass:endpoint.environmentClass,
    endpointReference:endpoint.endpointReference,
    credentialReference:credential.credentialReference,
    credentialScope:credential.credentialScope,
    configurationVersion:args.configurationVersion,
  });
}

export function assertDistinctEnvironmentBindings(certification:EnvironmentBinding,production:EnvironmentBinding){
  if(certification.environmentClass!=="CERTIFICATION"||production.environmentClass!=="PRODUCTION")throw new Error("ENVIRONMENT_BINDING_CLASSIFICATION_INVALID");
  if(certification.providerKey!==production.providerKey||certification.routeKey!==production.routeKey)throw new Error("ENVIRONMENT_BINDING_PROVIDER_ROUTE_MISMATCH");
  if(certification.endpointReference===production.endpointReference)throw new Error("CERTIFICATION_PRODUCTION_ENDPOINT_MUST_DIFFER");
  if(certification.credentialReference===production.credentialReference)throw new Error("CERTIFICATION_PRODUCTION_CREDENTIAL_MUST_DIFFER");
  return true;
}

export function assertRouteModeMatchesBinding(mode:RouteExecutionMode,binding:EnvironmentBinding){
  if(mode==="LIVE"&&binding.environmentClass!=="PRODUCTION")throw new Error("LIVE_ROUTE_REQUIRES_PRODUCTION_BINDING");
  if(mode==="CERTIFICATION"&&binding.environmentClass!=="CERTIFICATION")throw new Error("CERTIFICATION_ROUTE_REQUIRES_CERTIFICATION_BINDING");
}

export interface SecretProvider {
  has(reference:string):boolean;
}

export function assertCredentialUsable(credential:ProviderCredentialReference,secrets:SecretProvider){
  assertCredentialReferenceFormat(credential.credentialReference);
  if(credential.state==="REVOKED")throw new Error("CREDENTIAL_REVOKED");
  if(credential.state==="EXPIRED")throw new Error("CREDENTIAL_EXPIRED");
  if(!secrets.has(credential.credentialReference))throw new Error("CREDENTIAL_UNAVAILABLE");
}

export function rotateCredential(
  current:ProviderCredentialReference,
  replacementReference:string,
):Readonly<{previous:ProviderCredentialReference;replacement:ProviderCredentialReference}>{
  if(current.state!=="ACTIVE")throw new Error("CREDENTIAL_ROTATION_REQUIRES_ACTIVE_CURRENT");
  assertCredentialReferenceFormat(replacementReference);
  if(replacementReference===current.credentialReference)throw new Error("CREDENTIAL_ROTATION_REFERENCE_MUST_CHANGE");
  return Object.freeze({
    previous:Object.freeze({...current,state:"REVOKED" as const}),
    replacement:Object.freeze({
      ...current,
      credentialReference:replacementReference,
      version:current.version+1,
      state:"ACTIVE" as const,
    }),
  });
}

export function redactProviderOperationalText(value:string){
  return redactOperationalText(value);
}

export type ProviderRequired<T>=T|typeof UNSET_PROVIDER_REQUIRED;

export type ProviderResiliencePolicy=Readonly<{
  version:string;
  requestTimeoutMs:ProviderRequired<number>;
  connectTimeoutMs:ProviderRequired<number>;
  maxAttempts:ProviderRequired<number>;
  retryableStatuses:ProviderRequired<ReadonlyArray<number>>;
  retryableErrorClasses:ProviderRequired<ReadonlyArray<string>>;
  backoffPolicy:ProviderRequired<"FIXED"|"LINEAR"|"EXPONENTIAL">;
  maxBackoffMs:ProviderRequired<number>;
  requestsPerWindow:ProviderRequired<number>;
  rateWindowMs:ProviderRequired<number>;
  circuitOpenThreshold:ProviderRequired<number>;
  circuitResetPeriodMs:ProviderRequired<number>;
  idempotencyPolicy:ProviderRequired<"REQUIRED"|"SUPPORTED"|"NOT_SUPPORTED">;
}>;

export function unresolvedResilienceFields(policy:ProviderResiliencePolicy){
  const unresolved:string[]=[];
  for(const [key,value] of Object.entries(policy)){
    if(key==="version")continue;
    if(value===UNSET_PROVIDER_REQUIRED)unresolved.push(key);
  }
  return Object.freeze(unresolved.sort());
}

export function assertProviderResiliencePolicyComplete(policy:ProviderResiliencePolicy){
  nonBlank(policy.version,"PROVIDER_RESILIENCE_VERSION_REQUIRED");
  const unresolved=unresolvedResilienceFields(policy);
  if(unresolved.length)throw new Error("PROVIDER_RESILIENCE_VALUES_REQUIRED:"+unresolved.join(","));
  const timeout=policy.requestTimeoutMs as number;
  const connect=policy.connectTimeoutMs as number;
  const attempts=policy.maxAttempts as number;
  const maxBackoff=policy.maxBackoffMs as number;
  const perWindow=policy.requestsPerWindow as number;
  const windowMs=policy.rateWindowMs as number;
  const threshold=policy.circuitOpenThreshold as number;
  const resetMs=policy.circuitResetPeriodMs as number;
  if(timeout<1||connect<1||connect>timeout)throw new Error("PROVIDER_RESILIENCE_TIMEOUT_INVALID");
  if(attempts<1||attempts>10)throw new Error("PROVIDER_RESILIENCE_ATTEMPTS_INVALID");
  if(maxBackoff<0||perWindow<1||windowMs<1||threshold<1||resetMs<1)throw new Error("PROVIDER_RESILIENCE_BOUNDS_INVALID");
  return true;
}

export type CertificationPrerequisites=Readonly<{
  candidateApproved:boolean;
  providerAccessGranted:boolean;
  certificationContractApproved:boolean;
  schemaApproved:boolean;
  certificationTestPackReference:string|typeof UNSET_PROVIDER_REQUIRED;
  endpointBinding?:EnvironmentBinding;
  credential?:ProviderCredentialReference;
  secretProvider?:SecretProvider;
  resiliencePolicy?:ProviderResiliencePolicy;
  providerAuthorityAllowsCertification:boolean;
}>;

export type CertificationRunResult=Readonly<{
  state:"CERTIFICATION_PASS"|"CERTIFICATION_FAIL"|"CERTIFICATION_BLOCKED";
  reason:string;
  evidence?:Readonly<Record<string,unknown>>;
}>;

function blocked(reason:string):CertificationRunResult{
  return Object.freeze({state:"CERTIFICATION_BLOCKED",reason});
}

export function executeCertificationHarness(
  prerequisites:CertificationPrerequisites,
  execute:()=>Readonly<{passed:boolean;evidence:Readonly<Record<string,unknown>>;reason?:string}>,
):CertificationRunResult{
  if(!prerequisites.candidateApproved)return blocked("PROVIDER_CANDIDATE_NOT_APPROVED");
  if(!prerequisites.providerAccessGranted)return blocked("PROVIDER_ACCESS_NOT_GRANTED");
  if(!prerequisites.providerAuthorityAllowsCertification)return blocked("PROVIDER_AUTHORITY_RESTRICTS_CERTIFICATION");
  if(!prerequisites.certificationContractApproved)return blocked("CERTIFICATION_CONTRACT_NOT_APPROVED");
  if(!prerequisites.schemaApproved)return blocked("CERTIFICATION_SCHEMA_NOT_APPROVED");
  if(prerequisites.certificationTestPackReference===UNSET_PROVIDER_REQUIRED||!prerequisites.certificationTestPackReference.trim())return blocked("CERTIFICATION_TEST_PACK_MISSING");
  if(!prerequisites.endpointBinding)return blocked("CERTIFICATION_ENDPOINT_BINDING_MISSING");
  if(prerequisites.endpointBinding.environmentClass!=="CERTIFICATION")return blocked("CERTIFICATION_ENDPOINT_BINDING_INVALID");
  if(!prerequisites.credential||!prerequisites.secretProvider)return blocked("CERTIFICATION_CREDENTIAL_UNAVAILABLE");
  try{
    assertCredentialUsable(prerequisites.credential,prerequisites.secretProvider);
  }catch(error){
    return blocked(String((error as Error).message));
  }
  if(!prerequisites.resiliencePolicy)return blocked("PROVIDER_RESILIENCE_POLICY_MISSING");
  try{
    assertProviderResiliencePolicyComplete(prerequisites.resiliencePolicy);
  }catch(error){
    return blocked(String((error as Error).message));
  }
  try{
    const result=execute();
    return Object.freeze({
      state:result.passed?"CERTIFICATION_PASS":"CERTIFICATION_FAIL",
      reason:result.passed?"CERTIFICATION_TEST_PACK_PASSED":result.reason??"CERTIFICATION_TEST_ASSERTION_FAILED",
      evidence:Object.freeze({...result.evidence}),
    });
  }catch(error){
    return Object.freeze({
      state:"CERTIFICATION_FAIL",
      reason:"CERTIFICATION_EXECUTION_ERROR:"+String((error as Error).message),
    });
  }
}
