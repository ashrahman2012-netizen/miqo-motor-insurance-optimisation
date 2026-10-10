// BV-GATE-003 — PROPOSED synthetic-only customer-constrained selector.
// NOT the deployed MIQOS Sprint 4 recommendation engine, not SEOPA's API.
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {compareNormalisedQuotes} from "../../packages/comparison/src/index.ts";

export const CONTRACT_VERSION="MIQO-BV-001-v1.0";
export const RULE_VERSION="BV-RULE-001-v1.0";
export const CLASSIFICATION="SYNTHETIC_DEMO_ONLY";
const schema=JSON.parse(readFileSync(fileURLToPath(new URL("../../contracts/balanced-value/contract.schema.json",import.meta.url)),"utf8"));
const ajv=new Ajv2020({allErrors:true,strict:true});
addFormats(ajv);
const validate=ajv.compile(schema);
const fail=(message)=>{throw new Error(message);};
const digest=x=>createHash("sha256").update(x).digest("hex");
const money=n=>Number.isSafeInteger(n)&&n>=0;
const coverageKeys=["courtesy_car","windscreen","legal_expenses","breakdown","personal_accident"];
export function stable(value) {
  if(Array.isArray(value))return value.map(stable);
  if(value && typeof value==="object"){
    return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  }
  return value;
}
export const fingerprint=value=>digest(JSON.stringify(stable(value)));
export function assertSchema(data) {
  if(!validate(data))fail("BV_CONTRACT_SCHEMA_INVALID:"+
    ajv.errorsText(validate.errors,{separator:"|"}));
  return true;
}
function sameSet(a,b){return Array.isArray(a)&&Array.isArray(b)&&
  a.length===b.length&&a.every(x=>b.includes(x));}
function validDate(date){
  if(typeof date!=="string"||!/^(\d{4})-(\d{2})-(\d{2})$/.test(date))return false;
  const d=new Date(date+"T00:00:00Z");
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===date;
}
function notApplicableReason(q,req,clockMs) {
  const codes=[];
  const profile=req.locked_profile,opts=req.preferences,scenario=q.scenario;
  if(q.profile_id!==profile.profile_id||q.profile_version!==profile.version||
    q.facts_sha256!==profile.facts_sha256)codes.push("E-01_PROFILE_LINEAGE");
  if(!q.provider_alias.trim()||!q.route_key.trim()||!q.scenario_id.trim()||
    !q.provenance_verified||!q.quotation_permission||
    Date.parse(q.issued_at)>clockMs||Date.parse(q.valid_until)<=clockMs||
    Date.parse(q.issued_at)>=Date.parse(q.valid_until))codes.push("E-02_PROVENANCE_OR_EXPIRY");
  if(q.policy_type!=="COMPREHENSIVE"||!q.cover_features_verified||!q.restrictions_verified||
    coverageKeys.some(k=>typeof q.benefits[k]!=="boolean")||
    coverageKeys.some(k=>q.benefits[k]!==opts.coverage_baseline[k])||
    opts.required_benefits.some(k=>q.benefits[k]!==true))codes.push("E-03_COVERAGE_PARITY_UNVERIFIED");
  const price=q.price,ex=q.excess;
  if(!price.mandatory_fees_ipt_included||
    ![price.annual_cash_premium_pence,price.total_payable_pence,
      price.finance_cost_pence,ex.compulsory_pence,ex.voluntary_pence].every(money)||
    price.total_payable_pence!==price.annual_cash_premium_pence+price.finance_cost_pence)
    codes.push("E-04_MONEY_INCOMPLETE");
  const annual = price.payment_mode==="ANNUAL";
  if(annual?
    (price.finance_cost_pence!==0||price.total_payable_pence!==price.annual_cash_premium_pence||
     price.deposit_pence!==0||price.instalment_count!==0||price.instalment_amount_pence!==0||
     price.finance_apr_bps!==null) :
    (!price.finance_terms_complete||price.instalment_count<1||price.finance_apr_bps===null||
     price.deposit_pence+price.instalment_count*price.instalment_amount_pence!==price.total_payable_pence))
    codes.push("E-05_PAYMENT_BREAKDOWN_INVALID");
  if(!opts.telematics_accepted&&q.telematics_required)codes.push("E-06_TELEMATICS_NOT_ACCEPTED");
  const allowedIds=profile.facts.genuine_named_driver_ids;
  if(q.named_driver_ids.includes(profile.facts.main_driver_id)||
    q.named_driver_ids.some(id=>!allowedIds.includes(id))||
    !sameSet(q.named_driver_ids,scenario.genuine_named_driver_inclusion))
    codes.push("E-07_NAMED_DRIVER_FACTS_MISMATCH");
  if(!opts.allowed_payment_modes.includes(price.payment_mode))codes.push("E-08_PAYMENT_NOT_ACCEPTED");
  if(!validDate(scenario.policy_start_date)||
    (profile.facts.required_coverage_start_date&&
     (!validDate(profile.facts.required_coverage_start_date)||
       scenario.policy_start_date>profile.facts.required_coverage_start_date))||
    scenario.voluntary_excess_pence!==ex.voluntary_pence||
    scenario.payment_structure!==price.payment_mode||
    (q.telematics_required&&!scenario.telematics_preference))
    codes.push("E-09_SCENARIO_INCONSISTENT");
  return codes;
}
const rank=(a,b)=>a.price.total_payable_pence-b.price.total_payable_pence||
  (a.excess.compulsory_pence+a.excess.voluntary_pence)-
  (b.excess.compulsory_pence+b.excess.voluntary_pence)||
  a.quote_id.localeCompare(b.quote_id);
