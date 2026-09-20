import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RESILIENCE_POLICY,IdempotencyLedger,ImmutableEvidenceStore,assertBoundedPolicy,
  assertEvidenceIntegrity,deterministicRetrySchedule,makeRawEvidence,nextCircuitState,
  recommendationInputFromProviderResults,
} from "../src/sp5-resilience.ts";

test("S5-G5 bounded timeout rate-limit retry and circuit policy",()=>{
  assert.doesNotThrow(()=>assertBoundedPolicy(DEFAULT_RESILIENCE_POLICY));
  assert.deepEqual(deterministicRetrySchedule(DEFAULT_RESILIENCE_POLICY),[100,200]);
  assert.throws(()=>assertBoundedPolicy({...DEFAULT_RESILIENCE_POLICY,maxAttempts:6}),/ATTEMPTS_OUT_OF_BOUNDS/);
  assert.throws(()=>assertBoundedPolicy({...DEFAULT_RESILIENCE_POLICY,timeoutMs:10001}),/TIMEOUT_OUT_OF_BOUNDS/);
  assert.equal(nextCircuitState({state:"CLOSED",consecutiveFailures:3,policy:DEFAULT_RESILIENCE_POLICY}),"OPEN");
  assert.equal(nextCircuitState({state:"HALF_OPEN",consecutiveFailures:3,policy:DEFAULT_RESILIENCE_POLICY,probeSucceeded:true}),"CLOSED");
});

test("S5-G6 idempotency suppresses duplicate execution and rejects payload conflict",()=>{
  const ledger=new IdempotencyLedger<number>(); let calls=0;
  const first=ledger.execute("quote:1",{scenario:"A"},()=>++calls);
  const replay=ledger.execute("quote:1",{scenario:"A"},()=>++calls);
  assert.deepEqual(first,{replayed:false,result:1});
  assert.deepEqual(replay,{replayed:true,result:1});
  assert.equal(calls,1);
  assert.throws(()=>ledger.execute("quote:1",{scenario:"B"},()=>++calls),/PAYLOAD_CONFLICT/);
});

test("S5-G7 raw provider evidence is immutable correlated and survives restore",()=>{
  const evidence=makeRawEvidence({evidenceId:"EV-1",requestId:"REQ-1",requestHash:"RH-1",routeKey:"ROUTE-1",providerKey:"P-1",adapterVersion:"a1",mappingVersion:"m1",capturedAt:"2026-09-20T00:00:00Z",rawResponse:{premiumPence:12345,status:"quoted"}});
  assert.doesNotThrow(()=>assertEvidenceIntegrity(evidence));
  const store=new ImmutableEvidenceStore(); store.append(evidence);
  assert.throws(()=>store.append(evidence),/RAW_EVIDENCE_IMMUTABLE/);
  const restored=ImmutableEvidenceStore.restore(store.export());
  assert.deepEqual(restored.get("EV-1"),evidence);
  assert.equal(Object.isFrozen(restored.get("EV-1")!.rawResponse),true);
  assert.throws(()=>assertEvidenceIntegrity({...evidence,rawResponse:{premiumPence:1}}),/HASH_MISMATCH/);
});

test("S5-G8 provider outage is excluded rather than converted into recommendation evidence",()=>{
  const input=recommendationInputFromProviderResults([
    {routeKey:"A",status:"SUCCESS" as const,quote:{premiumPence:30000}},
    {routeKey:"B",status:"OUTAGE" as const},
    {routeKey:"C",status:"SUCCESS" as const,quote:{premiumPence:25000}},
  ]);
  assert.deepEqual(input,[{routeKey:"A",quote:{premiumPence:30000}},{routeKey:"C",quote:{premiumPence:25000}}]);
  assert.equal(input.some(x=>x.routeKey==="B"),false);
});
