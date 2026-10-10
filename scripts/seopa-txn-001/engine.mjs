// MIQOS-SEOPA-TXN-001. Proposed local adapter contract; NO SEOPA integration or network I/O.
// Reuses MIQOS's certified synthetic market-route, mock normaliser, and comparison primitives.
// BALANCED_VALUE is a separate UAT-only rule (production Sprint 4 objective remains dormant).
import {createHash} from "node:crypto";
import {getSyntheticMarketRoute} from "../../packages/quote-orchestration/src/index.ts";
import {OPTIMISATION_PREFERENCE_KEYS} from "../../packages/scenarios/src/model.ts";
import {normaliseMockProviderPayload} from "../../packages/normalisation/src/index.ts";
import {compareNormalisedQuotes} from "../../packages/comparison/src/index.ts";
import {baseProfile,customerObjective,scenarioRows,quoteRows,RUN_ID,TEST_CLOCK,fixtureMetadata} from "./fixtures.mjs";

const sha256 = value => createHash("sha256").update(value).digest("hex");
const clone = value => structuredClone(value);
const fail = (code) => {throw new Error(code);};
const assert = (condition,code) => {if(!condition)fail(code);};
const hasOnly = (object,keys) => Object.keys(object).every(key=>keys.includes(key));
const asPence = value => {assert(Number.isInteger(value) && value>=0,"MONEY_MUST_BE_INTEGER_PENCE");return value;};
const approved = new Set(OPTIMISATION_PREFERENCE_KEYS);

export function canonical(value) {
  if(Array.isArray(value)) return value.map(canonical);
  if(value!==null && typeof value==="object") {
    return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  }
  return value;
}
export const factsHash = facts => sha256(JSON.stringify(canonical(facts)));

