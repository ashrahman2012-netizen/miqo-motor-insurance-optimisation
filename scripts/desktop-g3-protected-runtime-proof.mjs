import {createHash,randomBytes} from "node:crypto";
import {spawn} from "node:child_process";
import {mkdir,readFile,rm,stat} from "node:fs/promises";
import path from "node:path";

const ROOT=process.cwd();
const PROOF=path.join(ROOT,"dist","desktop-g3-g3.3-proof");
const STORE=path.join(PROOF,"protected-store.enc");
const METRICS=path.join(PROOF,"checkpoint-metrics.jsonl");
const MIGRATIONS=path.join(ROOT,"packages","db","migrations");
const PORT=4400;
const BASE=`http://127.0.0.1:${PORT}`;
const ADMIN_KEY="DB-G10-SYNTHETIC-ADMIN";
const MARKER="G3_PROTECTED_VALUE_7F2A9D13";
const key=randomBytes(32);

await rm(PROOF,{recursive:true,force:true});
await mkdir(PROOF,{recursive:true});

let child;

function sha256(data){
  return createHash("sha256").update(data).digest("hex");
}

async function fileHash(){
  return sha256(await readFile(STORE));
}

async function exists(file){
  try{await stat(file);return true;}catch{return false;}
}

function spawnApi(){
  const c=spawn(process.execPath,["--experimental-strip-types","apps/api/src/server.ts"],{
    cwd:ROOT,
    env:{
      ...process.env,
      PORT:String(PORT),
      MIQO_DB_BACKEND:"pglite-protected",
      MIQO_PGLITE_PROTECTED_STORE:STORE,
      MIQO_MIGRATIONS_DIR:MIGRATIONS,
      MIQO_PGLITE_KEY_FD:"3",
      MIQO_G3_CHECKPOINT_METRICS_FILE:METRICS,
      MIQO_DATA_CLASSIFICATION:"SYNTHETIC",
      MIQO_LIVE_PROVIDERS_ENABLED:"false",
      MIQO_SYNTHETIC_ADMIN_KEY:ADMIN_KEY,
      CUSTOMER_WEB_URL:"http://127.0.0.1:3000",
      ADMIN_WEB_URL:"http://127.0.0.1:3001",
    },
    stdio:["ignore","pipe","pipe","pipe"],
  });
  c.stdout.pipe(process.stdout);
  c.stderr.pipe(process.stderr);
  c.stdio[3].end(key);
  return c;
}

