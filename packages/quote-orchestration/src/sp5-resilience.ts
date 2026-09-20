import {createHash} from "node:crypto";

export const PROVIDER_RESILIENCE_POLICY_VERSION="sp5-resilience-v1" as const;
export type CircuitState="CLOSED"|"OPEN"|"HALF_OPEN";

export type ResiliencePolicy=Readonly<{
  version:typeof PROVIDER_RESILIENCE_POLICY_VERSION;
  timeoutMs:number;
  maxAttempts:number;
  retryDelayMs:number;
  maxRequestsPerWindow:number;
  rateWindowMs:number;
  circuitFailureThreshold:number;
}>;

export const DEFAULT_RESILIENCE_POLICY:ResiliencePolicy=Object.freeze({
  version:PROVIDER_RESILIENCE_POLICY_VERSION,
  timeoutMs:2500,
  maxAttempts:3,
  retryDelayMs:100,
  maxRequestsPerWindow:20,
  rateWindowMs:1000,
  circuitFailureThreshold:3,
});

export function assertBoundedPolicy(policy:ResiliencePolicy){
  if(policy.timeoutMs<1||policy.timeoutMs>10000)throw new Error("RESILIENCE_TIMEOUT_OUT_OF_BOUNDS");
  if(policy.maxAttempts<1||policy.maxAttempts>5)throw new Error("RESILIENCE_ATTEMPTS_OUT_OF_BOUNDS");
  if(policy.retryDelayMs<0||policy.retryDelayMs>5000)throw new Error("RESILIENCE_RETRY_DELAY_OUT_OF_BOUNDS");
  if(policy.maxRequestsPerWindow<1||policy.rateWindowMs<1)throw new Error("RESILIENCE_RATE_LIMIT_INVALID");
  if(policy.circuitFailureThreshold<1)throw new Error("RESILIENCE_CIRCUIT_THRESHOLD_INVALID");
}

export function deterministicRetrySchedule(policy:ResiliencePolicy){
  assertBoundedPolicy(policy);
  return Object.freeze(Array.from({length:policy.maxAttempts-1},(_,i)=>policy.retryDelayMs*(i+1)));
}

export class IdempotencyLedger<T>{
  #entries=new Map<string,Readonly<{requestHash:string;result:T}>>();
  execute(key:string,request:unknown,operation:()=>T):Readonly<{replayed:boolean;result:T}>{
    const requestHash=hash(request);
    const existing=this.#entries.get(key);
    if(existing){
      if(existing.requestHash!==requestHash)throw new Error("IDEMPOTENCY_KEY_PAYLOAD_CONFLICT");
      return Object.freeze({replayed:true,result:existing.result});
    }
    const result=operation();
    this.#entries.set(key,Object.freeze({requestHash,result}));
    return Object.freeze({replayed:false,result});
  }
}

export type RawProviderEvidence=Readonly<{
  evidenceId:string;
  requestId:string;
  requestHash:string;
  routeKey:string;
  providerKey:string;
  adapterVersion:string;
  mappingVersion:string;
  responseHash:string;
  capturedAt:string;
  rawResponse:Readonly<Record<string,unknown>>;
}>;

export class ImmutableEvidenceStore{
  #records=new Map<string,RawProviderEvidence>();
  append(record:RawProviderEvidence){
    if(this.#records.has(record.evidenceId))throw new Error("RAW_EVIDENCE_IMMUTABLE");
    const frozen=deepFreeze({...record,rawResponse:{...record.rawResponse}}) as RawProviderEvidence;
    this.#records.set(record.evidenceId,frozen);
    return frozen;
  }
  get(evidenceId:string){return this.#records.get(evidenceId);}
  export(){return Object.freeze([...this.#records.values()]);}
  static restore(records:ReadonlyArray<RawProviderEvidence>){
    const store=new ImmutableEvidenceStore();
    for(const record of records)store.append(record);
    return store;
  }
}

export function makeRawEvidence(args:Omit<RawProviderEvidence,"responseHash">):RawProviderEvidence{
  return Object.freeze({...args,responseHash:hash(args.rawResponse)});
}

export function assertEvidenceIntegrity(record:RawProviderEvidence){
  if(record.responseHash!==hash(record.rawResponse))throw new Error("RAW_EVIDENCE_HASH_MISMATCH");
  for(const field of [record.requestId,record.requestHash,record.routeKey,record.providerKey,record.adapterVersion,record.mappingVersion]){
    if(!field.trim())throw new Error("RAW_EVIDENCE_CORRELATION_INCOMPLETE");
  }
}

export function recommendationInputFromProviderResults<T extends {routeKey:string;status:"SUCCESS"|"OUTAGE";quote?:unknown}>(results:ReadonlyArray<T>){
  return Object.freeze(results.filter(r=>r.status==="SUCCESS"&&r.quote!==undefined).map(r=>Object.freeze({routeKey:r.routeKey,quote:r.quote})));
}

export function nextCircuitState(args:{state:CircuitState;consecutiveFailures:number;policy:ResiliencePolicy;probeSucceeded?:boolean}):CircuitState{
  if(args.state==="HALF_OPEN")return args.probeSucceeded?"CLOSED":"OPEN";
  if(args.state==="OPEN")return "OPEN";
  return args.consecutiveFailures>=args.policy.circuitFailureThreshold?"OPEN":"CLOSED";
}

function hash(value:unknown){return createHash("sha256").update(stable(value)).digest("hex");}
function stable(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
  const r=value as Record<string,unknown>;
  return `{${Object.keys(r).sort().map(k=>JSON.stringify(k)+":"+stable(r[k])).join(",")}}`;
}
function deepFreeze(value:unknown):unknown{
  if(value&&typeof value==="object"){
    for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
