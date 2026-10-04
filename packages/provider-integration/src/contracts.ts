export type ProviderChannelKey=string;

export type ProviderDescriptor=Readonly<{
  providerKey:string;
  adapterVersion:string;
  synthetic:boolean;
  channels:ReadonlyArray<ProviderChannelKey>;
  capabilities:Readonly<{
    quotation:boolean;
    synchronous:boolean;
    cancellation:boolean;
  }>;
}>;

export type ProviderExecutionRequest=Readonly<{
  schemaVersion:"1.0";
  quoteRequestId:string;
  requestFingerprint:string;
  providerKey:string;
  channelKey:string;
  adapterVersion:string;
  mappingVersion:string;
  scenario:Readonly<{
    scenarioId:string;
    optimisationDeltas:ReadonlyArray<Readonly<{fieldId:string;value:unknown}>>;
  }>;
  canonicalInput:Readonly<Record<string,unknown>>;
}>;

export type ProviderExecutionContext=Readonly<{
  signal:AbortSignal;
  dataClassification:"SYNTHETIC";
}>;

export type ProviderResponseResult=Readonly<{
  kind:"RESPONSE";
  providerKey:string;
  providerReference:string;
  receivedAt:string;
  rawPayloadText:string;
  rawPayload:unknown;
  payloadSha256:string;
  metadata?:Readonly<Record<string,unknown>>;
}>;

export type ProviderNoQuoteResult=Readonly<{
  kind:"NO_QUOTE";
  providerKey:string;
  reasonCode:string;
  receivedAt:string;
}>;

export type ProviderTimeoutResult=Readonly<{
  kind:"TIMEOUT";
  providerKey:string;
  timeoutMs:number;
}>;

export type ProviderUnavailableResult=Readonly<{
  kind:"UNAVAILABLE";
  providerKey:string;
  reasonCode:string;
}>;

export type ProviderErrorResult=Readonly<{
  kind:"ERROR";
  providerKey:string;
  errorCode:string;
}>;

export type ProviderExecutionResult=
  | ProviderResponseResult
  | ProviderNoQuoteResult
  | ProviderTimeoutResult
  | ProviderUnavailableResult
  | ProviderErrorResult;

export interface ProviderAdapter {
  readonly descriptor:ProviderDescriptor;
  execute(request:ProviderExecutionRequest,context:ProviderExecutionContext):Promise<ProviderExecutionResult>;
}
