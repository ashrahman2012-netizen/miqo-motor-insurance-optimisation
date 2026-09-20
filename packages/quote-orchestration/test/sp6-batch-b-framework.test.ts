import test from "node:test";
import assert from "node:assert/strict";
import {
  assertMappingProvenance,
  assertProviderCandidateApprovedForCertification,
  bindContractToApprovedCandidate,
  buildCertificationEvidence,
  buildProviderNeutralCertificationContract,
  certificationContractFingerprint,
  validatePayloadAgainstSchema,
} from "../src/sp6-provider-certification.ts";

const requestSchema={schemaVersion:"request-v1",fields:["occupation","voluntaryExcess","protocolVersion"],requiredFields:["occupation","voluntaryExcess","protocolVersion"],unknownFieldPolicy:"REJECT" as const};
const responseSchema={schemaVersion:"response-v1",fields:["premiumPence","providerReference"],requiredFields:["premiumPence","providerReference"],unknownFieldPolicy:"IGNORE_WITH_EVIDENCE" as const};
const provenance=[
  {providerField:"occupation",semantic:"CUSTOMER_FACT" as const,sourceClass:"FACT" as const,sourcePath:"facts.occupation"},
  {providerField:"voluntaryExcess",semantic:"CUSTOMER_OPTION" as const,sourceClass:"OPTION" as const,sourcePath:"options.voluntary_excess"},
  {providerField:"protocolVersion",semantic:"PROTOCOL_CONSTANT" as const,sourceClass:"DERIVED_CONSTANT" as const,constantValue:"1"},
];

test("S6-G4 framework requires explicit field provenance and forbids invented factual constants",()=>{
  assert.equal(assertMappingProvenance(provenance),true);
  assert.throws(()=>assertMappingProvenance([
    {providerField:"occupation",semantic:"CUSTOMER_FACT",sourceClass:"DERIVED_CONSTANT",constantValue:"ENGINEER"},
  ]),/FACT_MUST_HAVE_FACT_SOURCE/);
  assert.throws(()=>assertMappingProvenance([
    ...provenance,
    {providerField:"occupation",semantic:"CUSTOMER_FACT",sourceClass:"FACT",sourcePath:"facts.occupation"},
  ]),/DUPLICATE_FIELD/);
});

test("S6-G5 framework versions schemas and makes unknown-field semantics explicit",()=>{
  assert.deepEqual(validatePayloadAgainstSchema(requestSchema,{occupation:"SOFTWARE_ENGINEER",voluntaryExcess:500,protocolVersion:"1"}).unknownFields,[]);
  assert.throws(()=>validatePayloadAgainstSchema(requestSchema,{occupation:"SOFTWARE_ENGINEER",voluntaryExcess:500,protocolVersion:"1",invented:true}),/UNKNOWN_FIELD:invented/);
  const result=validatePayloadAgainstSchema(responseSchema,{premiumPence:12345,providerReference:"REF",providerMessage:"test"});
  assert.deepEqual(result.unknownFields,["providerMessage"]);
  assert.equal(result.policy,"IGNORE_WITH_EVIDENCE");
  assert.throws(()=>validatePayloadAgainstSchema(responseSchema,{providerReference:"REF"}),/REQUIRED_FIELD_MISSING:premiumPence/);
});

test("S6-G4/G5 provider-neutral certification contract is deterministic but cannot become provider-ready without external candidate evidence",()=>{
  const contract=buildProviderNeutralCertificationContract({
    providerKey:"PROVIDER-UNBOUND",
    routeKey:"ROUTE-UNBOUND",
    adapterVersion:"adapter-v1",
    mappingVersion:"mapping-v1",
    requestSchema,responseSchema,fieldProvenance:provenance,
  });
  assert.match(contract.mappingFingerprint,/^[a-f0-9]{64}$/);
  assert.match(contract.schemaFingerprint,/^[a-f0-9]{64}$/);
  assert.match(certificationContractFingerprint(contract),/^[a-f0-9]{64}$/);
  const candidate={
    providerKey:"PROVIDER-UNBOUND",counterpartyReference:"COUNTERPARTY-REF",channel:"DIRECT_INSURER" as const,
    targetEnvironment:"CERTIFICATION" as const,proposedRouteKey:"ROUTE-UNBOUND",adapterOwner:"owner",
    technicalDocumentationReference:"DOC",certificationOwner:"owner",credentialReferenceNames:["CERT_REF"],
    contractualAuthorityStatus:"PENDING" as const,permittedTestDataClass:"SYNTHETIC" as const,
  };
  assert.throws(()=>assertProviderCandidateApprovedForCertification({candidate,evidenceClass:"EXTERNAL_PROVIDER",externalEvidenceReference:"",approvedForCertification:true}),/EVIDENCE_REFERENCE_REQUIRED/);
  assert.throws(()=>bindContractToApprovedCandidate(contract,{candidate,evidenceClass:"EXTERNAL_PROVIDER",externalEvidenceReference:"EXT-REF",approvedForCertification:false}),/CERTIFICATION_APPROVAL_REQUIRED/);
});

test("S6-G6 framework fingerprints complete reconstruction evidence",()=>{
  const h="a".repeat(64);
  const evidence=buildCertificationEvidence({
    contractFingerprint:h,
    certificationRequestId:"CERT-REQ-1",
    rawResponseHash:"b".repeat(64),
    normalisationFingerprint:"c".repeat(64),
    recommendationFingerprint:"d".repeat(64),
  });
  assert.match(evidence.evidenceFingerprint,/^[a-f0-9]{64}$/);
  assert.throws(()=>buildCertificationEvidence({...evidence,rawResponseHash:"bad"}),/FINGERPRINT_INVALID:rawResponseHash/);
});
