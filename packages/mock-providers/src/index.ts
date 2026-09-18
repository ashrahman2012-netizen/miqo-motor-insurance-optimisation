import { createHash } from "node:crypto";

export const MOCK_PROVIDER_KEY = "MOCK-PROVIDER-001";
export const MOCK_PROVIDER_VERSION = "mock-provider-v1";

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
