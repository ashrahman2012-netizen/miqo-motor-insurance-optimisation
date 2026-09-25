import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {constants as fsConstants,readFileSync} from "node:fs";
import {mkdir,open as openFile,readFile,readdir,rename,stat,writeFile} from "node:fs/promises";
import {gzipSync,gunzipSync} from "node:zlib";
import path from "node:path";
import {performance} from "node:perf_hooks";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import * as coreSchema from "./schema.ts";
import * as sprint4Schema from "./sp4-schema.ts";
import type {MiqoDatabase,MiqoDatabaseRuntime,ProtectedCheckpointMetrics} from "./client.ts";

const schema={...coreSchema,...sprint4Schema};
const MAGIC=Buffer.from("MIQOG3E2","ascii");
const FORMAT_VERSION=1;
const NONCE_BYTES=12;
const TAG_BYTES=16;
const HEADER_BYTES=MAGIC.length+1+4+NONCE_BYTES+TAG_BYTES;
const AAD_PREFIX=Buffer.from("MIQO/DESKTOP/G3/PROTECTED-PGLITE/V1","utf8");

function assert(condition:unknown,message:string):asserts condition{
  if(!condition)throw new Error(message);
}

export function encodeProtectedEnvelope(key:Buffer,keyVersion:number,plainTar:Buffer):Buffer{
  const compressed=gzipSync(plainTar,{level:1});
  const nonce=randomBytes(NONCE_BYTES);
  const prefix=Buffer.alloc(MAGIC.length+1+4+NONCE_BYTES);
  MAGIC.copy(prefix,0);
  prefix[MAGIC.length]=FORMAT_VERSION;
  assert(Number.isInteger(keyVersion)&&keyVersion>0,"G3_PROTECTED_STORE_KEY_VERSION_INVALID");
  prefix.writeUInt32BE(keyVersion,MAGIC.length+1);
  nonce.copy(prefix,MAGIC.length+1+4);

  const aad=Buffer.concat([AAD_PREFIX,prefix]);
  const cipher=createCipheriv("aes-256-gcm",key,nonce);
  cipher.setAAD(aad);
  const ciphertext=Buffer.concat([cipher.update(compressed),cipher.final()]);
  const tag=cipher.getAuthTag();
  compressed.fill(0);
  return Buffer.concat([prefix,tag,ciphertext]);
}