async function waitReady(){
  const deadline=Date.now()+120000;
  while(Date.now()<deadline){
    try{
      const r=await fetch(BASE+"/health");
      if(r.ok){
        const h=await r.json();
        if(h.databaseBackend==="pglite-protected"&&h.durabilityMode==="CHECKPOINT_BEFORE_ACK"&&!h.durabilityFaulted)return h;
      }
    }catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error("G3_PROTECTED_API_NOT_READY");
}

async function stopApi(){
  if(!child)return;
  const done=new Promise(resolve=>child.once("exit",resolve));
  child.kill();
  await Promise.race([done,new Promise(resolve=>setTimeout(resolve,10000))]);
  if(child.exitCode===null)child.kill("SIGKILL");
  child=undefined;
}

async function request(method,url,body,headers={}){
  const response=await fetch(BASE+url,{
    method,
    headers:{
      ...(body!==undefined?{"content-type":"application/json"}:{}),
      ...headers,
    },
    body:body===undefined?undefined:JSON.stringify(body),
  });
  const text=await response.text();
  let parsed;
  try{parsed=JSON.parse(text);}catch{parsed=text;}
  return {response,body:parsed};
}

async function successfulMutation(method,url,body){
  const before=await fileHash();
  const {response,body:payload}=await request(method,url,body);
  if(!response.ok)throw new Error(`G3_MUTATION_FAILED ${method} ${url}: ${response.status} ${JSON.stringify(payload)}`);
  if(response.headers.get("x-miqo-durability")!=="checkpointed-before-ack"){
    throw new Error("G3_CHECKPOINT_BEFORE_ACK_HEADER_MISSING");
  }
  const after=await fileHash();
  if(before===after)throw new Error("G3_DURABLE_STORE_DID_NOT_CHANGE_BEFORE_ACK");
  const encrypted=await readFile(STORE);
  if(encrypted.includes(Buffer.from(MARKER,"utf8")))throw new Error("G3_PLAINTEXT_MARKER_FOUND_IN_PERSISTED_STORE");
  return payload;
}

try{
  child=spawnApi();
  const health1=await waitReady();
  if(!await exists(STORE))throw new Error("G3_INITIAL_ENCRYPTED_STORE_MISSING");

  const profile=await successfulMutation("POST","/profiles");
  const profileId=profile.profileId;
  const versionId=profile.versionId;
  if(!profileId||!versionId)throw new Error("G3_PROFILE_IDS_MISSING");

  await successfulMutation("PUT",`/profile-versions/${versionId}/facts/main_driver_id`,{value:MARKER});
  await successfulMutation("PUT",`/profile-versions/${versionId}/facts/annual_mileage`,{value:8000});
  await successfulMutation("PUT",`/profile-versions/${versionId}/facts/licence_held_since`,{value:"2018-04-16"});
  await successfulMutation("POST",`/profiles/${profileId}/validate`);
  await successfulMutation("POST",`/profiles/${profileId}/lock`);

  const hashAfterLock=await fileHash();
  const denied=await request("PUT",`/profile-versions/${versionId}/facts/annual_mileage`,{value:9000});
  if(denied.response.status!==409)throw new Error("G3_LOCKED_PROFILE_MUTATION_NOT_REJECTED");
  const hashAfterDenied=await fileHash();
  if(hashAfterDenied!==hashAfterLock)throw new Error("G3_FAILED_MUTATION_CHANGED_DURABLE_STORE");

  await stopApi();

  child=spawnApi();
  const health2=await waitReady();
  const admin=await request("GET",`/admin/profiles/${profileId}`,undefined,{"x-miqo-synthetic-admin":ADMIN_KEY});
  if(!admin.response.ok)throw new Error("G3_RESTART_ADMIN_READ_FAILED");
  const serialized=JSON.stringify(admin.body);
  if(!serialized.includes('"LOCKED"'))throw new Error("G3_RESTART_LOCKED_PROFILE_MISSING");
  if(!serialized.includes(MARKER))throw new Error("G3_RESTART_PROTECTED_VALUE_MISSING");

  const correction=await successfulMutation("POST",`/profiles/${profileId}/corrections`,{
    fieldId:"annual_mileage",
    value:8500,
  });
  if(!correction)throw new Error("G3_CORRECTION_DRAFT_FAILED");

  const finalHash=await fileHash();
  await stopApi();

  child=spawnApi();
  await waitReady();
  const snapshot=await request("GET",`/profiles/${profileId}/snapshot`);
  if(!snapshot.response.ok)throw new Error("G3_SECOND_RESTART_SNAPSHOT_FAILED");
  if(!JSON.stringify(snapshot.body).includes(MARKER))throw new Error("G3_SECOND_RESTART_VALUE_MISSING");
  await stopApi();

  const metricsRaw=await readFile(METRICS,"utf8");
  const metrics=metricsRaw.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  if(metrics.length<9)throw new Error("G3_CHECKPOINT_METRICS_INSUFFICIENT");
  const totals=metrics.map(x=>Number(x.totalMs));
  if(totals.some(x=>!Number.isFinite(x)||x<=0))throw new Error("G3_CHECKPOINT_METRICS_INVALID");
  const maxMs=Math.max(...totals);
  const p95Ms=[...totals].sort((a,b)=>a-b)[Math.max(0,Math.ceil(totals.length*0.95)-1)];
  if(maxMs>15000)throw new Error(`G3_CHECKPOINT_PATH_PATHOLOGICAL ${maxMs}ms`);

  const encrypted=await readFile(STORE);
  if(encrypted.includes(Buffer.from(MARKER,"utf8")))throw new Error("G3_FINAL_PLAINTEXT_MARKER_FOUND");

  const summary={
    gate:"G3.3",
    result:"PASS",
    proofClass:"PROTECTED_API_RUNTIME_INTEGRATION",
    backend:"pglite-protected",
    durabilityMode:"CHECKPOINT_BEFORE_ACK",
    encryption:"AES-256-GCM",
    compression:"gzip-level-1",
    persistentPlaintextPgdata:false,
    checkpointCount:metrics.length,
    checkpointMaxMs:Number(maxMs.toFixed(2)),
    checkpointP95Ms:Number(p95Ms.toFixed(2)),
    restartLockedProfile:"PASS",
    secondRestart:"PASS",
    lockedMutationRejectedWithoutCheckpoint:"PASS",
    plaintextMarkerPersistentScan:"PASS",
    protectedStoreSha256:finalHash,
    protectedStoreBytes:encrypted.length,
    keySource:"ONE_SHOT_PRIVATE_FD_SYNTHETIC_PROOF",
    boundary:"SYNTHETIC_ONLY",
  };
  console.log(JSON.stringify(summary));
}catch(error){
  console.error(error);
  process.exitCode=1;
}finally{
  await stopApi().catch(()=>{});
  key.fill(0);
}
