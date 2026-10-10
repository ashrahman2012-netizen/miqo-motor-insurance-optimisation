// BV-GATE-005 integration readiness analyser (proposal, synthetic only).
// No input from real providers; no persistence, networking or product route.
import {createHash} from "node:crypto";
import {runCandidateEvaluation} from "../../packages/balanced-value/src/gate.mjs";

export const BV5_READINESS_VERSION="BV5-INTEGRATION-READINESS-001";
const required=[
  "source_classification","profile_verified","intent_confirmed",
  "quote_lineage_verified","cover_features_verified",
  "restrictions_verified","pricing_ipt_fees_verified",
  "finance_terms_verified","retention_rights_verified"
];
const digest=obj=>createHash("sha256").update(JSON.stringify(obj)).digest("hex");
export function assessSyntheticIntegration(readiness,request){
  if(process.env.MIQO_DATA_CLASSIFICATION!=="SYNTHETIC" ||
     process.env.MIQO_LIVE_PROVIDERS_ENABLED!=="false"||
     request?.environment!=="SYNTHETIC_ONLY")
    throw new Error("BV5_SYNTHETIC_ONLY");
  const errors=[];
  if(!readiness || typeof readiness!=="object"||Array.isArray(readiness))
    throw new Error("BV5_READINESS_CONTRACT_MISSING");
  for(const k of required)if(!Object.hasOwn(readiness,k))errors.push("MISSING:"+k);
  for(const k of required.filter(x=>x!=="source_classification"))
    if(readiness[k]!==true)errors.push("UNVERIFIED:"+k);
  if(readiness.source_classification!=="SYNTHETIC")errors.push("NON_SYNTHETIC_SOURCE");
  const prohibited=Object.keys(readiness).filter(k=>!required.includes(k));
  for(const k of prohibited)errors.push("UNRECOGNISED_FIELD:"+k);
  const base={
    readinessVersion:BV5_READINESS_VERSION,
    eligibleForInternalUat:errors.length===0,
    reasons:[...new Set(errors)].sort(),
    runtimeConnected:false,publicRouteMounted:false,
    objectiveExecutable:false,seopaConnected:false
  };
  return Object.freeze({...base,readinessFingerprint:digest(base)});
}
export function previewSyntheticIntegration(readiness,request){
  const gate=assessSyntheticIntegration(readiness,request);
  if(!gate.eligibleForInternalUat)return Object.freeze({gate,result:null});
  return Object.freeze({gate,result:runCandidateEvaluation(request,{
    boundedUatAuthority:"BV4_INTERNAL_SYNTHETIC_UAT"
  })});
}
export const REQUIRED_SYNTHETIC_EVIDENCE_KEYS=Object.freeze([...required]);
