import test from "node:test";
import assert from "node:assert/strict";
import type {
  ProviderExecutionRequest,
  ProviderExecutionResult,
} from "../src/contracts.ts";

test("EH3 request contract carries canonical facts and optimisation deltas without provider credentials",()=>{
  const request:ProviderExecutionRequest={
    schemaVersion:"1.0",
    quoteRequestId:"QREQ-1",
    requestFingerprint:"a".repeat(64),
    providerKey:"MOCK-PROVIDER-001",
    channelKey:"DIRECT_SYNTHETIC",
    adapterVersion:"mock-adapter-v1",
    mappingVersion:"mock-mapping-v1",
    scenario:{scenarioId:"SCN-1",optimisationDeltas:[{fieldId:"voluntary_excess",value:500}]},
    canonicalInput:{annual_mileage:8000,main_driver_id:"DRV-SYN-001"},
  };
  const serialized=JSON.stringify(request);
  assert.match(serialized,/annual_mileage/);
  assert.match(serialized,/voluntary_excess/);
  assert.equal(/token|secret|authorization|password/i.test(serialized),false);
});

test("EH3 outcome vocabulary keeps non-response states distinct",()=>{
  const outcomes:ProviderExecutionResult[]=[
    {kind:"NO_QUOTE",providerKey:"P",reasonCode:"DECLINED",receivedAt:"2026-10-04T00:00:00.000Z"},
    {kind:"TIMEOUT",providerKey:"P",timeoutMs:10},
    {kind:"UNAVAILABLE",providerKey:"P",reasonCode:"DISABLED"},
    {kind:"ERROR",providerKey:"P",errorCode:"ADAPTER_EXCEPTION"},
  ];
  assert.deepEqual(outcomes.map(item=>item.kind),["NO_QUOTE","TIMEOUT","UNAVAILABLE","ERROR"]);
  assert.ok(outcomes.every(item=>item.kind!=="RESPONSE"));
});
