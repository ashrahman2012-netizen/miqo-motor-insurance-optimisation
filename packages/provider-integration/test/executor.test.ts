import test from "node:test";
import assert from "node:assert/strict";
import {createProviderRegistry} from "../src/registry.ts";
import {executeProvider} from "../src/executor.ts";
import type {ProviderAdapter,ProviderExecutionRequest,ProviderExecutionResult} from "../src/contracts.ts";

const request:ProviderExecutionRequest={
  schemaVersion:"1.0",
  quoteRequestId:"QREQ-1",
  requestFingerprint:"a".repeat(64),
  providerKey:"MOCK-PROVIDER-001",
  channelKey:"DIRECT_SYNTHETIC",
  adapterVersion:"mock-adapter-v1",
  mappingVersion:"mock-mapping-v1",
  scenario:{scenarioId:"SCN-1",optimisationDeltas:[]},
  canonicalInput:{annual_mileage:8000},
};

function adapter(execute:ProviderAdapter["execute"]):ProviderAdapter{
  return {
    descriptor:{
      providerKey:"MOCK-PROVIDER-001",
      adapterVersion:"mock-adapter-v1",
      synthetic:true,
      channels:["DIRECT_SYNTHETIC"],
      capabilities:{quotation:true,synchronous:true,cancellation:true},
    },
    execute,
  };
}

async function run(result:ProviderExecutionResult){
  const registry=createProviderRegistry().register(adapter(async()=>result));
  return executeProvider(registry,request,{timeoutMs:50});
}

test("EH3 executor preserves RESPONSE and NO_QUOTE as different outcomes",async()=>{
  const response=await run({
    kind:"RESPONSE",providerKey:"MOCK-PROVIDER-001",providerReference:"REF-1",
    receivedAt:"2026-10-04T00:00:00.000Z",rawPayloadText:"{}",rawPayload:{},payloadSha256:"a".repeat(64),
  });
  const noQuote=await run({
    kind:"NO_QUOTE",providerKey:"MOCK-PROVIDER-001",reasonCode:"DECLINED",receivedAt:"2026-10-04T00:00:00.000Z",
  });
  assert.equal(response.kind,"RESPONSE");
  assert.equal(noQuote.kind,"NO_QUOTE");
});

test("EH3 executor preserves UNAVAILABLE without fabricating a response",async()=>{
  const result=await run({kind:"UNAVAILABLE",providerKey:"MOCK-PROVIDER-001",reasonCode:"DISABLED"});
  assert.equal(result.kind,"UNAVAILABLE");
  assert.equal((result as any).rawPayload,undefined);
});

test("EH3 executor normalizes adapter exceptions to ERROR",async()=>{
  const registry=createProviderRegistry().register(adapter(async()=>{throw new Error("provider secret detail")}));
  const result=await executeProvider(registry,request,{timeoutMs:50});
  assert.deepEqual(result,{kind:"ERROR",providerKey:"MOCK-PROVIDER-001",errorCode:"ADAPTER_EXCEPTION"});
  assert.equal(JSON.stringify(result).includes("provider secret detail"),false);
});

test("EH3 executor enforces a bounded timeout and abort signal",async()=>{
  let observedSignal:AbortSignal|undefined;
  const registry=createProviderRegistry().register(adapter(async(_request,context)=>{
    observedSignal=context.signal;
    await new Promise(()=>{});
    return {kind:"UNAVAILABLE",providerKey:"MOCK-PROVIDER-001",reasonCode:"NEVER"};
  }));
  const result=await executeProvider(registry,request,{timeoutMs:5});
  assert.deepEqual(result,{kind:"TIMEOUT",providerKey:"MOCK-PROVIDER-001",timeoutMs:5});
  assert.equal(observedSignal?.aborted,true);
});

test("EH3 executor rejects provider identity substitution",async()=>{
  const registry=createProviderRegistry().register(adapter(async()=>({
    kind:"NO_QUOTE",providerKey:"OTHER-PROVIDER",reasonCode:"DECLINED",receivedAt:"2026-10-04T00:00:00.000Z",
  })));
  const result=await executeProvider(registry,request,{timeoutMs:50});
  assert.deepEqual(result,{kind:"ERROR",providerKey:"MOCK-PROVIDER-001",errorCode:"PROVIDER_IDENTITY_MISMATCH"});
});
