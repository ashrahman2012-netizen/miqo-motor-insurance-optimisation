import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOperationalEvent,buildProvenanceEnvelope,assertProvenanceEnvelope,
  certifyIncidentExercise,recommendationWithCommercialSeparation,
  SP5_INCIDENT_RUNBOOK_VERSION,
} from "../src/sp5-assurance.ts";

const quotes=[
  {normalisedQuoteId:"NQ-A",quoteRequestId:"REQ-A",scenarioId:"SC-A",marketRouteId:"MR-A",routeKey:"A",comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:30000,financeCostPence:0,compulsoryExcessPence:25000,voluntaryExcessPence:25000,paymentStructure:"ANNUAL"},
  {normalisedQuoteId:"NQ-B",quoteRequestId:"REQ-B",scenarioId:"SC-B",marketRouteId:"MR-B",routeKey:"B",comparisonState:"DIRECTLY_COMPARABLE" as const,annualCashPremiumPence:28000,financeCostPence:0,compulsoryExcessPence:25000,voluntaryExcessPence:25000,paymentStructure:"ANNUAL"},
];

test("S5-G16 commercial perturbation cannot influence recommendation ordering",()=>{
  const base={objectiveId:"LOWEST_ANNUAL_PREMIUM" as const,objectiveVersion:"obj-v1",catalogueVersion:"cat-v1",policyFingerprint:"pf",explorationFingerprint:"ef",quotes};
  const lowCommission=recommendationWithCommercialSeparation({...base,commercialTerms:{A:{commissionPence:0,referralFeePence:0,miqoMarginPence:0},B:{commissionPence:0,referralFeePence:0,miqoMarginPence:0}}});
  const invertedCommercial=recommendationWithCommercialSeparation({...base,commercialTerms:{A:{commissionPence:999999,referralFeePence:999999,miqoMarginPence:999999},B:{commissionPence:1,referralFeePence:1,miqoMarginPence:1}}});
  assert.equal(lowCommission.surfacedNormalisedQuoteId,"NQ-B");
  assert.equal(invertedCommercial.surfacedNormalisedQuoteId,"NQ-B");
  assert.equal(lowCommission.recommendationFingerprint,invertedCommercial.recommendationFingerprint);
});

test("S5-G17 material recommendation provenance is reconstructable and tamper evident",()=>{
  const envelope=buildProvenanceEnvelope({recommendationSetId:"RS-1",recommendationFingerprint:"RF-1",explanationFingerprint:"XF-1",objectiveId:"LOWEST_ANNUAL_PREMIUM",objectiveVersion:"obj-v1",normalisedQuoteId:"NQ-B",rawEvidenceId:"RAW-1",quoteRequestId:"REQ-B",scenarioId:"SC-B",marketRouteId:"MR-B",routeKey:"B",providerKey:"P-B",adapterVersion:"a1",mappingVersion:"m1"});
  assert.doesNotThrow(()=>assertProvenanceEnvelope(envelope));
  assert.throws(()=>assertProvenanceEnvelope({...envelope,trace:{...envelope.trace,adapterVersion:"tampered"}}),/PROVENANCE_TRACE_TAMPERED/);
});

test("S5-G18 observability is correlated redacted and separate from decision evidence",()=>{
  const event=buildOperationalEvent({correlationId:"CORR-1",eventType:"provider.request",status:"FAILED",detail:"Bearer abc.def.ghi password=hunter2",dimensions:{routeKey:"A",adapterVersion:"a1"}});
  assert.equal(event.correlationId,"CORR-1");
  assert.equal(event.decisionEvidence,false);
  assert.equal(event.detail.includes("abc.def.ghi"),false);
  assert.equal(event.detail.includes("hunter2"),false);
  assert.throws(()=>buildOperationalEvent({correlationId:"",eventType:"x",status:"OK",detail:"ok"}),/CORRELATION_REQUIRED/);
  assert.throws(()=>buildOperationalEvent({correlationId:"C",eventType:"x",status:"OK",detail:"ok",dimensions:{email:"x@example.test"}}),/SENSITIVE_DIMENSION_FORBIDDEN/);
});

test("S5-G19 provider incident exercise requires containment recovery replay and recommendation verification",()=>{
  const evidence={exerciseId:"EX-OUTAGE-001",runbookVersion:SP5_INCIDENT_RUNBOOK_VERSION,incidentType:"PROVIDER_OUTAGE" as const,affectedRequestIds:["REQ-A"],replayKeys:["quote:REQ-A"],detected:true,isolated:true,recovered:true,replayVerified:true,recommendationIntegrityVerified:true};
  const certified=certifyIncidentExercise(evidence);
  assert.match(certified.certificationFingerprint,/^[a-f0-9]{64}$/);
  assert.throws(()=>certifyIncidentExercise({...evidence,replayVerified:false}),/REPLAY_NOT_VERIFIED/);
  assert.throws(()=>certifyIncidentExercise({...evidence,recommendationIntegrityVerified:false}),/RECOMMENDATION_INTEGRITY_UNVERIFIED/);
});
