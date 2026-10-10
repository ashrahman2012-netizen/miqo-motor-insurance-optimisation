// Generate BV4 synthetic-only candidate comparison, copy and release blockers.
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {runCandidateEvaluation} from "../../packages/balanced-value/src/gate.mjs";
import {syntheticRequest} from "../bv-gate-003/fixtures.mjs";
const out=join(dirname(fileURLToPath(import.meta.url)),"artifacts");
await mkdir(out,{recursive:true});
const result=runCandidateEvaluation(syntheticRequest(),{
  boundedUatAuthority:"BV4_INTERNAL_SYNTHETIC_UAT"
});
const receipt={
  gateway:"BV-GATE-004",
  branchClassification:"ISOLATED_PRODUCT_CANDIDATE",
  source:"FULLY_SYNTHETIC_NOT_A_PROVIDER_API",
  candidateVersion:result.candidateVersion,
  selectionRule:result.decision.rule_version,
  explanationRule:result.explanation.explanationRuleVersion,
  selectedQuote:result.decision.selected_quote_id,
  selectedPriceGBP:result.decision.selected_total_payable_pence/100,
  selectedExcessGBP:result.decision.selected_total_excess_pence/100,
  cheapestQuote:result.decision.absolute_cheapest_eligible_quote_id,
  cheapestPriceGBP:result.decision.cheapest_total_payable_pence/100,
  cheapestExcessGBP:result.decision.cheapest_total_excess_pence/100,
  decisionFingerprint:result.decision.result_fingerprint,
  explanationFingerprint:result.explanation.explanationFingerprint,
  objectiveExecutable:false,productionApiRegistered:false,
  seopaLiveConnectivity:false,insurerQuoteRequests:0,
  bindingEnabled:false,customerPaymentsEnabled:false,
  consumerFacingApproved:false,regulatorySignedOff:false,
  branchMergeApproved:false,
  disposition:"CANDIDATE_SYNTHETIC_UAT_ONLY"
};
for(const [name,obj] of Object.entries({
  "BV4-01-CandidateDecision":result.decision,
  "BV4-02-CustomerExplanation":result.explanation,
  "BV4-03-CandidateReceipt":receipt
})){
  await writeFile(join(out,name+".json"),JSON.stringify(obj,null,2)+"\n");
}
console.log(JSON.stringify(receipt,null,2));