const exposure=q=>q.excess.compulsory_pence+q.excess.voluntary_pence;
function pareto(quotes){
  return quotes.filter(q=>!quotes.some(other=>other.quote_id!==q.quote_id&&
    other.price.total_payable_pence<=q.price.total_payable_pence&&
    exposure(other)<=exposure(q)&&
    (other.price.total_payable_pence<q.price.total_payable_pence||exposure(other)<exposure(q))))
    .sort(rank).map(q=>q.quote_id);
}
export function evaluate(input) {
  if(process.env.MIQO_LIVE_PROVIDERS_ENABLED==="true"||
     process.env.MIQO_DATA_CLASSIFICATION==="LIVE")fail("BV_LIVE_MODE_FORBIDDEN");
  assertSchema(input);
  const profile=input.locked_profile,opts=input.preferences,clockMs=Date.parse(input.test_clock);
  if(!Number.isFinite(clockMs))fail("BV_CLOCK_INVALID");
  if(fingerprint(profile.facts)!==profile.facts_sha256)fail("BV_LOCKED_FACTS_HASH_MISMATCH");
  if(profile.facts.genuine_named_driver_ids.includes(profile.facts.main_driver_id))
    fail("BV_MAIN_DRIVER_IN_NAMED_DRIVER_POOL");
  if(!opts.customer_confirmed)fail("BV_CUSTOMER_INTENT_NOT_CONFIRMED");
  if(coverageKeys.some(k=>typeof opts.coverage_baseline[k]!=="boolean"))
    fail("BV_CUSTOMER_COVER_BASELINE_REQUIRED");
  if(opts.required_benefits.some(k=>opts.coverage_baseline[k]!==true))
    fail("BV_REQUIRED_BENEFIT_CONTRADICTION");
  const duplicates=new Set();
  for(const q of input.quotes){
    if(duplicates.has(q.quote_id))fail("BV_DUPLICATE_QUOTE_ID");
    duplicates.add(q.quote_id);
  }
  const marketEligible=[],excluded=[];
  for(const quote of [...input.quotes].sort((a,b)=>a.quote_id.localeCompare(b.quote_id))){
    const invalid=notApplicableReason(quote,input,clockMs);
    if(invalid.length){
      excluded.push({quote_id:quote.quote_id,codes:[...new Set(invalid)].sort(),classification:"INVALID_QUOTE"});
    } else marketEligible.push(quote);
  }
  // The certified comparison primitive independently verifies the annual-cash benchmark
  // for annual quotes. Total-payable selection is a separate proposed policy.
  const annual=marketEligible.filter(q=>q.price.payment_mode==="ANNUAL");
  const cert=compareNormalisedQuotes(annual.map(q=>({
    normalisedQuoteId:q.quote_id,comparisonState:"DIRECTLY_COMPARABLE",
    annualCashPremiumPence:q.price.annual_cash_premium_pence,
    compulsoryExcessPence:q.excess.compulsory_pence,
    voluntaryExcessPence:q.excess.voluntary_pence
  })));
  if(annual.length){
    const lowest=[...annual].sort((a,b)=>
      a.price.annual_cash_premium_pence-b.price.annual_cash_premium_pence||
      a.quote_id.localeCompare(b.quote_id))[0];
    if(cert.lowestDirectlyComparablePremiumId!==lowest.quote_id)fail("BV_MIQOS_COMPARISON_INCONSISTENCY");
  }
  const eligible=[];
  for(const q of marketEligible){
    const filters=[];
    if(opts.max_total_excess_pence!==undefined&&exposure(q)>opts.max_total_excess_pence)
      filters.push("E-10_EXCESS_OVER_CUSTOMER_LIMIT");
    if(opts.max_total_payable_pence!==undefined&&
       q.price.total_payable_pence>opts.max_total_payable_pence)
      filters.push("E-10_PREMIUM_OVER_CUSTOMER_BUDGET");
    if(filters.length)excluded.push({quote_id:q.quote_id,codes:filters,classification:"OUTSIDE_PREFERENCES"});
    else eligible.push(q);
  }
  marketEligible.sort(rank);eligible.sort(rank);
  excluded.sort((a,b)=>a.quote_id.localeCompare(b.quote_id));
  const benchmark=marketEligible[0]??null,selected=eligible[0]??null;
  const status=marketEligible.length===0?"NO_ELIGIBLE_QUOTES":
     !selected?"NO_QUOTES_MEET_PREFERENCES":"PROVISIONAL_SYNTHETIC_SELECTION";
  const explanations=[
    "DEMO_ONLY_NOT_INSURANCE_ADVICE",
    "CUSTOMER_CONFIRMED_INTENT:"+opts.intent_revision,
    "EXCESS_LIMIT:"+(opts.max_total_excess_pence===undefined?"NOT_SPECIFIED":opts.max_total_excess_pence),
    "PREMIUM_LIMIT:"+(opts.max_total_payable_pence===undefined?"NOT_SPECIFIED":opts.max_total_payable_pence),
    "SELECTED_BY_LOWEST_TOTAL_PAYABLE_AFTER_HARD_CONSTRAINTS",
    "CONTINGENT_EXCESS_IS_NOT_CERTAIN_ANNUAL_COST",
    "PROVIDER_TERMS_ARE_SYNTHETIC_AND_NO_EXTERNAL_RIGHTS_PROVEN",
    status==="NO_ELIGIBLE_QUOTES"?"NO_VALID_COMPARABLE_QUOTES":
      status==="NO_QUOTES_MEET_PREFERENCES"?"NO_OPTION_SATISFIES_CUSTOMER_LIMITS":
       "OPTION_WITHIN_CONFIRMED_CUSTOMER_CONSTRAINTS"
  ];
  if(benchmark&&selected)explanations.push(
    "SELECTED_PREMIUM_DIFFERENCE_VS_CHEAPEST_PENCE:"+
    (selected.price.total_payable_pence-benchmark.price.total_payable_pence),
    "SELECTED_EXCESS_DIFFERENCE_VS_CHEAPEST_PENCE:"+
    (exposure(selected)-exposure(benchmark)));
  const result={
    rule_version:RULE_VERSION,classification:CLASSIFICATION,status,
    input_fingerprint:fingerprint({...input,quotes:[...input.quotes].sort((a,b)=>a.quote_id.localeCompare(b.quote_id))}),
    selected_quote_id:selected?.quote_id??null,
    absolute_cheapest_eligible_quote_id:benchmark?.quote_id??null,
    pareto_frontier_quote_ids:pareto(marketEligible),
    eligible_quote_ids:eligible.map(x=>x.quote_id),
    excluded,explanations,
    selected_total_payable_pence:selected?.price.total_payable_pence??null,
    selected_total_excess_pence:selected?exposure(selected):null,
    cheapest_total_payable_pence:benchmark?.price.total_payable_pence??null,
    cheapest_total_excess_pence:benchmark?exposure(benchmark):null,
    customer_constraints:structuredClone(opts)
  };
  return Object.freeze({...result,result_fingerprint:fingerprint(result)});
}
export function validateDecision(result){
  const v=ajv.getSchema(schema.$id+"#/$defs/decision") ??
    ajv.compile({$ref:"#/$defs/decision",$defs:schema.$defs});
  if(!v(result))fail("BV_DECISION_SCHEMA_INVALID:"+ajv.errorsText(v.errors));
  return true;
}