export function decodeProtectedEnvelope(key:Buffer,expectedKeyVersion:number,envelope:Buffer):Buffer{
  assert(envelope.length>HEADER_BYTES,"G3_PROTECTED_STORE_TRUNCATED");
  assert(envelope.subarray(0,MAGIC.length).equals(MAGIC),"G3_PROTECTED_STORE_MAGIC_INVALID");
  assert(envelope[MAGIC.length]===FORMAT_VERSION,"G3_PROTECTED_STORE_FORMAT_UNSUPPORTED");
  const keyVersion=envelope.readUInt32BE(MAGIC.length+1);
  assert(keyVersion===expectedKeyVersion,"G3_PROTECTED_STORE_KEY_VERSION_MISMATCH");

  const nonceStart=MAGIC.length+1+4;
  const nonce=envelope.subarray(nonceStart,nonceStart+NONCE_BYTES);
  const tag=envelope.subarray(nonceStart+NONCE_BYTES,nonceStart+NONCE_BYTES+TAG_BYTES);
  const ciphertext=envelope.subarray(nonceStart+NONCE_BYTES+TAG_BYTES);
  const prefix=envelope.subarray(0,nonceStart+NONCE_BYTES);
  const aad=Buffer.concat([AAD_PREFIX,prefix]);

  try{
    const decipher=createDecipheriv("aes-256-gcm",key,nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const compressed=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
    const plain=gunzipSync(compressed);
    compressed.fill(0);
    return plain;
  }catch{
    throw new Error("G3_PROTECTED_DATA_AUTHENTICATION_FAILED");
  }
}

async function pathExists(target:string):Promise<boolean>{
  try{await stat(target);return true;}catch{return false;}
}

async function atomicDurableReplace(target:string,data:Buffer):Promise<void>{
  await mkdir(path.dirname(target),{recursive:true});
  const staging=target+".tmp";
  const handle=await openFile(staging,fsConstants.O_CREAT|fsConstants.O_TRUNC|fsConstants.O_WRONLY,0o600);
  try{
    await handle.writeFile(data);
    await handle.sync();
  }finally{
    await handle.close();
  }
  await rename(staging,target);
  try{
    const dir=await openFile(path.dirname(target),fsConstants.O_RDONLY);
    try{await dir.sync();}finally{await dir.close();}
  }catch{
    // Windows does not guarantee directory handles can be fsynced from Node.
    // The file itself is flushed before atomic replacement; G3.8 owns crash-cut testing.
  }
}

async function readKeyFromFd():Promise<Buffer>{
  const raw=process.env.MIQO_PGLITE_KEY_FD;
  if(!raw)throw new Error("MIQO_PGLITE_KEY_FD is required for pglite-protected");
  const fd=Number(raw);
  if(!Number.isInteger(fd)||fd<0||fd===1||fd===2)throw new Error("MIQO_PGLITE_KEY_FD must reference stdin or a private inherited descriptor");
  const key=readFileSync(fd);
  if(key.length!==32){
    key.fill(0);
    throw new Error("MIQO_PGLITE_KEY_LENGTH_INVALID");
  }
  return Buffer.from(key);
}

async function applyMigrations(pg:PGlite,migrationsDir:string):Promise<void>{
  await pg.exec(`CREATE TABLE IF NOT EXISTS _miqo_migrations(
    name text PRIMARY KEY,
    sha256 text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const {createHash}=await import("node:crypto");
  const names=(await readdir(migrationsDir)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
  for(const name of names){
    const sql=await readFile(path.join(migrationsDir,name),"utf8");
    const sha256=createHash("sha256").update(sql).digest("hex");
    const existing=await pg.query<{sha256:string}>("SELECT sha256 FROM _miqo_migrations WHERE name=$1",[name]);
    if(existing.rows.length){
      if(existing.rows[0].sha256!==sha256)throw new Error("PGLITE_MIGRATION_HASH_MISMATCH "+name);
      continue;
    }
    await pg.transaction(async tx=>{
      await tx.exec(sql);
      await tx.query("INSERT INTO _miqo_migrations(name,sha256) VALUES($1,$2)",[name,sha256]);
    });
  }
}

function percentile(values:number[],fraction:number):number{
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*fraction)-1))];
}

export function protectedEnvelopeKeyVersion(envelope:Buffer):number{
  assert(envelope.length>HEADER_BYTES,"G3_PROTECTED_STORE_TRUNCATED");
  assert(envelope.subarray(0,MAGIC.length).equals(MAGIC),"G3_PROTECTED_STORE_MAGIC_INVALID");
  assert(envelope[MAGIC.length]===FORMAT_VERSION,"G3_PROTECTED_STORE_FORMAT_UNSUPPORTED");
  return envelope.readUInt32BE(MAGIC.length+1);
}

export async function rekeyProtectedStore(
  storePath:string,
  oldKey:Buffer,
  oldKeyVersion:number,
  newKey:Buffer,
  newKeyVersion:number,
):Promise<void>{
  const encrypted=await readFile(storePath);
  const plain=decodeProtectedEnvelope(oldKey,oldKeyVersion,encrypted);
  let next:Buffer|undefined;
  try{
    next=encodeProtectedEnvelope(newKey,newKeyVersion,plain);
    // Authenticate the new envelope before replacing the active store.
    const verify=decodeProtectedEnvelope(newKey,newKeyVersion,next);
    verify.fill(0);
    await atomicDurableReplace(storePath,next);
  }finally{
    plain.fill(0);
    next?.fill(0);
  }
}

export async function createProtectedPgliteRuntime(
  storePath:string,
  migrationsDir:string,
):Promise<MiqoDatabaseRuntime>{
  const key=await readKeyFromFd();
  const keyVersion=Number(process.env.MIQO_PGLITE_KEY_VERSION??"1");
  assert(Number.isInteger(keyVersion)&&keyVersion>0,"MIQO_PGLITE_KEY_VERSION_INVALID");
  let plain:Buffer|undefined;
  let pg:PGlite|undefined;
  let durabilityFaulted=false;
  let checkpointChain:Promise<void>=Promise.resolve();
  const checkpointSamples:number[]=[];
  const metricsFile=process.env.MIQO_G3_CHECKPOINT_METRICS_FILE;

  try{
    if(await pathExists(storePath)){
      const encrypted=await readFile(storePath);
      plain=decodeProtectedEnvelope(key,keyVersion,encrypted);
      const loadBytes=Uint8Array.from(plain);
      pg=await PGlite.create({loadDataDir:new Blob([loadBytes])});
      loadBytes.fill(0);
      plain.fill(0);
      plain=undefined;
    }else{
      pg=await PGlite.create();
    }

    await applyMigrations(pg,migrationsDir);
    const db=drizzle(pg,{schema}) as unknown as MiqoDatabase;

    const checkpoint=async():Promise<ProtectedCheckpointMetrics>=>{
      const execute=async():Promise<ProtectedCheckpointMetrics>=>{
        if(durabilityFaulted)throw new Error("G3_DURABILITY_FAULTED");
        const started=performance.now();
        let snapshot:Buffer|undefined;
        let envelope:Buffer|undefined;
        try{
          const dumpStarted=performance.now();
          const blob=await pg!.dumpDataDir("none");
          snapshot=Buffer.from(await blob.arrayBuffer());
          const dumpMs=performance.now()-dumpStarted;

          const encryptStarted=performance.now();
          envelope=encodeProtectedEnvelope(key,keyVersion,snapshot);
          const encryptMs=performance.now()-encryptStarted;

          const writeStarted=performance.now();
          await atomicDurableReplace(storePath,envelope);
          const durableWriteMs=performance.now()-writeStarted;
          const totalMs=performance.now()-started;
          checkpointSamples.push(totalMs);

          const metrics:ProtectedCheckpointMetrics={
            dumpMs,
            encryptMs,
            durableWriteMs,
            totalMs,
            plainBytes:snapshot.length,
            encryptedBytes:envelope.length,
            sampleCount:checkpointSamples.length,
            p50Ms:percentile(checkpointSamples,0.50),
            p95Ms:percentile(checkpointSamples,0.95),
          };

          if(metricsFile&&process.env.MIQO_DATA_CLASSIFICATION==="SYNTHETIC"){
            await mkdir(path.dirname(metricsFile),{recursive:true});
            await writeFile(metricsFile,JSON.stringify(metrics)+"\n",{flag:"a",mode:0o600});
          }
          return metrics;
        }catch(error){
          durabilityFaulted=true;
          throw error;
        }finally{
          snapshot?.fill(0);
          envelope?.fill(0);
        }
      };

      const previous=checkpointChain;
      let release!:()=>void;
      checkpointChain=new Promise<void>(resolve=>{release=resolve;});
      await previous;
      try{return await execute();}finally{release();}
    };

    // Migration state must be durably checkpointed before API readiness.
    await checkpoint();

    return {
      db,
      backend:"pglite-protected",
      durabilityMode:"CHECKPOINT_BEFORE_ACK",
      checkpoint,
      isDurabilityFaulted:()=>durabilityFaulted,
      close:async()=>{
        await checkpointChain;
        await pg!.close();
        key.fill(0);
      },
    };
  }catch(error){
    plain?.fill(0);
    key.fill(0);
    if(pg)await pg.close().catch(()=>{});
    throw error;
  }
}
