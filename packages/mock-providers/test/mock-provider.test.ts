import test from "node:test";
import assert from "node:assert/strict";
import {createProviderRegistry,executeProvider} from "../../provider-integration/src/index.ts";
import { executeMockProvider, mockProviderAdapter } from "../src/index.ts";

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

test("EH3 mock adapter executes through the provider-neutral registry",async()=>{
  const registry=createProviderRegistry().register(mockProviderAdapter);
  const result=await executeProvider(registry,{
    schemaVersion:"1.0",
    quoteRequestId:"QREQ-SYN-001",
    requestFingerprint:input.requestFingerprint,
    providerKey:"MOCK-PROVIDER-001",
    channelKey:"DIRECT_SYNTHETIC",
    adapterVersion:"mock-adapter-v1",
    mappingVersion:"mock-mapping-v1",
    scenario:{scenarioId:input.scenarioId,optimisationDeltas:input.deltas},
    canonicalInput:{annual_mileage:8000,main_driver_id:"DRV-SYN-001"},
  });
  assert.equal(result.kind,"RESPONSE");
  if(result.kind==="RESPONSE"){
    assert.equal(result.providerReference,"MP001-0123456789ABCDEF");
    assert.equal((result.rawPayload as any).quote.annualPremiumPence,70140);
  }
});
