import test from "node:test";
import assert from "node:assert/strict";
import {
  SP6_CONTROL_MODEL_VERSION,
  SP6_INHERITED_CLOSURE,
  assertActivationIndependence,
  assertSprint5Inheritance,
  assertSprint6CapabilityActivationAllowed,
  buildSprint6ControlModel,
  validateProviderCandidateShape,
} from "../src/sp6-control-baseline.ts";

const inheritedPass=[...Array.from({length:20},(_,i)=>"S5-G"+i),"S5-G22","S5-G23"];

test("S6-G0 inherits the exact Sprint 5 closure with G20/G21 still blocked",()=>{
  const result=assertSprint5Inheritance({
    closureId:SP6_INHERITED_CLOSURE,
    passGates:inheritedPass,
    blockedGates:["S5-G20","S5-G21"],
  });
  assert.equal(result.inheritedPassCount,22);
  assert.deepEqual(result.inheritedBlocked,["S5-G20","S5-G21"]);
  assert.throws(()=>assertSprint5Inheritance({
    closureId:"WRONG",
    passGates:inheritedPass,
    blockedGates:["S5-G20","S5-G21"],
  }),/CLOSURE_MISMATCH/);
  assert.throws(()=>assertSprint5Inheritance({
    closureId:SP6_INHERITED_CLOSURE,
    passGates:[...inheritedPass,"S5-G20"],
    blockedGates:["S5-G20","S5-G21"],
  }),/ILLEGALLY_PASSED/);
});

test("S6-G1 unresolved S5-G20/G21 fail closed even if a capability record is flipped to AUTHORISED",()=>{
  const baseRecords=[
    {capability:"REAL_DATA" as const,decision:"AUTHORISED" as const,decisionReference:"R1",dependencies:["S5-G20"]},
    {capability:"LIVE_PROVIDER" as const,decision:"AUTHORISED" as const,decisionReference:"R2",dependencies:["S5-G20","S5-G21"]},
    {capability:"DISTRIBUTION" as const,decision:"AUTHORISED" as const,decisionReference:"R3",dependencies:["S5-G20"]},
    {capability:"BIND_PAY" as const,decision:"NOT_AUTHORISED" as const,decisionReference:"R4",dependencies:["OUT_OF_SCOPE_SPRINT6"]},
  ];
  const model=buildSprint6ControlModel({activationRecords:baseRecords});
  assert.throws(()=>assertSprint6CapabilityActivationAllowed(model,"REAL_DATA",new Set(["S5-G20"])),/EXTERNAL_DEPENDENCY_BLOCKED:S5-G20/);
  assert.throws(()=>assertSprint6CapabilityActivationAllowed(model,"LIVE_PROVIDER",new Set(["S5-G20","S5-G21"])),/EXTERNAL_DEPENDENCY_BLOCKED:S5-G20/);
  assert.throws(()=>assertSprint6CapabilityActivationAllowed(model,"DISTRIBUTION",new Set(["S5-G20"])),/EXTERNAL_DEPENDENCY_BLOCKED:S5-G20/);
  assert.throws(()=>assertSprint6CapabilityActivationAllowed(model,"BIND_PAY",new Set()),/BIND_PAY_OUT_OF_SCOPE_SPRINT6/);
});

test("S6-G2 provider-neutral control model is versioned and activation decisions are independent",()=>{
  const model=buildSprint6ControlModel();
  assert.equal(model.version,SP6_CONTROL_MODEL_VERSION);
  assert.equal(model.inheritedClosure,SP6_INHERITED_CLOSURE);
  assert.equal(assertActivationIndependence(model.activationRegister),true);
  assert.deepEqual(
    model.activationRegister.records.map(r=>r.capability),
    ["REAL_DATA","LIVE_PROVIDER","DISTRIBUTION","BIND_PAY"],
  );
  assert.equal(model.activationRegister.records.every(r=>r.decision==="NOT_AUTHORISED"),true);
});

test("S6-G2 provider candidate schema exists without fabricating an S6-G3 candidate approval",()=>{
  const candidate=validateProviderCandidateShape({
    providerKey:"PROVIDER-CANDIDATE-EXAMPLE",
    counterpartyReference:"EXAMPLE-NON-AUTHORITY-REF",
    channel:"DIRECT_INSURER",
    targetEnvironment:"CERTIFICATION",
    proposedRouteKey:"EXAMPLE-CERT-ROUTE",
    adapterOwner:"engineering",
    technicalDocumentationReference:"EXAMPLE-DOC-REF",
    certificationOwner:"engineering",
    credentialReferenceNames:["EXAMPLE_CERT_CREDENTIAL_REF"],
    contractualAuthorityStatus:"PENDING",
    permittedTestDataClass:"SYNTHETIC",
  });
  assert.equal(candidate.contractualAuthorityStatus,"PENDING");
  assert.equal(candidate.targetEnvironment,"CERTIFICATION");
  assert.throws(()=>validateProviderCandidateShape({...candidate,providerKey:""}),/METADATA_INCOMPLETE/);
});
