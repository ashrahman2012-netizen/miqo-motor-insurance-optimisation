import test from "node:test";
import assert from "node:assert/strict";
import {createProviderRegistry,ProviderRegistryError} from "../src/registry.ts";
import type {ProviderAdapter} from "../src/contracts.ts";

function adapter(overrides:Partial<ProviderAdapter["descriptor"]>={}):ProviderAdapter{
  return {
    descriptor:{
      providerKey:"MOCK-PROVIDER-001",
      adapterVersion:"mock-adapter-v1",
      synthetic:true,
      channels:["DIRECT_SYNTHETIC"],
      capabilities:{quotation:true,synchronous:true,cancellation:false},
      ...overrides,
    },
    async execute(){return {kind:"UNAVAILABLE",providerKey:"MOCK-PROVIDER-001",reasonCode:"TEST"}},
  };
}

test("EH3 registry resolves only an exact approved provider/channel/version",()=>{
  const registry=createProviderRegistry().register(adapter());
  assert.equal(registry.resolve({
    providerKey:"MOCK-PROVIDER-001",
    channelKey:"DIRECT_SYNTHETIC",
    adapterVersion:"mock-adapter-v1",
  }).descriptor.providerKey,"MOCK-PROVIDER-001");
});

test("EH3 registry rejects duplicate and unknown providers",()=>{
  const registry=createProviderRegistry().register(adapter());
  assert.throws(()=>registry.register(adapter()),(e:any)=>e instanceof ProviderRegistryError&&e.code==="DUPLICATE_PROVIDER_KEY");
  assert.throws(()=>registry.resolve({
    providerKey:"UNKNOWN",channelKey:"DIRECT_SYNTHETIC",adapterVersion:"v1",
  }),(e:any)=>e instanceof ProviderRegistryError&&e.code==="UNKNOWN_PROVIDER");
});

test("EH3 registry fails closed on unsupported channel and adapter version",()=>{
  const registry=createProviderRegistry().register(adapter());
  assert.throws(()=>registry.resolve({
    providerKey:"MOCK-PROVIDER-001",channelKey:"UNSUPPORTED",adapterVersion:"mock-adapter-v1",
  }),(e:any)=>e.code==="UNSUPPORTED_PROVIDER_CHANNEL");
  assert.throws(()=>registry.resolve({
    providerKey:"MOCK-PROVIDER-001",channelKey:"DIRECT_SYNTHETIC",adapterVersion:"wrong",
  }),(e:any)=>e.code==="ADAPTER_VERSION_MISMATCH");
});

test("EH3 synthetic registry rejects a live adapter",()=>{
  const registry=createProviderRegistry();
  assert.throws(()=>registry.register(adapter({providerKey:"LIVE-001",synthetic:false})),(e:any)=>e.code==="LIVE_PROVIDER_NOT_ALLOWED");
});
