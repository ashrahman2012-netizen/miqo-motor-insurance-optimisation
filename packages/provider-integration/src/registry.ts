import type {ProviderAdapter} from "./contracts.ts";

export class ProviderRegistryError extends Error{
  constructor(public readonly code:string){
    super(code);
    this.name="ProviderRegistryError";
  }
}

export class ProviderRegistry{
  private readonly adapters=new Map<string,ProviderAdapter>();

  constructor(private readonly syntheticOnly=true){}

  register(adapter:ProviderAdapter){
    const descriptor=adapter.descriptor;
    if(!descriptor?.providerKey)throw new ProviderRegistryError("PROVIDER_KEY_REQUIRED");
    if(this.adapters.has(descriptor.providerKey))throw new ProviderRegistryError("DUPLICATE_PROVIDER_KEY");
    if(this.syntheticOnly&&!descriptor.synthetic)throw new ProviderRegistryError("LIVE_PROVIDER_NOT_ALLOWED");
    if(!descriptor.capabilities?.quotation)throw new ProviderRegistryError("QUOTATION_CAPABILITY_REQUIRED");
    this.adapters.set(descriptor.providerKey,adapter);
    return this;
  }

  resolve(args:{providerKey:string;channelKey:string;adapterVersion:string}){
    const adapter=this.adapters.get(args.providerKey);
    if(!adapter)throw new ProviderRegistryError("UNKNOWN_PROVIDER");
    const descriptor=adapter.descriptor;
    if(descriptor.adapterVersion!==args.adapterVersion)throw new ProviderRegistryError("ADAPTER_VERSION_MISMATCH");
    if(!descriptor.channels.includes(args.channelKey))throw new ProviderRegistryError("UNSUPPORTED_PROVIDER_CHANNEL");
    if(this.syntheticOnly&&!descriptor.synthetic)throw new ProviderRegistryError("LIVE_PROVIDER_NOT_ALLOWED");
    return adapter;
  }

  list(){
    return [...this.adapters.values()].map(adapter=>structuredClone(adapter.descriptor));
  }
}

export function createProviderRegistry(options:{syntheticOnly?:boolean}={}){
  return new ProviderRegistry(options.syntheticOnly??true);
}
