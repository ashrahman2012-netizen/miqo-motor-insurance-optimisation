export const SP5_ACTIVATION_POLICY_VERSION="sp5-activation-policy-v1" as const;

export type CapabilityId="REAL_DATA"|"LIVE_PROVIDER"|"DISTRIBUTION"|"BIND_PAY";
export type ActivationDecision="AUTHORISED"|"NOT_AUTHORISED";
export type ActivationGateRecord=Readonly<{
  capability:CapabilityId;
  decision:ActivationDecision;
  decisionReference:string;
  dependencies:ReadonlyArray<string>;
}>;

export type ActivationRegister=Readonly<{
  policyVersion:typeof SP5_ACTIVATION_POLICY_VERSION;
  records:ReadonlyArray<ActivationGateRecord>;
}>;

export function buildActivationRegister(records:ReadonlyArray<ActivationGateRecord>):ActivationRegister{
  const expected:CapabilityId[]=["REAL_DATA","LIVE_PROVIDER","DISTRIBUTION","BIND_PAY"];
  const seen=new Set(records.map(r=>r.capability));
  if(records.length!==expected.length||expected.some(x=>!seen.has(x)))throw new Error("ACTIVATION_REGISTER_INCOMPLETE");
  if(records.some(r=>!r.decisionReference.trim()))throw new Error("ACTIVATION_DECISION_REFERENCE_REQUIRED");
  return Object.freeze({policyVersion:SP5_ACTIVATION_POLICY_VERSION,records:Object.freeze(records.map(r=>Object.freeze({...r,dependencies:Object.freeze([...r.dependencies])})))});
}

export function activationDecision(register:ActivationRegister,capability:CapabilityId){
  const record=register.records.find(r=>r.capability===capability);
  if(!record)throw new Error("ACTIVATION_GATE_MISSING:"+capability);
  return record;
}

export function assertCapabilityAuthorised(register:ActivationRegister,capability:CapabilityId,availableEvidence:ReadonlySet<string>){
  const record=activationDecision(register,capability);
  if(record.decision!=="AUTHORISED")throw new Error("CAPABILITY_NOT_AUTHORISED:"+capability);
  const missing=record.dependencies.filter(d=>!availableEvidence.has(d));
  if(missing.length)throw new Error("CAPABILITY_DEPENDENCY_MISSING:"+capability+":"+missing.join(","));
}

export function assertIndependentActivation(records:ReadonlyArray<ActivationGateRecord>){
  const register=buildActivationRegister(records);
  const refs=new Set(register.records.map(r=>r.decisionReference));
  if(refs.size!==register.records.length)throw new Error("ACTIVATION_DECISIONS_NOT_INDEPENDENT");
  return register;
}

export function productionReadinessWithoutActivation(args:Readonly<{
  ciGreen:boolean;
  e2eGreen:boolean;
  register:ActivationRegister;
}>){
  if(!args.ciGreen||!args.e2eGreen)throw new Error("PRODUCTION_READINESS_TEST_EVIDENCE_INCOMPLETE");
  const active=args.register.records.filter(r=>r.decision==="AUTHORISED");
  if(active.length)throw new Error("UNAUTHORISED_CAPABILITY_ACTIVATED_DURING_READINESS:"+active.map(x=>x.capability).join(","));
  return Object.freeze({
    policyVersion:args.register.policyVersion,
    readiness:"PASS_WITH_CAPABILITIES_DISABLED" as const,
    disabledCapabilities:Object.freeze(args.register.records.map(r=>r.capability)),
  });
}
