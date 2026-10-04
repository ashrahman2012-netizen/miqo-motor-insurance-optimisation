export function systemMapNodes(canonicalState){
  const components=canonicalState?.components??{};
  return Object.entries(components).map(([id,value])=>({
    id,
    status:value.status??"UNKNOWN",
    updatedAt:value.updatedAt??canonicalState?.updatedAt??null,
    source:value.source??"control-centre",
    message:value.message??null,
    revision:canonicalState?.revision??0,
  }));
}
