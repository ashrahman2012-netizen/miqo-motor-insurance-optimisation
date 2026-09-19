import {createHash} from "node:crypto";

export const SP5_PROVIDER_CONTRACT_VERSION="sp5-provider-contract-v1" as const;
export const SP5_ENVIRONMENT_POLICY_VERSION="sp5-environment-policy-v1" as const;

export type EnvironmentClass="SYNTHETIC"|"CERTIFICATION"|"PRODUCTION";
export type RouteMode="SYNTHETIC"|"CERTIFICATION"|"LIVE";
export type ProviderChannel="DIRECT_INSURER"|"AUTHORISED_INTERMEDIARY";

export type MarketRoute=Readonly<{
  routeKey:string;
  providerKey:string;
  channel:ProviderChannel;
  mode:RouteMode;
  adapterVersion:string;
  mappingVersion:string;
  activationReference?:string;
}>;

export type CanonicalQuoteRequest=Readonly<{
  requestId:string;
  riskProfileVersionId:string;
  scenarioId:string;
  facts:Readonly<Record<string,unknown>>;
  options:Readonly<Record<string,unknown>>;
}>;

export type ProviderRequestEnvelope=Readonly<{
  contractVersion:typeof SP5_PROVIDER_CONTRACT_VERSION;
  routeKey:string;
  providerKey:string;
  adapterVersion:string;
  mappingVersion:string;
  canonicalRequestHash:string;
  payload:Readonly<Record<string,unknown>>;
}>;

export interface ProviderAdapter {
  readonly providerKey:string;
  readonly adapterVersion:string;
  readonly mappingVersion:string;
  mapRequest(request:CanonicalQuoteRequest,route:MarketRoute):ProviderRequestEnvelope;
}

function stable(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
  const record=value as Record<string,unknown>;
  return `{${Object.keys(record).sort().map(k=>JSON.stringify(k)+":"+stable(record[k])).join(",")}}`;
}

export function canonicalRequestHash(request:CanonicalQuoteRequest){
  return createHash("sha256").update(stable(request)).digest("hex");
}

export function assertProviderMappingPreservesCanonicalRequest(args:{request:CanonicalQuoteRequest;envelope:ProviderRequestEnvelope}){
  if(args.envelope.canonicalRequestHash!==canonicalRequestHash(args.request)){
    throw new Error("PROVIDER_MAPPING_CANONICAL_REQUEST_MISMATCH");
  }
}

export function assertRouteExecutionAllowed(args:{
  environment:EnvironmentClass;
  route:MarketRoute;
  realDataEnabled:boolean;
}){
  const {environment,route,realDataEnabled}=args;
  if(environment==="SYNTHETIC"){
    if(route.mode!=="SYNTHETIC")throw new Error("ROUTE_MODE_BLOCKED_IN_SYNTHETIC");
    if(realDataEnabled)throw new Error("REAL_DATA_BLOCKED_IN_SYNTHETIC");
    return;
  }
  if(environment==="CERTIFICATION"){
    if(route.mode==="LIVE")throw new Error("LIVE_ROUTE_BLOCKED_IN_CERTIFICATION");
    if(realDataEnabled)throw new Error("REAL_DATA_BLOCKED_IN_CERTIFICATION");
    return;
  }
  if(route.mode!=="LIVE")return;
  if(!route.activationReference?.trim())throw new Error("LIVE_ROUTE_ACTIVATION_REQUIRED");
}

export function assertEnvironmentConfiguration(args:{
  environment:EnvironmentClass;
  realDataEnabled:boolean;
  productionAuthorised:boolean;
}){
  if(args.environment!=="PRODUCTION"&&(args.realDataEnabled||args.productionAuthorised)){
    throw new Error("NON_PRODUCTION_CAPABILITY_ACTIVATION_BLOCKED");
  }
  if(args.environment==="PRODUCTION"&&args.realDataEnabled&&!args.productionAuthorised){
    throw new Error("REAL_DATA_REQUIRES_PRODUCTION_AUTHORISATION");
  }
}

const SECRET_NAME=/(_?TOKEN|_?SECRET|_?PASSWORD|_?API_?KEY|_?PRIVATE_?KEY|_?CREDENTIAL)$/i;
const SENSITIVE_TEXT=/(bearer\s+[a-z0-9._-]+|api[_-]?key\s*[:=]\s*\S+|password\s*[:=]\s*\S+)/ig;

export function assertSecretsExternalised(config:Readonly<Record<string,unknown>>){
  for(const [key,value] of Object.entries(config)){
    if(SECRET_NAME.test(key)&&typeof value==="string"&&value.trim()){
      throw new Error("INLINE_SECRET_FORBIDDEN:"+key);
    }
  }
}

export function redactOperationalText(value:string){
  return value.replace(SENSITIVE_TEXT,"[REDACTED]");
}
