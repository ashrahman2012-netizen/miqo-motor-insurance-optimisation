// BV-GATE-004 — deliberate non-routable product candidate.
// Not a network API. No registered Fastify/Next.js route. NEVER activates Sprint 4.
import {evaluate,validateDecision,CLASSIFICATION} from "./engine.mjs";
import {buildCandidateExplanation} from "./explanation.mjs";
export const BV4_CANDIDATE_VERSION="BV4-SYNTHETIC-CANDIDATE-v1";
export const BV4_PRODUCT_STATE=Object.freeze({
  integration:"NOT_REGISTERED",executableCustomerObjective:false,
  providerConnectivity:"BLOCKED",customerFacingRoute:false,
  supportsLiveQuotes:false,mergeApproved:false,productionDeployable:false
});
export function assertSyntheticAuthority(input,context){
  if(context?.boundedUatAuthority!=="BV4_INTERNAL_SYNTHETIC_UAT")
    throw new Error("BV4_BOUNDED_UAT_AUTHORITY_REQUIRED");
  if(process.env.MIQO_LIVE_PROVIDERS_ENABLED!=="false"||
     process.env.MIQO_DATA_CLASSIFICATION!=="SYNTHETIC"||
     input?.environment!=="SYNTHETIC_ONLY")
    throw new Error("BV4_SYNTHETIC_ENVIRONMENT_REQUIRED");
  if(process.env.MIQO_SEOPA_LIVE_ENABLED==="true"||
     process.env.SEOPA_API_KEY||process.env.SEOPA_CLIENT_SECRET)
    throw new Error("BV4_PARTNER_ACCESS_FORBIDDEN");
  return true;
}
export function runCandidateEvaluation(input,context){
  assertSyntheticAuthority(input,context);
  const decision=evaluate(input);
  validateDecision(decision);
  if(decision.classification!==CLASSIFICATION)
    throw new Error("BV4_RESULT_CLASSIFICATION_INVALID");
  const explanation=buildCandidateExplanation(input,decision);
  return Object.freeze({
    candidateVersion:BV4_CANDIDATE_VERSION,
    classification:CLASSIFICATION,
    decision,explanation,productState:BV4_PRODUCT_STATE
  });
}
