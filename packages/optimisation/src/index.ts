import {createHash} from "node:crypto";

export const OPTIMISATION_CATALOGUE_VERSION="sp4-catalogue-v2.1";
export const CUSTOMER_OBJECTIVE_MODEL_VERSION="sp4-objectives-v1";

export type OptimisationControlId=
  | "policy_start_date"
  | "voluntary_excess"
  | "payment_structure"
  | "telematics_preference"
  | "genuine_named_driver_inclusion"
  | "candidate_vehicle";

export type VehicleMode="CURRENT_VEHICLE"|"PRE_PURCHASE";

export type PermittedValues=
  | Readonly<{kind:"ENUM";values:ReadonlyArray<string|number|boolean>}>
  | Readonly<{kind:"RULE";rule:string}>
  | Readonly<{kind:"DYNAMIC";source:string;rule:string}>;

export type OptimisationControl=Readonly<{
  controlId:OptimisationControlId;
  controlClass:"O";
  catalogueVersion:string;
  label:string;
  permittedValues:PermittedValues;
  dependencies:ReadonlyArray<string>;
  constraints:ReadonlyArray<string>;
  applicability:"ALWAYS"|"PRE_PURCHASE_ONLY";
  factualBoundary:string;
}>;

const CONTROLS:ReadonlyArray<OptimisationControl>=Object.freeze([
  Object.freeze({
    controlId:"policy_start_date",
    controlClass:"O",
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    label:"Policy start date",
    permittedValues:Object.freeze({
      kind:"RULE" as const,
      rule:"ISO calendar date that genuinely satisfies the customer's required insurance timing and the active synthetic scenario policy.",
    }),
    dependencies:Object.freeze(["risk_profile_version.status=LOCKED"]),
    constraints:Object.freeze([
      "Must not alter any factual risk field.",
      "Must be a valid ISO date.",
      "Scenario generation may reject dates outside the active synthetic exploration window.",
    ]),
    applicability:"ALWAYS",
    factualBoundary:"May vary only within dates that genuinely satisfy the customer's insurance requirement.",
  }),
  Object.freeze({
    controlId:"voluntary_excess",
    controlClass:"O",
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    label:"Voluntary excess",
    permittedValues:Object.freeze({kind:"ENUM" as const,values:Object.freeze([250,500,750])}),
    dependencies:Object.freeze(["risk_profile_version.status=LOCKED"]),
    constraints:Object.freeze([
      "Value is expressed in whole pounds for the Sprint 4 synthetic catalogue.",
      "Premium and excess remain separate economic dimensions.",
    ]),
    applicability:"ALWAYS",
    factualBoundary:"May vary only within approved/customer-affordable ranges; premium and excess remain separate dimensions.",
  }),
  Object.freeze({
    controlId:"payment_structure",
    controlClass:"O",
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    label:"Payment structure",
    permittedValues:Object.freeze({kind:"ENUM" as const,values:Object.freeze(["ANNUAL","MONTHLY"])}),
    dependencies:Object.freeze(["risk_profile_version.status=LOCKED"]),
    constraints:Object.freeze([
      "Finance cost must remain separately represented.",
      "Payment structure cannot modify the annual premium returned by a provider.",
    ]),
    applicability:"ALWAYS",
    factualBoundary:"Annual/monthly choice may vary; finance cost must remain separately represented.",
  }),
  Object.freeze({
    controlId:"telematics_preference",
    controlClass:"O",
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    label:"Telematics preference",
    permittedValues:Object.freeze({kind:"ENUM" as const,values:Object.freeze([false,true])}),
    dependencies:Object.freeze(["risk_profile_version.status=LOCKED"]),
    constraints:Object.freeze([
      "TRUE is permitted only when the customer is genuinely willing to accept telematics requirements.",
      "Provider availability is evaluated later through MarketRoute/product eligibility.",
    ]),
    applicability:"ALWAYS",
    factualBoundary:"May vary only where the customer is genuinely willing to accept telematics requirements.",
  }),
  Object.freeze({
    controlId:"genuine_named_driver_inclusion",
    controlClass:"O",
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    label:"Genuine named-driver inclusion",
    permittedValues:Object.freeze({
      kind:"DYNAMIC" as const,
      source:"locked_profile.genuine_named_driver_ids",
      rule:"Any generated inclusion set must contain only genuine driver IDs already present in the exact locked RiskProfileVersion.",
    }),
    dependencies:Object.freeze([
      "risk_profile_version.status=LOCKED",
      "driver exists in exact locked RiskProfileVersion",
    ]),
    constraints:Object.freeze([
      "Main-driver status cannot change.",
      "Unknown or invented drivers are prohibited.",
    ]),
    applicability:"ALWAYS",
    factualBoundary:"Only drivers already genuinely available in the locked factual profile may be included; main-driver status cannot change.",
  }),
  Object.freeze({
    controlId:"candidate_vehicle",
    controlClass:"O",
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    label:"Candidate vehicle",
    permittedValues:Object.freeze({
      kind:"DYNAMIC" as const,
      source:"pre_purchase_candidate_vehicle_ids",
      rule:"Candidate IDs must come from an explicit pre-purchase candidate set and never represent the customer's current factual vehicle by mutation.",
    }),
    dependencies:Object.freeze([
      "risk_profile_version.status=LOCKED",
      "vehicle_mode=PRE_PURCHASE",
    ]),
    constraints:Object.freeze([
      "Prohibited in CURRENT_VEHICLE mode.",
      "Candidate vehicle objects remain separate from the current/committed factual vehicle.",
    ]),
    applicability:"PRE_PURCHASE_ONLY",
    factualBoundary:"Permitted only in PRE_PURCHASE mode and must never overwrite the customer's current/committed factual vehicle.",
  }),
]);

