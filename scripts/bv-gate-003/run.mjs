// Synthetic receipts only; no network, no insurer, no SEOPA integration.
import {mkdir,writeFile} from "node:fs/promises";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {evaluate,assertSchema,validateDecision} from "./reference.mjs";
import {syntheticRequest} from "./fixtures.mjs";
const out=join(dirname(fileURLToPath(import.meta.url)),"artifacts");
await mkdir(out,{recursive:true});
const request=syntheticRequest();
assertSchema(request);
const result=evaluate(request);
validateDecision(result);
const metadata={
  gate:"BV-GATE-003",
  spec:"MIQO-BV-SPEC-001-v1.0",
  rule_version:result.rule_version,
  selection_result:result.status,
  request_quote_count:request.quotes.length,
  selected:result.selected_quote_id,
  selected_total_payable_gbp:result.selected_total_payable_pence/100,
  selected_total_excess_gbp:result.selected_total_excess_pence/100,
  cheapest:result.absolute_cheapest_eligible_quote_id,
  cheapest_total_payable_gbp:result.cheapest_total_payable_pence/100,
  cheapest_total_excess_gbp:result.cheapest_total_excess_pence/100,
  synthetic_only:true,
  partner_calls:0,
  real_quote_requests:0,
  product_objective_activated:false,
  provider_handoff:"BLOCKED",
  live_purchase:false,
  status:"SYNTHETIC_CONTRACT_PROTOTYPE_ONLY"
};
for(const [name,payload] of Object.entries({
  BV01_SelectionRequest:request,BV02_SelectionResult:result,
  BV03_ExecutionReceipt:metadata
})){
  await writeFile(join(out,name+".json"),JSON.stringify(payload,null,2)+"\n","utf8");
}
console.log(JSON.stringify(metadata,null,2));
