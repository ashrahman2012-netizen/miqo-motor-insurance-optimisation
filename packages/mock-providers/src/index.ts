import { createHash } from "node:crypto";
import type {ProviderAdapter,ProviderExecutionRequest} from "../../provider-integration/src/contracts.ts";

export const MOCK_PROVIDER_KEY = "MOCK-PROVIDER-001";
export const MOCK_PROVIDER_VERSION = "mock-provider-v1";
export const MOCK_ADAPTER_VERSION = "mock-adapter-v1";

export type MockProviderFixtureKey = "STANDARD" | "INCOMPLETE";

export type MockProviderDelta = Readonly<{
  fieldId:string;
  value:unknown;
}>;

export type MockProviderInput = Readonly<{
  requestFingerprint:string;
  scenarioId:string;
  deltas:ReadonlyArray<MockProviderDelta>;
  fixtureKey?:MockProviderFixtureKey;
}>;

export type MockProviderResult = Readonly<{
  providerKey:typeof MOCK_PROVIDER_KEY;
  providerVersion:typeof MOCK_PROVIDER_VERSION;
  fixtureKey:MockProviderFixtureKey;
  providerReference:string;
  responseTimestamp:string;
  payloadText:string;
  payload:Readonly<Record<string,unknown>>;
  payloadSha256:string;
}>;

function findDelta(input:MockProviderInput,fieldId:string) {
  return input.deltas.find(delta=>delta.fieldId===fieldId)?.value;
}

function standardPayload(input:MockProviderInput,providerReference:string,responseTimestamp:string) {
  const voluntaryExcess=Number(findDelta(input,"voluntary_excess")??250);
  const paymentBasis=String(findDelta(input,"payment_structure")??"ANNUAL");
  const annualPremiumPence=voluntaryExcess>=500?70140:74218;
  const baseExcessPence=35000;
  const voluntaryExcessPence=Math.max(0,Math.trunc(voluntaryExcess*100));

  return {
    provider:"MOCK-PROVIDER-001",
    providerVersion:"mock-provider-v1",
    providerReference,
    responseTimestamp,
    quote:{
      annualPremiumPence,
      baseExcessPence,
      voluntaryExcessPence,
      totalExcessPence:baseExcessPence+voluntaryExcessPence,
      paymentBasis,
      coverageMarkers:["COMPREHENSIVE"],
    },
  };
}

function incompletePayload(providerReference:string,responseTimestamp:string) {
  return {
    provider:"MOCK-PROVIDER-001",
    providerVersion:"mock-provider-v1",
    providerReference,
    responseTimestamp,
    offer:{
      premium:{amountPence:68800},
      paymentBasis:"ANNUAL",
    },
    coverage:null,
  };
}

export function executeMockProvider(input:MockProviderInput):MockProviderResult {
  const fixtureKey=input.fixtureKey??"STANDARD";
  const providerReference=`MP001-${input.requestFingerprint.slice(0,16).toUpperCase()}`;
  const responseTimestamp="2026-09-18T12:00:00.000Z";
  const payload=fixtureKey==="INCOMPLETE"
    ? incompletePayload(providerReference,responseTimestamp)
    : standardPayload(input,providerReference,responseTimestamp);
  const payloadText=JSON.stringify(payload);
  const payloadSha256=createHash("sha256").update(payloadText,"utf8").digest("hex");

  return Object.freeze({
    providerKey:MOCK_PROVIDER_KEY,
    providerVersion:MOCK_PROVIDER_VERSION,
    fixtureKey,
    providerReference,
    responseTimestamp,
    payloadText,
    payload:Object.freeze(payload),
    payloadSha256,
  });
}

export const mockProviderAdapter:ProviderAdapter=Object.freeze({
  descriptor:Object.freeze({
    providerKey:MOCK_PROVIDER_KEY,
    adapterVersion:MOCK_ADAPTER_VERSION,
    synthetic:true,
    channels:Object.freeze(["DIRECT_SYNTHETIC","PCW_SYNTHETIC"]),
    capabilities:Object.freeze({
      quotation:true,
      synchronous:true,
      cancellation:false,
    }),
  }),
  async execute(request:ProviderExecutionRequest){
    const response=executeMockProvider({
      requestFingerprint:request.requestFingerprint,
      scenarioId:request.scenario.scenarioId,
      deltas:request.scenario.optimisationDeltas,
      fixtureKey:"STANDARD",
    });
    return Object.freeze({
      kind:"RESPONSE" as const,
      providerKey:response.providerKey,
      providerReference:response.providerReference,
      receivedAt:response.responseTimestamp,
      rawPayloadText:response.payloadText,
      rawPayload:response.payload,
      payloadSha256:response.payloadSha256,
      metadata:Object.freeze({
        providerVersion:response.providerVersion,
        fixtureKey:response.fixtureKey,
      }),
    });
  },
});
