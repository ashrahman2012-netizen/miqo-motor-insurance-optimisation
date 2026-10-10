// BV5-01: deterministic, NON-ROUTABLE, synthetic evidence adapter.
// Never infer full policy terms, fees, finance or permission from Sprint 4's narrow normaliser.
import {fingerprint} from "../../packages/balanced-value/src/engine.mjs";
import {previewSyntheticIntegration,REQUIRED_SYNTHETIC_EVIDENCE_KEYS} from "./readiness.mjs";
export const ADAPTER_VERSION="BV5-EVIDENCE-ADAPTER-001";
const hash=/^[a-f0-9]{64}$/;
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const benefitKeys=["courtesy_car","windscreen","legal_expenses","breakdown","personal_accident"];
const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
export function adaptSprint4Evidence({normalised,source,attestation,request}){
  if(process.env.MIQO_DATA_CLASSIFICATION!=="SYNTHETIC"||
     process.env.MIQO_LIVE_PROVIDERS_ENABLED!=="false"||
     request?.environment!=="SYNTHETIC_ONLY")throw Error("BV5_ADAPTER_SYNTHETIC_ONLY");
  const reasons=[];
  const reject=(cond,code)=>{if(!cond)reasons.push(code);};
  reject(normalised?.comparisonState==="DIRECTLY_COMPARABLE","SP4_NOT_DIRECTLY_COMPARABLE");
  reject(normalised?.normalisationVersion==="sp2-normaliser-v1","SP4_NORMALISER_VERSION_UNKNOWN");
  reject(hash.test(normalised?.normalisationFingerprint??""),"SP4_NORMALISER_HASH_MISSING");
  for(const field of ["annualCashPremiumPence","compulsoryExcessPence","voluntaryExcessPence"])
    reject(integer(normalised?.[field]),"SP4_MISSING_"+field);
  reject(source?.synthetic===true&&source?.providerKey?.startsWith("MOCK-"),"SOURCE_NOT_SYNTHETIC_PROVIDER");
  for(const field of ["normalisedQuoteId","quoteRequestId","scenarioId","marketRouteId","routeKey","providerKey","mappingVersion"])
    reject(typeof source?.[field]==="string"&&source[field].length>0,"SOURCE_MISSING_"+field);
  reject(hash.test(source?.routeFingerprint??""),"SOURCE_ROUTE_FINGERPRINT_INVALID");
  reject(source?.normalisationFingerprint===normalised?.normalisationFingerprint,
    "SOURCE_NORMALISATION_FINGERPRINT_MISMATCH");
  reject(source?.profileId===request?.locked_profile?.profile_id&&source?.profileVersion===request?.locked_profile?.version,
    "SOURCE_PROFILE_IDENTITY_MISMATCH");
  reject(source?.factsSha256===request?.locked_profile?.facts_sha256,"SOURCE_FACTS_HASH_MISMATCH");
  reject(typeof attestation==="object"&&attestation!==null&&!Array.isArray(attestation),"ATTESTATION_MISSING");
  const a=attestation??{};
  // All evidence is asserted by a test-only enriched fixture; never automatically inferred from normaliser.
  for(const field of [
    "quote_id","provider_alias","issued_at","valid_until","scenario","benefits","price",
    "named_driver_ids","telematics_required","provenance_verified","quotation_permission",
    "cover_features_verified","restrictions_verified","policy_type"
  ])reject(own(a,field),"ATTESTATION_MISSING_"+field);
  reject(a.cover_features_verified===true,"COVER_EVIDENCE_UNVERIFIED");
  reject(a.restrictions_verified===true,"RESTRICTIONS_UNVERIFIED");
  reject(a.provenance_verified===true,"PROVENANCE_UNVERIFIED");
  reject(a.quotation_permission===true,"QUOTATION_PERMISSION_UNVERIFIED");
  reject(a.policy_type==="COMPREHENSIVE","COVER_TYPE_UNVERIFIED");
  reject(a.price?.mandatory_fees_ipt_included===true,"IPT_FEES_COMPLETENESS_UNVERIFIED");
  reject(a.price?.finance_terms_complete===true,"FINANCE_COMPLETENESS_UNVERIFIED");
  reject(a.price?.annual_cash_premium_pence===normalised?.annualCashPremiumPence,
    "ANNUAL_PRICE_MISMATCH");
  reject(a.price?.payment_mode===a.scenario?.payment_structure,"PAYMENT_MODE_SCENARIO_MISMATCH");
  reject(a.scenario?.voluntary_excess_pence===normalised?.voluntaryExcessPence,"EXCESS_SCENARIO_MISMATCH");
  reject(a.excess?.compulsory_pence===normalised?.compulsoryExcessPence,"COMPULSORY_EXCESS_MISMATCH");
  reject(a.excess?.voluntary_pence===normalised?.voluntaryExcessPence,"VOLUNTARY_EXCESS_MISMATCH");
  reject(a.quote_id===source?.normalisedQuoteId,"QUOTE_ID_SOURCE_MISMATCH");
  reject(a.scenario_id===source?.scenarioId,"SCENARIO_ID_SOURCE_MISMATCH");
  reject(a.route_key===source?.routeKey,"ROUTE_KEY_SOURCE_MISMATCH");
  reject(a.profile_id===source?.profileId&&a.profile_version===source?.profileVersion&&a.facts_sha256===source?.factsSha256,
    "ATTESTATION_PROFILE_MISMATCH");
  reject(a.price?.payment_mode==="ANNUAL"||a.price?.payment_mode==="MONTHLY","PAYMENT_MODE_UNKNOWN");
  reject(integer(a.price?.total_payable_pence)&&integer(a.price?.finance_cost_pence),
    "TOTAL_PAYABLE_OR_FINANCE_MISSING");
  if(a.price?.payment_mode==="ANNUAL"){
    reject(a.price?.total_payable_pence===a.price?.annual_cash_premium_pence &&
      a.price?.finance_cost_pence===0,"ANNUAL_TOTAL_INCONSISTENT");
  }else if(a.price?.payment_mode==="MONTHLY"){
    reject(integer(a.price?.deposit_pence)&&integer(a.price?.instalment_count)&&integer(a.price?.instalment_amount_pence)&&integer(a.price?.finance_apr_bps),
      "MONTHLY_TERMS_MISSING");
  }
  for(const k of benefitKeys)reject(typeof a.benefits?.[k]==="boolean","COVER_BENEFIT_MISSING_"+k);
  reject(Array.isArray(a.named_driver_ids),"NAMED_DRIVERS_UNVERIFIED");
  reject(typeof a.telematics_required==="boolean","TELEMATICS_UNVERIFIED");
  reject(!Number.isNaN(Date.parse(a.issued_at))&&!Number.isNaN(Date.parse(a.valid_until))&&
    Date.parse(a.valid_until)>Date.parse(request?.test_clock??"") &&
    Date.parse(a.issued_at)<=Date.parse(request?.test_clock??""),
    "QUOTE_TIME_MISSING_OR_EXPIRED");
  // Prevent attestation pretending to be independently certified provider data.
  reject(a.evidence_classification==="INDEPENDENT_SYNTHETIC_TEST_ATTESTATION",
    "EVIDENCE_CLASSIFICATION_NOT_TEST_ONLY");
  const failure=[...new Set(reasons)].sort();
  const status=failure.length?"ADAPTER_INCOMPLETE":"SYNTHETIC_ADAPTER_READY";
  const receipt={
    adapterVersion:ADAPTER_VERSION,status,reasons:failure,
    sourceNormalisationFingerprint:normalised?.normalisationFingerprint??null,
    sourceRouteFingerprint:source?.routeFingerprint??null,
    evidenceFingerprint:fingerprint({source,normalised,attestation}),
    publicApiRegistered:false,liveProviderQualified:false
  };
  if(failure.length)return Object.freeze({receipt,quote:null});
  // Exact contract fields only. Do not forward unknown provider or customer data.
  const quote={
    quote_id:a.quote_id,provider_alias:a.provider_alias,route_key:a.route_key,
    scenario_id:a.scenario_id,profile_id:a.profile_id,profile_version:a.profile_version,
    facts_sha256:a.facts_sha256,provenance_verified:a.provenance_verified,
    quotation_permission:a.quotation_permission,issued_at:a.issued_at,valid_until:a.valid_until,
    policy_type:a.policy_type,cover_features_verified:a.cover_features_verified,
    restrictions_verified:a.restrictions_verified,benefits:structuredClone(a.benefits),
    price:structuredClone(a.price),excess:structuredClone(a.excess),
    telematics_required:a.telematics_required,named_driver_ids:[...a.named_driver_ids],
    scenario:structuredClone(a.scenario)
  };
  return Object.freeze({receipt,quote});
}
export function previewAdaptedSprint4Evidence(input){
  const mapped=adaptSprint4Evidence(input);
  if(!mapped.quote)return Object.freeze({adapter:mapped.receipt,readiness:null,result:null});
  const request=structuredClone(input.request);
  request.quotes=[mapped.quote];
  const readiness=Object.fromEntries(REQUIRED_SYNTHETIC_EVIDENCE_KEYS.map(k=>
    [k,k==="source_classification"?"SYNTHETIC":true]));
  const preview=previewSyntheticIntegration(readiness,request);
  return Object.freeze({adapter:mapped.receipt,readiness:preview.gate,result:preview.result});
}
