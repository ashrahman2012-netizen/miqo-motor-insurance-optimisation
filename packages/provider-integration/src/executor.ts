import type {
  ProviderExecutionRequest,
  ProviderExecutionResult,
} from "./contracts.ts";
import {ProviderRegistry,ProviderRegistryError} from "./registry.ts";

const RESULT_KINDS=new Set(["RESPONSE","NO_QUOTE","TIMEOUT","UNAVAILABLE","ERROR"]);

export async function executeProvider(
  registry:ProviderRegistry,
  request:ProviderExecutionRequest,
  options:{timeoutMs?:number}={},
):Promise<ProviderExecutionResult>{
  const timeoutMs=Math.max(1,Math.trunc(options.timeoutMs??5000));
  let adapter;
  try{
    adapter=registry.resolve({
      providerKey:request.providerKey,
      channelKey:request.channelKey,
      adapterVersion:request.adapterVersion,
    });
  }catch(error){
    if(error instanceof ProviderRegistryError)throw error;
    throw new ProviderRegistryError("PROVIDER_RESOLUTION_FAILED");
  }

  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  const timeout=new Promise<ProviderExecutionResult>(resolve=>{
    timer=setTimeout(()=>{
      controller.abort();
      resolve(Object.freeze({kind:"TIMEOUT",providerKey:request.providerKey,timeoutMs}));
    },timeoutMs);
  });

  const execution=(async():Promise<ProviderExecutionResult>=>{
    try{
      const result=await adapter.execute(request,Object.freeze({
        signal:controller.signal,
        dataClassification:"SYNTHETIC" as const,
      }));
      if(!result||!RESULT_KINDS.has((result as any).kind)){
        return Object.freeze({kind:"ERROR",providerKey:request.providerKey,errorCode:"INVALID_PROVIDER_RESULT"});
      }
      if(result.providerKey!==request.providerKey){
        return Object.freeze({kind:"ERROR",providerKey:request.providerKey,errorCode:"PROVIDER_IDENTITY_MISMATCH"});
      }
      return result;
    }catch(error){
      if(controller.signal.aborted){
        return Object.freeze({kind:"TIMEOUT",providerKey:request.providerKey,timeoutMs});
      }
      return Object.freeze({
        kind:"ERROR",
        providerKey:request.providerKey,
        errorCode:error instanceof Error&&error.message?"ADAPTER_EXCEPTION":"ADAPTER_FAILURE",
      });
    }
  })();

  try{
    return await Promise.race([execution,timeout]);
  }finally{
    if(timer)clearTimeout(timer);
  }
}
