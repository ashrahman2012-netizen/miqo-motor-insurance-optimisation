// Run from repository root: node --experimental-strip-types scripts/seopa-txn-001/run.mjs
// All generated artifacts are synthetic and must never be uploaded to a real partner.
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {dirname} from "node:path";
import {executeSyntheticUat} from "./engine.mjs";

const data=executeSyntheticUat();
const outputDir=join(dirname(fileURLToPath(import.meta.url)),"artifacts");
await mkdir(outputDir,{recursive:true});
for(const [key,value] of Object.entries(data)){
  const output=join(outputDir,key+".json");
  await writeFile(output,JSON.stringify(value,null,2)+"\n","utf8");
}
const r=data.T07_RecommendationSet;
const summary={
  status:"SYNTHETIC_UAT_LOCAL_EXECUTION_ONLY",
  scenario_requests:data.T04_SEOPAQuoteRequests.length,
  quote_envelopes:data.T05_RawQuoteResponses.length,
  normalised_quotes:data.T06_NormalisedQuotes.length,
  recommended:r.recommended_quote_id,
  recommended_annual_premium_gbp:r.annual_premium_pence/100,
  cheapest:r.cheapest_quote_id,
  cheapest_annual_premium_gbp:r.cheapest_premium_pence/100,
  savings_vs_baseline_pct:r.savings_vs_baseline_pct,
  provisional:true,
  actual_seopa_connectivity:"NOT_TESTED",
  live_handoff:"BLOCKED"
};
console.log(JSON.stringify(summary,null,2));
