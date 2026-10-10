// MIQOS-SEOPA-TXN-001. Synthetic test fixtures only; not SEOPA's API or provider prices.
export const TEST_CLOCK = "2026-10-10T09:15:00+01:00";
export const RUN_ID = "MIQOS-SEOPA-UAT-20261010-001";
export const baseProfile = Object.freeze({
  customer_name:"Daniel Mercer (synthetic)", dob:"1992-04-18",
  postcode:"E15 (synthetic area-level only)", occupation:"Civil / Project Engineer",
  employment_status:"employed", uk_licence_type:"full", licence_years:12,
  ncd_years:8, claims_last_5_years:[], convictions_last_5_years:[],
  vehicle:{description:"2021 Volkswagen Golf 1.5 TSI Life", value_gbp:15500,
    modifications:[], registration:"SYNTHETIC-NOT-VALID"},
  annual_mileage:8000, usage:["social_domestic_pleasure","commuting"],
  overnight_parking:"private_driveway", main_driver_id:"DR-001",
  main_driver:"Daniel Mercer", cover_type:"comprehensive",
  genuine_named_drivers:[{
    id:"ND-001", synthetic_name:"Emma Mercer", dob:"1991-06-12",
    licence_type:"UK full", licence_years:14, claims_last_5_years:[],
    convictions_last_5_years:[], will_genuinely_drive:true,
    licence_verification:"NOT_PERFORMED_MOCK"
  }]
});
export const customerObjective=Object.freeze({
  code:"BALANCED_VALUE", preferred_total_excess_max_gbp:600,
  telematics_acceptable:true, annual_payment_preferred:true,
  named_driver_available:true
});
// Each row: scenario, inception, voluntary excess, payment, telematics, named-driver IDs.
export const scenarioRows=Object.freeze([
  ["S0","2026-10-17",250,"annual",false,[]],
  ["S1","2026-10-31",250,"annual",false,[]],
  ["S2","2026-10-31",500,"annual",false,[]],
  ["S3","2026-10-31",500,"monthly",false,[]],
  ["S4","2026-10-31",500,"annual",false,["ND-001"]],
  ["S5","2026-10-31",250,"annual",true,[]],
  ["S6","2026-10-31",500,"annual",true,["ND-001"]],
  ["S7","2026-10-31",250,"annual",true,["ND-001"]]
]);
// Mock quote rows: scenario, insurer ALIAS, TOTAL PAYABLE pence, compulsory excess pence,
// telematics required, named driver included; coverage detail deliberately unverified.
export const quoteRows=Object.freeze([
  ["S0","ALPHA",81200,35000,false,false],
  ["S1","ALPHA",71600,35000,false,false],
  ["S2","ALPHA",68200,35000,false,false],
  ["S3","ALPHA",75240,35000,false,false],
  ["S4","ALPHA",64900,35000,false,true],
  ["S5","ALPHA",62300,35000,true,false],
  ["S6","ALPHA",57100,35000,true,true],
  ["S7","ALPHA",61200,30000,true,true],
  ["S7","BRAVO",62800,35000,true,true],
  ["S7","CHARLIE",65500,25000,false,true]
]);
export const fixtureMetadata=Object.freeze({
  data_classification:"SYNTHETIC_ONLY",
  partner_contract:"UNCONFIRMED",
  quote_origin:"LOCAL_FIXTURE_NO_EXTERNAL_REQUEST",
  coverage_completeness:"PARTIAL_MOCK",
  policy_binding:false, payment_collection:false
});
