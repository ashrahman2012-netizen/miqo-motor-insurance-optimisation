import test from "node:test";
import assert from "node:assert/strict";
import { executeMockProvider } from "../src/index.ts";

const input={
  requestFingerprint:"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  scenarioId:"SCN-SYN-001",
  deltas:[
    {fieldId:"payment_structure",value:"ANNUAL"},
    {fieldId:"voluntary_excess",value:500},
  ],
} as const;

test("MOCK-PROVIDER-001 returns a deterministic standard fixture",()=>{
  const one=executeMockProvider(input);
  const two=executeMockProvider(input);
  assert.deepEqual(two,one);
  assert.equal(one.providerReference,"MP001-0123456789ABCDEF");
  assert.equal(one.responseTimestamp,"2026-09-18T12:00:00.000Z");
  assert.equal((one.payload as any).quote.annualPremiumPence,70140);
  assert.equal((one.payload as any).quote.baseExcessPence,35000);
  assert.equal((one.payload as any).quote.voluntaryExcessPence,50000);
  assert.equal((one.payload as any).quote.totalExcessPence,85000);
  assert.equal(one.payloadSha256.length,64);
  assert.deepEqual(JSON.parse(one.payloadText),one.payload);
});

test("MOCK-PROVIDER-001 exposes a deterministic materially different incomplete fixture",()=>{
  const one=executeMockProvider({...input,fixtureKey:"INCOMPLETE"});
  const two=executeMockProvider({...input,fixtureKey:"INCOMPLETE"});
  assert.deepEqual(two,one);
  assert.equal((one.payload as any).coverage,null);
  assert.equal((one.payload as any).offer.premium.amountPence,68800);
  assert.equal((one.payload as any).quote,undefined);
});
