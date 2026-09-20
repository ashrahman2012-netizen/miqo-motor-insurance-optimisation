import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCapabilityAuthorised,assertIndependentActivation,buildActivationRegister,
  productionReadinessWithoutActivation,type ActivationGateRecord,
} from "../src/sp5-activation.ts";

const records:ReadonlyArray<ActivationGateRecord>=[
  {capability:"REAL_DATA",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-REAL-DATA-001",dependencies:["S5-G20","DATA-GOVERNANCE-APPROVAL"]},
  {capability:"LIVE_PROVIDER",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-LIVE-PROVIDER-001",dependencies:["S5-G20","S5-G21","PRODUCTION-CREDENTIALS"]},
  {capability:"DISTRIBUTION",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-DISTRIBUTION-001",dependencies:["S5-G20","CUSTOMER-DISCLOSURES","COMPLAINTS-SUPPORT"]},
  {capability:"BIND_PAY",decision:"NOT_AUTHORISED",decisionReference:"MIQO-SP5-ACT-BIND-PAY-001",dependencies:["OUT_OF_SCOPE_SPRINT5"]},
];

test("S5-G23 independent capability gate records are complete and fail closed",()=>{
  const register=assertIndependentActivation(records);
  assert.equal(register.records.length,4);
  for(const capability of ["REAL_DATA","LIVE_PROVIDER","DISTRIBUTION","BIND_PAY"] as const){
    assert.throws(()=>assertCapabilityAuthorised(register,capability,new Set()),new RegExp("CAPABILITY_NOT_AUTHORISED:"+capability));
  }
  assert.throws(()=>buildActivationRegister(records.slice(0,3)),/ACTIVATION_REGISTER_INCOMPLETE/);
  assert.throws(()=>assertIndependentActivation(records.map((r,i)=>({...r,decisionReference:i<2?"DUPLICATE":r.decisionReference}))),/ACTIVATION_DECISIONS_NOT_INDEPENDENT/);
});

test("S5-G22 readiness can pass only with clean CI/E2E and all activation capabilities disabled",()=>{
  const register=buildActivationRegister(records);
  const result=productionReadinessWithoutActivation({ciGreen:true,e2eGreen:true,register});
  assert.equal(result.readiness,"PASS_WITH_CAPABILITIES_DISABLED");
  assert.deepEqual(result.disabledCapabilities,["REAL_DATA","LIVE_PROVIDER","DISTRIBUTION","BIND_PAY"]);
  assert.throws(()=>productionReadinessWithoutActivation({ciGreen:false,e2eGreen:true,register}),/EVIDENCE_INCOMPLETE/);
  const activated=buildActivationRegister(records.map(r=>r.capability==="LIVE_PROVIDER"?{...r,decision:"AUTHORISED" as const}:r));
  assert.throws(()=>productionReadinessWithoutActivation({ciGreen:true,e2eGreen:true,register:activated}),/UNAUTHORISED_CAPABILITY_ACTIVATED_DURING_READINESS/);
});

test("future authorisation requires all named evidence dependencies",()=>{
  const live=buildActivationRegister(records.map(r=>r.capability==="LIVE_PROVIDER"?{...r,decision:"AUTHORISED" as const}:r));
  assert.throws(()=>assertCapabilityAuthorised(live,"LIVE_PROVIDER",new Set(["S5-G20"])),/CAPABILITY_DEPENDENCY_MISSING/);
  assert.doesNotThrow(()=>assertCapabilityAuthorised(live,"LIVE_PROVIDER",new Set(["S5-G20","S5-G21","PRODUCTION-CREDENTIALS"])));
});