export const FACTUAL_FIELDS_PROHIBITED_AS_OPTIMISATION=Object.freeze([
  "annual_mileage",
  "occupation",
  "parking",
  "ownership",
  "claims",
  "convictions",
  "main_driver",
  "modifications",
] as const);

export const MARKET_ROUTE_DIMENSIONS=Object.freeze([
  "provider",
  "distribution_channel",
] as const);

export function optimisationCatalogue(){
  return Object.freeze({
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    controls:CONTROLS,
  });
}

export function isOptimisationControl(value:string):value is OptimisationControlId {
  return CONTROLS.some(control=>control.controlId===value);
}

export function controlIsApplicable(controlId:OptimisationControlId,args:{vehicleMode:VehicleMode}){
  const control=CONTROLS.find(item=>item.controlId===controlId);
  if(!control)return false;
  return control.applicability==="ALWAYS" || args.vehicleMode==="PRE_PURCHASE";
}

export function assertPermittedOptimisationControl(controlId:string,args:{vehicleMode:VehicleMode}){
  if(!isOptimisationControl(controlId)) {
    throw new Error(`CONTROL_NOT_IN_OPTIMISATION_CATALOGUE:${controlId}`);
  }
  if(!controlIsApplicable(controlId,args)) {
    throw new Error(`CONTROL_NOT_APPLICABLE:${controlId}`);
  }
  return CONTROLS.find(control=>control.controlId===controlId)!;
}

export type CustomerObjectiveId=
  | "LOWEST_ANNUAL_PREMIUM"
  | "LOWEST_MONTHLY_COMMITMENT"
  | "LOWEST_FINANCE_COST"
  | "LOWER_EXCESS_EXPOSURE"
  | "BALANCED_COST_AND_EXPOSURE";

export type CustomerObjectiveDefinition=Readonly<{
  objectiveId:CustomerObjectiveId;
  objectiveVersion:string;
  executable:boolean;
  label:string;
  primaryDimension:string;
  explanation:string;
}>;

const OBJECTIVES:ReadonlyArray<CustomerObjectiveDefinition>=Object.freeze([
  Object.freeze({
    objectiveId:"LOWEST_ANNUAL_PREMIUM",
    objectiveVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    executable:true,
    label:"Lowest annual premium",
    primaryDimension:"annual_cash_premium_pence",
    explanation:"Surface eligible directly comparable quotes by annual cash premium without combining premium and excess.",
  }),
  Object.freeze({
    objectiveId:"LOWEST_MONTHLY_COMMITMENT",
    objectiveVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    executable:true,
    label:"Lowest monthly commitment",
    primaryDimension:"monthly_commitment_pence",
    explanation:"Compare the periodic payment commitment while retaining total payable and finance cost as separate dimensions.",
  }),
  Object.freeze({
    objectiveId:"LOWEST_FINANCE_COST",
    objectiveVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    executable:true,
    label:"Lowest finance cost",
    primaryDimension:"finance_cost_pence",
    explanation:"Compare finance cost only among otherwise eligible quotation options; do not treat finance cost as premium or excess.",
  }),
  Object.freeze({
    objectiveId:"LOWER_EXCESS_EXPOSURE",
    objectiveVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    executable:true,
    label:"Lower excess exposure",
    primaryDimension:"total_excess_exposure_pence",
    explanation:"Compare contingent excess exposure as a separate decision lens, not as a universal effective-cost score.",
  }),
  Object.freeze({
    objectiveId:"BALANCED_COST_AND_EXPOSURE",
    objectiveVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    executable:false,
    label:"Balanced cost and exposure",
    primaryDimension:"UNAPPROVED_MULTI_DIMENSION_METHOD",
    explanation:"Defined but dormant until a separately approved weighting, fairness and explainability methodology exists.",
  }),
]);

export function customerObjectiveModel(){
  return Object.freeze({
    objectiveModelVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    objectives:OBJECTIVES,
  });
}

export function isCustomerObjective(value:string):value is CustomerObjectiveId {
  return OBJECTIVES.some(objective=>objective.objectiveId===value);
}

export function assertExecutableCustomerObjective(value:string){
  const objective=OBJECTIVES.find(item=>item.objectiveId===value);
  if(!objective)throw new Error(`UNKNOWN_CUSTOMER_OBJECTIVE:${value}`);
  if(!objective.executable)throw new Error(`CUSTOMER_OBJECTIVE_DORMANT:${value}`);
  return objective;
}

export function optimisationPolicyFingerprint(){
  const payload=JSON.stringify({
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    controls:CONTROLS,
    objectiveModelVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    objectives:OBJECTIVES,
    prohibitedFactualFields:FACTUAL_FIELDS_PROHIBITED_AS_OPTIMISATION,
    marketRouteDimensions:MARKET_ROUTE_DIMENSIONS,
  });
  return createHash("sha256").update(payload).digest("hex");
}
