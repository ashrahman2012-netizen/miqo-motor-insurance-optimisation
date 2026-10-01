import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createConfig,detectGitHubToken,detectGitHubWriteToken,
} from "./config.mjs";
import { ActionStore } from "./store.mjs";
import { createGitHubReader } from "./github.mjs";
import { createGitHubWriter } from "./github-write.mjs";
import { createActionExecutor } from "./actions.mjs";
import { modelState } from "./model.mjs";

const MAX_BODY_BYTES=256*1024;
const readJson=async path=>JSON.parse(await readFile(path,"utf8"));

function allowedOrigin(origin){
  if(!origin||origin==="null")return true;
  try{
    const url=new URL(origin);
    return (url.hostname==="127.0.0.1"||url.hostname==="localhost")
      &&(url.protocol==="http:"||url.protocol==="https:");
  }catch{
    return false;
  }
}

function corsHeaders(req){
  const origin=req.headers.origin;
  return {
    "Access-Control-Allow-Origin":origin&&allowedOrigin(origin)?origin:"null",
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"content-type,x-miqos-request-id",
    "Access-Control-Allow-Private-Network":"true",
    "Access-Control-Max-Age":"600",
    "Cache-Control":"no-store",
    Vary:"Origin",
  };
}

function sendJson(req,res,status,body){
  const data=JSON.stringify(body);
  res.writeHead(status,{
    ...corsHeaders(req),
    "Content-Type":"application/json; charset=utf-8",
    "Content-Length":Buffer.byteLength(data),
  });
  res.end(data);
}

async function readBody(req){
  let size=0;
  const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;
    if(size>MAX_BODY_BYTES){
      const error=new Error("REQUEST_BODY_TOO_LARGE");
      error.statusCode=413;
      throw error;
    }
    chunks.push(chunk);
  }
  if(!chunks.length)return {};
  try{
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }catch{
    const error=new Error("INVALID_JSON");
    error.statusCode=400;
    throw error;
  }
}

function brokerMode(config,writer){
  const state=writer.state();
  if(config.cc3WritesEnabled&&state.state==="CONFIGURED"&&state.mutationsEnabled){
    return {mode:"CC3_GUARDED_WRITE",mutationsEnabled:true};
  }
  return {mode:"CC3_LOCKED",mutationsEnabled:false};
}

