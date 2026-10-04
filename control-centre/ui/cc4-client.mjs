export function createCC4Client({baseUrl="http://127.0.0.1:4300",state,onEvent,onNotification,onTransport}={}){
  let source=null;
  let pollTimer=null;
  let stopped=false;
  let failures=0;

  async function poll(){
    if(stopped)return;
    try{
      const response=await fetch(baseUrl+"/api/state",{cache:"no-store"});
      if(!response.ok)throw new Error("CC4_STATE_HTTP_"+response.status);
      state?.set(await response.json());
      failures=0;
      onTransport?.("REFRESHING");
    }catch{
      failures++;
      onTransport?.("DEGRADED");
    }
  }

  function startPolling(){
    if(pollTimer)return;
    poll();
    pollTimer=setInterval(poll,Math.min(30000,10000+failures*5000));
  }

  function stopPolling(){
    if(pollTimer){clearInterval(pollTimer);pollTimer=null}
  }

  function connect(){
    if(stopped||typeof EventSource==="undefined"){startPolling();return}
    onTransport?.("CONNECTING");
    source=new EventSource(baseUrl+"/api/events/stream");
    source.addEventListener("state",event=>state?.set(JSON.parse(event.data)));
    source.addEventListener("cc4",event=>onEvent?.(JSON.parse(event.data)));
    source.addEventListener("notification",event=>onNotification?.(JSON.parse(event.data)));
    source.onopen=()=>{failures=0;stopPolling();onTransport?.("LIVE")};
    source.onerror=()=>{
      failures++;
      onTransport?.("DEGRADED");
      startPolling();
    };
  }

  connect();
  return {
    async acknowledge(id){
      const response=await fetch(baseUrl+"/api/notifications/"+encodeURIComponent(id)+"/ack",{method:"POST"});
      if(!response.ok)throw new Error("CC4_ACK_HTTP_"+response.status);
      return response.json();
    },
    close(){stopped=true;stopPolling();source?.close();source=null;onTransport?.("DISCONNECTED")},
  };
}
