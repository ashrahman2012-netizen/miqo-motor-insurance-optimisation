import {buildApp} from "../apps/api/src/server.ts";

async function main(){
  const app=await buildApp();
  const port=Number(process.env.PORT??4000);
  await app.listen({host:"127.0.0.1",port});

  let closing=false;
  const shutdown=async(signal:string)=>{
    if(closing)return;
    closing=true;
    app.log.info({signal},"Desktop API sidecar shutdown");
    try{
      await app.close();
      process.exitCode=0;
    }catch(error){
      app.log.error({err:error},"Desktop API sidecar shutdown failed");
      process.exitCode=1;
    }
  };

  process.once("SIGTERM",()=>{void shutdown("SIGTERM");});
  process.once("SIGINT",()=>{void shutdown("SIGINT");});
}

main().catch(error=>{
  console.error("MIQO desktop API startup failed",error);
  process.exit(1);
});
