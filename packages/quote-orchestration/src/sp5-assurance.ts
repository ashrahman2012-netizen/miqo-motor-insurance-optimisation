import {createHash} from "node:crypto";
import {analyseSprint4Recommendations,type Sprint4RecommendationQuote,type Sprint4ObjectiveId} from "../../comparison/src/index.ts";
import {redactOperationalText} from "./sp5-production-boundary.ts";

export const SP5_ASSURANCE_VERSION="sp5-assurance-v1" as const;
export const SP5_INCIDENT_RUNBOOK_VERSION="MIQO-SP5-PROVIDER-INCIDENT-RUNBOOK-001-v1" as const;

export type CommercialTerms=Readonly<Record<string,Readonly<{
  commissionPence:number;
  referralFeePence:number;
  miqoMarginPence:number;
}>>>;

export function recommendationWithCommercialSeparation(args:Readonly<{
  objectiveId:Sprint4ObjectiveId;
  objectiveVersion:string;
  catalogueVersion:string;
  policyFingerprint:string;
  explorationFingerprint:string;
  quotes:ReadonlyArray<Sprint4RecommendationQuote>;
  commercialTerms:CommercialTerms;
}>){
  void args.commercialTerms;
  return analyseSprint4Recommendations({
    objectiveId:args.objectiveId,
    objectiveVersion:args.objectiveVersion,
    catalogueVersion:args.catalogueVersion,
    policyFingerprint:args.policyFingerprint,
    explorationFingerprint:args.explorationFingerprint,
    quotes:args.quotes,
  });
}

export type ProvenanceTrace=Readonly<{
  recommendationSetId:string;
  recommendationFingerprint:string;
  explanationFingerprint:string;
  objectiveId:string;
  objectiveVersion:string;
  normalisedQuoteId:string;
  rawEvidenceId:string;
  quoteRequestId:string;
  scenarioId:string;
  marketRouteId:string;
  routeKey:string;
  providerKey:string;
  adapterVersion:string;
  mappingVersion:string;
}>;

function stable(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
  const r=value as Record<string,unknown>;
  return "{"+Object.keys(r).sort().map(k=>JSON.stringify(k)+":"+stable(r[k])).join(",")+"}";
}
function sha(value:unknown){return createHash("sha256").update(stable(value)).digest("hex");}

export function buildProvenanceEnvelope(trace:ProvenanceTrace){
  const required=[
    trace.recommendationSetId,trace.recommendationFingerprint,trace.explanationFingerprint,
    trace.objectiveId,trace.objectiveVersion,trace.normalisedQuoteId,trace.rawEvidenceId,
    trace.quoteRequestId,trace.scenarioId,trace.marketRouteId,trace.routeKey,trace.providerKey,
    trace.adapterVersion,trace.mappingVersion,
  ];
  if(required.some(v=>!v.trim()))throw new Error("PROVENANCE_TRACE_INCOMPLETE");
  return Object.freeze({version:SP5_ASSURANCE_VERSION,trace:Object.freeze({...trace}),traceFingerprint:sha(trace)});
}
export function assertProvenanceEnvelope(envelope:Readonly<{trace:ProvenanceTrace;traceFingerprint:string}>){
  if(sha(envelope.trace)!==envelope.traceFingerprint)throw new Error("PROVENANCE_TRACE_TAMPERED");
}

export type OperationalEvent=Readonly<{
  assuranceVersion:typeof SP5_ASSURANCE_VERSION;
  correlationId:string;
  eventType:string;
  status:"OK"|"DEGRADED"|"FAILED"|"RECOVERED";
  detail:string;
  dimensions:Readonly<Record<string,string>>;
  decisionEvidence:false;
}>;

const SENSITIVE_DIMENSION=/(name|email|phone|postcode|address|dob|password|token|secret|api.?key)/i;
export function buildOperationalEvent(args:Readonly<{
  correlationId:string; eventType:string; status:OperationalEvent["status"]; detail:string;
  dimensions?:Readonly<Record<string,string>>;
}>):OperationalEvent{
  if(!args.correlationId.trim())throw new Error("OBSERVABILITY_CORRELATION_REQUIRED");
  const dimensions=args.dimensions??{};
  for(const key of Object.keys(dimensions))if(SENSITIVE_DIMENSION.test(key))throw new Error("OBSERVABILITY_SENSITIVE_DIMENSION_FORBIDDEN:"+key);
  return Object.freeze({
    assuranceVersion:SP5_ASSURANCE_VERSION,
    correlationId:args.correlationId,
    eventType:args.eventType,
    status:args.status,
    detail:redactOperationalText(args.detail),
    dimensions:Object.freeze({...dimensions}),
    decisionEvidence:false as const,
  });
}

export type IncidentExercise=Readonly<{
  exerciseId:string;
  runbookVersion:typeof SP5_INCIDENT_RUNBOOK_VERSION;
  incidentType:"PROVIDER_OUTAGE"|"PROVIDER_BAD_RESPONSE"|"REPLAY_REQUIRED";
  affectedRequestIds:ReadonlyArray<string>;
  replayKeys:ReadonlyArray<string>;
  detected:boolean;
  isolated:boolean;
  recovered:boolean;
  replayVerified:boolean;
  recommendationIntegrityVerified:boolean;
}>;

export function certifyIncidentExercise(x:IncidentExercise){
  if(!x.exerciseId.trim()||x.affectedRequestIds.length===0)throw new Error("INCIDENT_EVIDENCE_INCOMPLETE");
  if(!x.detected||!x.isolated)throw new Error("INCIDENT_NOT_CONTAINED");
  if(!x.recovered)throw new Error("INCIDENT_NOT_RECOVERED");
  if(!x.replayVerified)throw new Error("INCIDENT_REPLAY_NOT_VERIFIED");
  if(!x.recommendationIntegrityVerified)throw new Error("INCIDENT_RECOMMENDATION_INTEGRITY_UNVERIFIED");
  return Object.freeze({...x,certificationFingerprint:sha(x)});
}
