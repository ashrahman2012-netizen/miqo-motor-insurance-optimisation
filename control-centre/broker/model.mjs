export function modelState(config){
  return config.openAiApiKey
    ? (config.openAiModel
      ? {state:"CONFIGURED_ANALYSIS_ONLY",model:config.openAiModel,mutationsEnabled:false,browserKeyPresent:false}
      : {state:"CONFIGURED_MODEL_REQUIRED",model:null,mutationsEnabled:false,browserKeyPresent:false})
    : {state:"NOT_CONFIGURED",model:null,mutationsEnabled:false,browserKeyPresent:false};
}

export async function modelReview(config,packet,githubSnapshot){
  if(!config.openAiApiKey)throw new Error("OPENAI_NOT_CONFIGURED");
  if(!config.openAiModel)throw new Error("OPENAI_MODEL_NOT_CONFIGURED");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),config.requestTimeoutMs*2);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+config.openAiApiKey,
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        model:config.openAiModel,
        store:false,
        input:[
          {
            role:"system",
            content:[{
              type:"input_text",
              text:"You are the MIQOS CC-2 analysis-only reviewer. Do not perform or claim repository mutations. Review the action packet and GitHub snapshot for scope, stale-head risk, gate dependencies, security-boundary violations, and the next safe read-only recommendation. Preserve SYNTHETIC_ONLY and human approval.",
            }],
          },
          {
            role:"user",
            content:[{
              type:"input_text",
              text:JSON.stringify({packet,githubSnapshot}),
            }],
          },
        ],
      }),
      signal:controller.signal,
    });
    const body=await response.json();
    if(!response.ok)throw new Error("OPENAI_HTTP_"+response.status);
    const outputText=body.output_text??(body.output??[])
      .flatMap(item=>item.content??[])
      .filter(item=>item.type==="output_text")
      .map(item=>item.text)
      .join("\n");
    return {
      responseId:body.id??null,
      model:body.model??config.openAiModel,
      outputText:outputText||null,
    };
  }finally{
    clearTimeout(timeout);
  }
}
