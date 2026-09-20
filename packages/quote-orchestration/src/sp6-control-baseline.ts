import {
  assertCapabilityAuthorised,
  assertIndependentActivation,
  buildActivationRegister,
  type ActivationGateRecord,
  type ActivationRegister,
  type CapabilityId,
} from "./sp5-activation.ts";

export const SP6_CONTROL_MODEL_VERSION="sp6-control-model-v1" as const;
export const SP6_INHERITED_CLOSURE="MIQO-SP5-CLOSE-001" as const;

export type GateState="PASS"|"BLOCKED";
export type Sprint5InheritanceSnapshot=Readonly<{
  closureId:string;
  passGates:ReadonlyArray<string>;
  blockedGates:ReadonlyArray<string>;
}>;

const REQUIRED_PASS_GATES=Object.freeze([
  ...Array.from({length:20},(_,i)=>"S5-G"+i),
  "S5-G22",
  "S5-G23",
]);
const REQUIRED_BLOCKED_GATES=Object.freeze(["S5-G20","S5-G21"]);

export function assertSprint5Inheritance(snapshot:Sprint5InheritanceSnapshot){
  if(snapshot.closureId!==SP6_INHERITED_CLOSURE)throw new Error("SP6_INHERITANCE_CLOSURE_MISMATCH");
  const passed=new Set(snapshot.passGates);
  const blocked=new Set(snapshot.blockedGates);
  for(const gate of REQUIRED_PASS_GATES)if(!passed.has(gate))throw new Error("SP6_INHERITANCE_PASS_GATE_MISSING:"+gate);
  for(const gate of REQUIRED_BLOCKED_GATES)if(!blocked.has(gate))throw new Error("SP6_INHERITANCE_BLOCKED_GATE_MISSING:"+gate);
  if(REQUIRED_BLOCKED_GATES.some(g=>passed.has(g)))throw new Error("SP6_INHERITANCE_EXTERNAL_GATE_ILLEGALLY_PASSED");
  return Object.freeze({
    closureId:SP6_INHERITED_CLOSURE,
    inheritedPassCount:REQUIRED_PASS_GATES.length,
    inheritedBlocked:Object.freeze([...REQUIRED_BLOCKED_GATES]),
  });
}

export type ExternalDependencyId="S5-G20"|"S5-G21";
export type Sprint6ExternalDependencies=Readonly<Record<ExternalDependencyId,GateState>>;

export type Sprint6ControlModel=Readonly<{
  version:typeof SP6_CONTROL_MODEL_VERSION;
  inheritedClosure:typeof SP6_INHERITED_CLOSURE;
  externalDependencies:Sprint6ExternalDependencies;
  activationRegister:ActivationRegister;
}>;

export const CURRENT_SPRINT6_ACTIVATION_RECORDS:ReadonlyArray<ActivationGateRecord>=Object.freeze([
  Object.freeze({capability:"REAL_DATA",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-REAL-DATA-001",dependencies:Object.freeze(["S5-G20","DATA-GOVERNANCE-APPROVAL"])}),
  Object.freeze({capability:"LIVE_PROVIDER",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-LIVE-PROVIDER-001",dependencies:Object.freeze(["S5-G20","S5-G21","PRODUCTION-CREDENTIALS"])}),
  Object.freeze({capability:"DISTRIBUTION",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-DISTRIBUTION-001",dependencies:Object.freeze(["S5-G20","CUSTOMER-DISCLOSURES","COMPLAINTS-SUPPORT"])}),
  Object.freeze({capability:"BIND_PAY",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-BIND-PAY-001",dependencies:Object.freeze(["OUT_OF_SCOPE_SPRINT5"])}),
]);

export function buildSprint6ControlModel(args?:Readonly<{
  externalDependencies?:Sprint6ExternalDependencies;
  activationRecords?:ReadonlyArray<ActivationGateRecord>;
}>):Sprint6ControlModel{
  const activationRegister=assertIndependentActivation(args?.activationRecords??CURRENT_SPRINT6_ACTIVATION_RECORDS);
  return Object.freeze({
    version:SP6_CONTROL_MODEL_VERSION,
    inheritedClosure:SP6_INHERITED_CLOSURE,
    externalDependencies:Object.freeze(args?.externalDependencies??{"S5-G20":"BLOCKED","S5-G21":"BLOCKED"}),
    activationRegister,
  });
}

const HARD_EXTERNAL_REQUIREMENTS:Readonly<Record<CapabilityId,ReadonlyArray<ExternalDependencyId>>>=Object.freeze({
  REAL_DATA:Object.freeze(["S5-G20"]),
  LIVE_PROVIDER:Object.freeze(["S5-G20","S5-G21"]),
  DISTRIBUTION:Object.freeze(["S5-G20"]),
  BIND_PAY:Object.freeze([]),
});

export function assertSprint6CapabilityActivationAllowed(
  model:Sprint6ControlModel,
  capability:CapabilityId,
  availableEvidence:ReadonlySet<string>,
){
  if(capability==="BIND_PAY")throw new Error("BIND_PAY_OUT_OF_SCOPE_SPRINT6");
  for(const dependency of HARD_EXTERNAL_REQUIREMENTS[capability]){
    if(model.externalDependencies[dependency]!=="PASS")throw new Error("EXTERNAL_DEPENDENCY_BLOCKED:"+dependency+":"+capability);
  }
  assertCapabilityAuthorised(model.activationRegister,capability,availableEvidence);
}

export function assertActivationIndependence(register:ActivationRegister){
  const capabilities:CapabilityId[]=["REAL_DATA","LIVE_PROVIDER","DISTRIBUTION","BIND_PAY"];
  const refs=new Set(register.records.map(r=>r.decisionReference));
  if(refs.size!==capabilities.length)throw new Error("SP6_ACTIVATION_REFERENCE_COLLISION");
  for(const capability of capabilities){
    const matches=register.records.filter(r=>r.capability===capability);
    if(matches.length!==1)throw new Error("SP6_ACTIVATION_CAPABILITY_CARDINALITY:"+capability);
  }
  return true;
}

export type ProviderCandidateRecord=Readonly<{
  providerKey:string;
  counterpartyReference:string;
  channel:"DIRECT_INSURER"|"AUTHORISED_INTERMEDIARY";
  targetEnvironment:"CERTIFICATION"|"PRODUCTION";
  proposedRouteKey:string;
  adapterOwner:string;
  technicalDocumentationReference:string;
  certificationOwner:string;
  credentialReferenceNames:ReadonlyArray<string>;
  contractualAuthorityStatus:"PENDING"|"APPROVED";
  permittedTestDataClass:"SYNTHETIC"|"CERTIFICATION_DATA";
}>;

export function validateProviderCandidateShape(record:ProviderCandidateRecord){
  const required=[
    record.providerKey,record.counterpartyReference,record.proposedRouteKey,record.adapterOwner,
    record.technicalDocumentationReference,record.certificationOwner,
  ];
  if(required.some(v=>!v.trim()))throw new Error("PROVIDER_CANDIDATE_METADATA_INCOMPLETE");
  if(record.credentialReferenceNames.some(v=>!v.trim()))throw new Error("PROVIDER_CANDIDATE_CREDENTIAL_REFERENCE_INVALID");
  return Object.freeze({...record,credentialReferenceNames:Object.freeze([...record.credentialReferenceNames])});
}