export function lockedProfile(facts=baseProfile) {
  assert(facts && typeof facts==="object","FACTS_REQUIRED");
  assert(facts.main_driver_id==="DR-001","MAIN_DRIVER_MISMATCH");
  assert(facts.annual_mileage===8000 && facts.dob==="1992-04-18","FACTS_NOT_VALIDATED");
  assert(Array.isArray(facts.genuine_named_drivers) &&
    facts.genuine_named_drivers.every(d=>d.id!==facts.main_driver_id &&
      d.will_genuinely_drive===true && d.licence_verification==="NOT_PERFORMED_MOCK"),
    "INVALID_GENUINE_NAMED_DRIVER_DECLARATION");
  return {
    object_type:"LockedRiskProfile",run_id:RUN_ID,profile_id:"RP-DEMO-001",
    profile_version:1,status:"LOCKED_SYNTHETIC",
    facts:clone(facts),facts_sha256:factsHash(facts),
    validation:{status:"PASS_SIMULATED",external_lookups_performed:false}
  };
}
export function buildScenario(profile,row) {
  assert(profile?.status==="LOCKED_SYNTHETIC","PROFILE_NOT_LOCKED");
  const [id,date,excess,payment,telematics,namedIds]=row;
  assert(/^S[0-7]$/.test(id),"UNKNOWN_SCENARIO");
  const choices={
    policy_start_date:date,voluntary_excess:excess,
    payment_structure:payment,telematics_preference:telematics,
    genuine_named_driver_inclusion:clone(namedIds)
  };
  assert(hasOnly(choices,[...approved]) &&
    Object.keys(choices).every(k=>approved.has(k)),"UNAUTHORISED_O_CLASS_DELTA");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date+"T00:00:00Z")),"INVALID_POLICY_DATE");
  assert(["annual","monthly"].includes(payment) && [250,500].includes(excess) &&
    typeof telematics==="boolean","INVALID_OPTIMISATION_CHOICE");
  assert(Array.isArray(namedIds) && new Set(namedIds).size===namedIds.length,
    "INVALID_NAMED_DRIVER_SET");
  const available=profile.facts.genuine_named_drivers;
  assert(namedIds.every(id=>available.some(d=>d.id===id&&d.will_genuinely_drive===true)),
    "UNKNOWN_GENUINE_NAMED_DRIVER");
  assert(factsHash(profile.facts)===profile.facts_sha256,"LOCKED_FACTS_MUTATED");
  return {
    object_type:"OptimisationScenario",run_id:RUN_ID,scenario_id:id,
    profile_id:profile.profile_id,profile_version:profile.profile_version,
    facts_sha256:profile.facts_sha256,
    o_class_deltas:choices,guard:{factual_mutations_detected:0,result:"PASS"}
  };
}
export function buildRequest(profile,scenario,{mode="MOCK_ONLY"}={}) {
  assert(mode==="MOCK_ONLY","LIVE_PARTNER_OPERATION_FORBIDDEN");
  assert(scenario.profile_id===profile.profile_id &&
    scenario.profile_version===profile.profile_version &&
    scenario.facts_sha256===profile.facts_sha256 &&
    factsHash(profile.facts)===profile.facts_sha256,"PROFILE_FINGERPRINT_MISMATCH");
  assert(hasOnly(scenario.o_class_deltas,[...approved]),"UNAUTHORISED_O_CLASS_DELTA");
  const selected=scenario.o_class_deltas.genuine_named_driver_inclusion;
  assert(Array.isArray(selected) && selected.every(id=>
    profile.facts.genuine_named_drivers.some(d=>d.id===id&&d.will_genuinely_drive)),
    "UNKNOWN_GENUINE_NAMED_DRIVER");
  return {
    object_type:"SEOPAQuoteRequest",contract_status:"PROPOSED_MIQOS_ADAPTER_NOT_SEOPA_SCHEMA",
    mode:"MOCK_ONLY",run_id:RUN_ID,scenario_id:scenario.scenario_id,
    profile_id:profile.profile_id,profile_version:profile.profile_version,
    facts_sha256:profile.facts_sha256,
    correlation_id:RUN_ID+"-"+scenario.scenario_id,
    idempotency_key:RUN_ID+"-"+scenario.scenario_id+"-v1",
    route_provenance:getSyntheticMarketRoute("MOCK-001-PCW"),
    partner_channel:"WHITE_LABEL_COBRANDED_ASSUMED_NOT_CONNECTED",
    canonical_risk_facts:clone(profile.facts),
    optimisable_choices:clone(scenario.o_class_deltas),
    included_named_drivers:selected.map(id=>clone(profile.facts.genuine_named_drivers.find(d=>d.id===id))),
    allowed_operations:["CREATE_MOCK_QUOTE_SESSION"],
    prohibited_operations:["LIVE_SUBMISSION","POLICY_BIND","PAYMENT_COLLECTION"],
    partner_mapping:{status:"UNCONFIRMED",provider_schema_version:null}
  };
}
export function mockQuoteResponse(request,rows=quoteRows) {
  assert(request.mode==="MOCK_ONLY" && request.contract_status==="PROPOSED_MIQOS_ADAPTER_NOT_SEOPA_SCHEMA",
    "PARTNER_BOUNDARY_FORBIDDEN");
  assert(request.facts_sha256===factsHash(request.canonical_risk_facts),
    "OUTBOUND_FACTS_MUTATED");
  const scenarioId=request.scenario_id;
  const found=rows.filter(row=>row[0]===scenarioId);
  assert(found.length>0,"NO_MOCK_QUOTE_FIXTURE");
  const payment=request.optimisable_choices.payment_structure;
  const voluntary=request.optimisable_choices.voluntary_excess;
  const included=request.included_named_drivers.length>0;
  const quotes=found.map(([id,alias,premium,compulsory,telematics,named])=>{
    asPence(premium);asPence(compulsory);asPence(voluntary*100);
    return {
      quote_id:"MOCK-"+id+"-"+alias,provider_alias:"Provider "+alias[0]+alias.slice(1).toLowerCase(),
      policy_type:"comprehensive",
      price:{annual_total_payable_pence:premium,payment_mode:payment,
        annual_cash_premium_pence:payment==="annual"?premium:null,
        finance_cost_pence:payment==="annual"?0:null,
        ipt_and_mandatory_fees_included:true},
      excess:{compulsory_pence:compulsory,voluntary_pence:voluntary*100},
      requirements:{telematics_required:telematics,named_driver_included:named},
      coverage:{courtesy_car:"unknown",windscreen:"unknown",
        legal_expenses:"unknown",breakdown:"unknown"},
      quote_valid_until:"2026-10-10T10:00:00+01:00",
      handoff:{deep_link:null,provider_quote_reference:null}
    };
  });
  assert(quotes.every(q=>q.requirements.named_driver_included===included),
    "NAMED_DRIVER_RESPONSE_CONFLICT");
  assert(quotes.every(q=>!q.requirements.telematics_required ||
    request.optimisable_choices.telematics_preference===true),
    "UNAUTHORISED_TELEMATICS_REQUIREMENT");
  return {
    object_type:"RawQuoteResponse",source:"MOCK_SEOPA_ADAPTER_NO_REAL_PARTNER_CONNECTION",
    run_id:request.run_id,correlation_id:request.correlation_id,
    profile_id:request.profile_id,scenario_id:scenarioId,
    facts_sha256:request.facts_sha256,received_at:"2026-10-10T09:00:00+01:00",
    quote_count:quotes.length,quotes
  };
}
export function normaliseRaw(request,raw,clock=TEST_CLOCK){
  assert(raw.object_type==="RawQuoteResponse" &&
    raw.source==="MOCK_SEOPA_ADAPTER_NO_REAL_PARTNER_CONNECTION","UNTRUSTED_PARTNER_SOURCE");
  assert(raw.correlation_id===request.correlation_id &&
    raw.scenario_id===request.scenario_id &&
    raw.profile_id===request.profile_id &&
    raw.facts_sha256===request.facts_sha256,"RESPONSE_LINEAGE_MISMATCH");
  assert(raw.quote_count===raw.quotes?.length && raw.quote_count>0,
    "RESPONSE_COUNT_INVALID");
  assert(Number.isFinite(Date.parse(clock)),"INVALID_TEST_CLOCK");
  const rawPayloadSha256=sha256(JSON.stringify(canonical(raw)));
  const seen=new Set();
  const items=raw.quotes.map(q=>{
    assert(typeof q.quote_id==="string" &&
      q.quote_id.startsWith("MOCK-"+request.scenario_id+"-") &&
      !seen.has(q.quote_id),"DUPLICATE_OR_FOREIGN_QUOTE_ID");
    seen.add(q.quote_id);
    assert(q.policy_type==="comprehensive","UNEXPECTED_POLICY_TYPE");
    assert(Date.parse(q.quote_valid_until)>Date.parse(clock),"QUOTE_EXPIRED");
    assert(q.handoff?.deep_link===null && q.handoff.provider_quote_reference===null,
      "LIVE_HANDOFF_REFERENCE_FORBIDDEN");
    assert(q.price?.ipt_and_mandatory_fees_included===true,
      "MANDATORY_FEES_UNVERIFIED");
    assert(q.price.payment_mode===request.optimisable_choices.payment_structure,
      "PAYMENT_STRUCTURE_MISMATCH");
    assert(q.excess.voluntary_pence===request.optimisable_choices.voluntary_excess*100,
      "EXCESS_SCENARIO_MISMATCH");
    assert(q.requirements.named_driver_included===(request.included_named_drivers.length>0),
      "NAMED_DRIVER_RESPONSE_CONFLICT");
    assert(!q.requirements.telematics_required ||
      request.optimisable_choices.telematics_preference===true,
      "UNAUTHORISED_TELEMATICS_REQUIREMENT");
    asPence(q.price.annual_total_payable_pence);
    asPence(q.excess.compulsory_pence);
    asPence(q.excess.voluntary_pence);
    // The real MIQOS Sprint 2 normaliser requires a cash-premium basis.
    // A monthly total-payable fixture without cash/APR breakdown must NOT masquerade
    // as annual cash premium or qualify for this comparison.
    const providerPayload={
      provider:"MOCK-PROVIDER-001",
      quote:{
        annualPremiumPence:q.price.annual_cash_premium_pence,
        baseExcessPence:q.excess.compulsory_pence,
        voluntaryExcessPence:q.excess.voluntary_pence,
        paymentBasis:q.price.payment_mode.toUpperCase(),
        coverageMarkers:["COMPREHENSIVE"]
      }
    };
    const payloadText=JSON.stringify(providerPayload);
    const mapped=normaliseMockProviderPayload({payloadText,payloadSha256:sha256(payloadText)});
    const comparable=mapped.comparisonState==="DIRECTLY_COMPARABLE" &&
      q.price.payment_mode==="annual";
    return {
      object_type:"NormalisedQuote",quote_id:q.quote_id,
      scenario_id:raw.scenario_id,provider_alias:q.provider_alias,
      comparison_state:comparable?"DIRECTLY_COMPARABLE":"NOT_COMPARABLE",
      comparison_reason:comparable?"SYNTHETIC_REQUIRED_FIELDS_ONLY":"UNVERIFIED_MONTHLY_CASH_FINANCE_BREAKDOWN",
      total_payable_pence:q.price.annual_total_payable_pence,
      annual_cash_premium_pence:comparable?mapped.annualCashPremiumPence:null,
      compulsory_excess_pence:q.excess.compulsory_pence,
      voluntary_excess_pence:q.excess.voluntary_pence,
      total_excess_pence:q.excess.compulsory_pence+q.excess.voluntary_pence,
      payment_mode:q.price.payment_mode,policy_type:q.policy_type,
      telematics_required:q.requirements.telematics_required,
      named_driver_included:q.requirements.named_driver_included,
      coverage_completeness:"PARTIAL_MOCK",coverage_details_verified:false,
      normalisation_version:mapped.normalisationVersion,
      normalisation_fingerprint:mapped.normalisationFingerprint,
      raw_response_sha256:rawPayloadSha256,
      raw_quote_sha256:sha256(JSON.stringify(canonical(q))),
      mock_eligible:true
    };
  });
  return {rawPayloadSha256,items};
}
export function recommend(quotes,objective=customerObjective){
  assert(objective.code==="BALANCED_VALUE","OBJECTIVE_NOT_SUPPORTED_BY_UAT_RULE");
  const comparison=compareNormalisedQuotes(quotes.map(q=>({
    normalisedQuoteId:q.quote_id,
    comparisonState:q.comparison_state,
    annualCashPremiumPence:q.annual_cash_premium_pence,
    compulsoryExcessPence:q.compulsory_excess_pence,
    voluntaryExcessPence:q.voluntary_excess_pence
  })));
  const comparable=quotes.filter(q=>q.comparison_state==="DIRECTLY_COMPARABLE");
  assert(comparable.length>0,"NO_COMPARABLE_QUOTES");
  const priceOrder=(a,b)=>a.annual_cash_premium_pence-b.annual_cash_premium_pence ||
    a.total_excess_pence-b.total_excess_pence || a.quote_id.localeCompare(b.quote_id);
  const cheapest=[...comparable].sort(priceOrder)[0];
  const preferred=comparable.filter(q=>q.policy_type==="comprehensive" &&
    q.total_excess_pence<=objective.preferred_total_excess_max_gbp*100 &&
    (objective.telematics_acceptable || !q.telematics_required));
  assert(preferred.length>0,"NO_QUOTES_WITHIN_PREFERRED_EXCESS");
  const selected=[...preferred].sort(priceOrder)[0];
  assert(comparison.lowestDirectlyComparablePremiumId===cheapest.quote_id,
    "MIQOS_COMPARISON_DIVERGENCE");
  const baseline=quotes.find(q=>q.quote_id==="MOCK-S0-ALPHA");
  assert(!!baseline,"BASELINE_MISSING");
  return {
    object_type:"RecommendationSet",run_id:RUN_ID,profile_id:"RP-DEMO-001",
    objective:"BALANCED_VALUE",
    objective_status:"SYNTHETIC_RULE_ONLY_PRODUCTION_OBJECTIVE_DORMANT",
    rule_version:"MIQOS-BALANCED-DEMO-001",
    recommended_quote_id:selected.quote_id,recommended_scenario_id:selected.scenario_id,
    annual_premium_pence:selected.annual_cash_premium_pence,
    total_excess_pence:selected.total_excess_pence,
    cheapest_quote_id:cheapest.quote_id,cheapest_premium_pence:cheapest.annual_cash_premium_pence,
    cheapest_excess_pence:cheapest.total_excess_pence,
    baseline_quote_id:baseline.quote_id,baseline_premium_pence:baseline.annual_cash_premium_pence,
    savings_vs_baseline_pence:baseline.annual_cash_premium_pence-selected.annual_cash_premium_pence,
    savings_vs_baseline_pct:Number(((baseline.annual_cash_premium_pence-selected.annual_cash_premium_pence)/
      baseline.annual_cash_premium_pence*100).toFixed(2)),
    premium_more_than_cheapest_pence:selected.annual_cash_premium_pence-cheapest.annual_cash_premium_pence,
    excess_less_than_cheapest_pence:cheapest.total_excess_pence-selected.total_excess_pence,
    direct_comparison_fingerprint:comparison.comparisonFingerprint,
    coverage_details_verified:false,decision_status:"PROVISIONAL_MOCK_RECOMMENDATION"
  };
}
export function finalHandoff(profile,scenarios,quotes,recommendation,selectedQuoteId){
  const quote=quotes.find(q=>q.quote_id===selectedQuoteId);
  const scenario=scenarios.find(s=>s.scenario_id===quote?.scenario_id);
  assert(!!quote && !!scenario && recommendation.recommended_quote_id===selectedQuoteId,
    "SELECTION_QUOTE_MISMATCH");
  assert(factsHash(profile.facts)===profile.facts_sha256 &&
    scenario.facts_sha256===profile.facts_sha256 &&
    scenario.guard.factual_mutations_detected===0,"FINAL_INTEGRITY_FAILED");
  assert(quote.annual_cash_premium_pence===recommendation.annual_premium_pence &&
    quote.total_excess_pence===recommendation.total_excess_pence,"SELECTED_QUOTE_TERMS_CHANGED");
  assert(quote.coverage_details_verified===false,"MOCK_COVERAGE_ASSERTION_CONFLICT");
  return {
    object_type:"FinalHandoff",run_id:RUN_ID,
    profile_id:profile.profile_id,profile_version:profile.profile_version,
    scenario_id:scenario.scenario_id,quote_id:quote.quote_id,
    facts_sha256:profile.facts_sha256,
    integrity:{facts_hash_match:true,scenario_O_only:true,quote_reference_matched:true,
      price_and_excess_consistent:true,status:"PASS_SYNTHETIC"},
    partner_handoff:{mode:"MOCK_ONLY",status:"BLOCKED_NO_PARTNER_CONTRACT",
      deep_link:null,session_token:null,provider_purchase_confirmation:null},
    policy_bound:false,premium_collected:false,
    outcome:"INTEGRITY_PASS_HANDOFF_BLOCKED_NO_SEOPA_CONTRACT",
    customer_facing_label:"DEMO ONLY - NOT A REAL INSURANCE QUOTE"
  };
}
export function executeSyntheticUat(options={}){
  assert(process.env.MIQO_LIVE_PROVIDERS_ENABLED!=="true" &&
    process.env.MIQO_DATA_CLASSIFICATION!=="LIVE","LIVE_ENVIRONMENT_FORBIDDEN");
  assert(options.partnerMode===undefined || options.partnerMode==="MOCK_ONLY",
    "LIVE_PARTNER_OPERATION_FORBIDDEN");
  const customer={
    object_type:"CustomerProfile",run_id:RUN_ID,
    data_classification:fixtureMetadata.data_classification,
    status:"DRAFT",declarations:clone(options.customerFacts??baseProfile),
    customer_objective:clone(customerObjective),
    consent:{synthetic_test_only:true,live_partner_data_transfer:false,live_policy_purchase:false}
  };
  const profile=lockedProfile(customer.declarations);
  const rows=clone(options.scenarioRows??scenarioRows);
  assert(rows.length===8 && new Set(rows.map(r=>r[0])).size===8,"SCENARIO_SET_INVALID");
  const scenarios=rows.map(row=>buildScenario(profile,row));
  if(options.mutateLockedProfile) options.mutateLockedProfile(profile);
  const requests=scenarios.map(s=>buildRequest(profile,s,{mode:options.partnerMode??"MOCK_ONLY"}));
  const responses=requests.map(request=>mockQuoteResponse(request,options.quoteRows??quoteRows));
  if(options.mutateResponse) options.mutateResponse(responses);
  const normalized=responses.map((raw,i)=>normaliseRaw(requests[i],raw,options.clock??TEST_CLOCK));
  const quotes=normalized.flatMap(result=>result.items);
  assert(quotes.length===10 && new Set(quotes.map(q=>q.quote_id)).size===10,
    "QUOTE_SET_INVALID");
  const recommendation=recommend(quotes);
  const handoff=finalHandoff(profile,scenarios,quotes,recommendation,
    options.selectedQuoteId??recommendation.recommended_quote_id);
  return {
    T01_CustomerProfile:customer,T02_LockedRiskProfile:profile,
    T03_OptimisationScenarios:scenarios,T04_SEOPAQuoteRequests:requests,
    T05_RawQuoteResponses:responses,T06_NormalisedQuotes:quotes,
    T07_RecommendationSet:recommendation,T08_FinalHandoff:handoff,
    evidence:{raw_response_sha256:normalized.map(x=>x.rawPayloadSha256),
      test_clock:options.clock??TEST_CLOCK,synthetic:true,
      live_partner_requests:0,live_purchase_attempts:0,
      integration_status:"ISOLATED_SYNTHETIC_CONTRACT_UAT_NOT_PRODUCTION_INTEGRATED"}
  };
}
