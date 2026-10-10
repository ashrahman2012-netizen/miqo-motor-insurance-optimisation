import {fingerprint,CONTRACT_VERSION} from "./reference.mjs";
export const CLOCK="2026-10-10T09:15:00+01:00";
export const FACTS=Object.freeze({
  main_driver_id:"DR-SYN-001",genuine_named_driver_ids:["ND-SYN-001"],
  annual_mileage:8000,occupation:"SYNTHETIC_PROJECT_ENGINEER",
  required_coverage_start_date:"2026-10-31",
  usage:"SOCIAL_AND_COMMUTING",parking:"PRIVATE_DRIVEWAY",
  vehicle:"SYNTHETIC_GOLF_NOT_A_REAL_REGISTRATION",claims_last_5_years:[]
});
export const COVERAGE=Object.freeze({
  courtesy_car:true,windscreen:true,
  legal_expenses:false,breakdown:false,personal_accident:false
});
export const RISK=Object.freeze({
  profile_id:"BV-MOCK-RP-001",version:1,status:"LOCKED_SYNTHETIC",
  facts_sha256:fingerprint(FACTS),facts:FACTS
});
const scenarioRows=[
 ["S0","2026-10-17",25000,"ANNUAL",false,[]],
 ["S1","2026-10-31",25000,"ANNUAL",false,[]],
 ["S2","2026-10-31",50000,"ANNUAL",false,[]],
 ["S3","2026-10-31",50000,"MONTHLY",false,[]],
 ["S4","2026-10-31",50000,"ANNUAL",false,["ND-SYN-001"]],
 ["S5","2026-10-31",25000,"ANNUAL",true,[]],
 ["S6","2026-10-31",50000,"ANNUAL",true,["ND-SYN-001"]],
 ["S7","2026-10-31",25000,"ANNUAL",true,["ND-SYN-001"]]
];
const scenarios=Object.fromEntries(scenarioRows.map(([id,start,excess,mode,telematics,named])=>
  [id,{policy_start_date:start,voluntary_excess_pence:excess,payment_structure:mode,
    telematics_preference:telematics,genuine_named_driver_inclusion:named}]));
const quoteRows=[
 ["S0","ALPHA",81200,35000,false],
 ["S1","ALPHA",71600,35000,false],
 ["S2","ALPHA",68200,35000,false],
 ["S3","ALPHA",75240,35000,false],
 ["S4","ALPHA",64900,35000,false],
 ["S5","ALPHA",62300,35000,true],
 ["S6","ALPHA",57100,35000,true],
 ["S7","ALPHA",61200,30000,true],
 ["S7","BRAVO",62800,35000,true],
 ["S7","CHARLIE",65500,25000,false]
];
const price=(mode,total)=>mode==="ANNUAL"?
  {payment_mode:mode,annual_cash_premium_pence:total,total_payable_pence:total,finance_cost_pence:0,
    mandatory_fees_ipt_included:true,finance_terms_complete:true,
    deposit_pence:0,instalment_count:0,instalment_amount_pence:0,finance_apr_bps:null}:
  {payment_mode:mode,annual_cash_premium_pence:68200,total_payable_pence:total,finance_cost_pence:total-68200,
    mandatory_fees_ipt_included:true,finance_terms_complete:true,
    deposit_pence:0,instalment_count:12,instalment_amount_pence:total/12,finance_apr_bps:1200};
export function syntheticRequest(){
 const quotes=quoteRows.map(([scenario,alias,total,compulsory,telematics])=>{
   const s=structuredClone(scenarios[scenario]);
   return {
      quote_id:"MOCK-"+scenario+"-"+alias,provider_alias:"Synthetic Provider "+alias,
      route_key:"SYNTHETIC-"+alias,scenario_id:scenario,
      profile_id:RISK.profile_id,profile_version:RISK.version,facts_sha256:RISK.facts_sha256,
      provenance_verified:true,quotation_permission:true,
      issued_at:"2026-10-10T09:00:00+01:00",valid_until:"2026-10-10T10:00:00+01:00",
      policy_type:"COMPREHENSIVE",cover_features_verified:true,restrictions_verified:true,
      benefits:structuredClone(COVERAGE),price:price(s.payment_structure,total),
      excess:{compulsory_pence:compulsory,voluntary_pence:s.voluntary_excess_pence},
      telematics_required:telematics,named_driver_ids:[...s.genuine_named_driver_inclusion],
      scenario:s
   };
 });
 return {
   contract_version:CONTRACT_VERSION,environment:"SYNTHETIC_ONLY",
   test_clock:CLOCK,locked_profile:structuredClone(RISK),
   preferences:{
     customer_confirmed:true,intent_revision:"SYNTHETIC-CUSTOMER-INTENT-001",
     required_cover:"COMPREHENSIVE",max_total_excess_pence:60000,
     allowed_payment_modes:["ANNUAL"],telematics_accepted:true,
     required_benefits:["courtesy_car","windscreen"],
     coverage_baseline:structuredClone(COVERAGE)
   },
   quotes
 };
}