export async function createBroker(overrides={}){
  const config=createConfig(overrides);
  if(config.host!=="127.0.0.1")throw new Error("CC3_BIND_HOST_MUST_BE_LOOPBACK");

  const roadmap=await readJson(config.roadmapPath);
  const allowlist=await readJson(config.allowlistPath);
  const actionPolicy=await readJson(config.actionPolicyPath);
  const store=new ActionStore(config.actionStorePath);
  await store.load();

  const readAuth=detectGitHubToken();
  const writeAuth=detectGitHubWriteToken();
  const github=overrides.githubReader??createGitHubReader({config,roadmap,auth:readAuth});
  const writer=overrides.githubWriter??createGitHubWriter({
    config,roadmap,auth:writeAuth,fetchImpl:overrides.fetchImpl??fetch,
  });
  const executeAction=createActionExecutor({
    config,roadmap,allowlist,actionPolicy,store,github,writer,
  });

  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    if(origin&&!allowedOrigin(origin)){
      return sendJson(req,res,403,{error:"ORIGIN_NOT_ALLOWED"});
    }

    if(req.method==="OPTIONS"){
      res.writeHead(204,corsHeaders(req));
      return res.end();
    }

    const url=new URL(req.url??"/","http://"+(req.headers.host??"127.0.0.1"));
    try{
      if(req.method==="GET"&&url.pathname==="/api/status"){
        const snapshot=await github.snapshot();
        const targetHead=await github.resolveTargetHead();
        const mode=brokerMode(config,writer);
        return sendJson(req,res,200,{
          service:"MIQOS_CC3_AUTHORISED_GITHUB_BROKER",
          version:"0.3.0",
          health:"OK",
          mode:mode.mode,
          host:config.host,
          port:server.address()?.port??config.port,
          boundary:roadmap.boundary,
          repository:roadmap.repository,
          branch:roadmap.activeBranch,
          head:targetHead.head,
          headSource:targetHead.source,
          headMatchesRoadmap:targetHead.head===roadmap.activeHead,
          github:snapshot.connection,
          githubWrite:writer.state(),
          model:modelState(config),
          mutationsEnabled:mode.mutationsEnabled,
          observedAt:new Date().toISOString(),
        });
      }

      if(req.method==="GET"&&url.pathname==="/api/roadmap"){
        return sendJson(req,res,200,roadmap);
      }

      if(req.method==="GET"&&(url.pathname==="/api/github/status"||url.pathname==="/api/github/snapshot")){
        return sendJson(req,res,200,await github.snapshot({
          force:url.searchParams.get("refresh")==="1",
        }));
      }

      if(req.method==="POST"&&url.pathname==="/api/actions/execute"){
        const packet=await readBody(req);
        const result=await executeAction(packet);
        return sendJson(req,res,result.httpStatus,{action:result.record});
      }

      if(req.method==="GET"&&url.pathname.startsWith("/api/actions/")){
        const id=decodeURIComponent(url.pathname.slice("/api/actions/".length));
        const record=store.get(id);
        return record
          ?sendJson(req,res,200,{action:record})
          :sendJson(req,res,404,{error:"ACTION_NOT_FOUND"});
      }

      if(req.method==="GET"&&url.pathname==="/"){
        const mode=brokerMode(config,writer);
        return sendJson(req,res,200,{
          service:"MIQOS CC-3 Authorised GitHub Execution Broker",
          mode:mode.mode,
          statusEndpoint:"/api/status",
          roadmapEndpoint:"/api/roadmap",
          githubEndpoint:"/api/github/status",
          executeEndpoint:"/api/actions/execute",
          mutationsEnabled:mode.mutationsEnabled,
        });
      }

      return sendJson(req,res,404,{error:"NOT_FOUND"});
    }catch(error){
      return sendJson(req,res,Number(error.statusCode??500),{
        error:error.message??"INTERNAL_ERROR",
        details:error.details??undefined,
      });
    }
  });

  async function start(){
    await new Promise((ok,fail)=>{
      server.once("error",fail);
      server.listen(config.port,config.host,()=>{
        server.off("error",fail);
        ok();
      });
    });
    return server.address();
  }

  async function close(){
    if(!server.listening)return;
    await new Promise((ok,fail)=>server.close(error=>error?fail(error):ok()));
  }

  return {
    config,roadmap,allowlist,actionPolicy,store,github,writer,
    server,start,close,executeAction,
  };
}

async function main(){
  const broker=await createBroker();
  const address=await broker.start();
  const github=await broker.github.snapshot();
  const mode=brokerMode(broker.config,broker.writer);

  console.log("MIQOS CC-3 Authorised GitHub Execution Broker");
  console.log("Listening: http://"+address.address+":"+address.port);
  console.log("Repository: "+broker.roadmap.repository);
  console.log("Target branch: "+broker.roadmap.activeBranch);
  console.log("Expected head: "+broker.roadmap.activeHead);
  console.log("GitHub read: "+github.connection.state+" ("+(github.connection.authSource??"none")+")");
  console.log("GitHub write identity: "+broker.writer.state().state+" ("+(broker.writer.state().authSource??"none")+")");
  console.log("Mode: "+mode.mode);
  console.log("Mutations: "+(mode.mutationsEnabled?"GUARDED / ALLOW-LISTED":"LOCKED"));
}

const invoked=process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href;
if(invoked){
  main().catch(error=>{
    console.error("CC3_BROKER_START_FAILED: "+error.message);
    process.exitCode=1;
  });
}
