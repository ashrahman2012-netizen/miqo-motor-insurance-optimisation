import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
import {mkdir,open as openFile,readdir,readFile,rename,rm,stat,writeFile} from "node:fs/promises";
import path from "node:path";
import {PGlite} from "@electric-sql/pglite";

const ROOT=process.cwd();
const PROOF=path.join(ROOT,"dist","desktop-g3-g3.2-proof");
const STORE=path.join(PROOF,"miqo-pglite-snapshot-v1.enc");
const TMP=STORE+".tmp";
const MIGRATIONS=path.join(ROOT,"packages","db","migrations");
const AAD=Buffer.from("MIQO/DESKTOP/G3/PGLITE-SNAPSHOT/V1","utf8");
const MAGIC=Buffer.from("MIQOG3E1","ascii");
const VERSION=1;
const MARKER="MIQO-G3-SENSITIVE-MARKER-9F3D7C2A";
const PROFILE_ID="PRO-SYN-G3-ENC";
const VERSION_ID="RPV-SYN-G3-ENC-V1";

function assert(condition,message){
  if(!condition)throw new Error(message);
}

function encryptSnapshot(key,plain){
  const nonce=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key,nonce);
  cipher.setAAD(AAD);
  const ciphertext=Buffer.concat([cipher.update(plain),cipher.final()]);
  const tag=cipher.getAuthTag();
  return Buffer.concat([MAGIC,Buffer.from([VERSION]),nonce,tag,ciphertext]);
}

function decryptSnapshot(key,envelope){
  assert(envelope.subarray(0,MAGIC.length).equals(MAGIC),"G3_ENVELOPE_MAGIC_INVALID");
  assert(envelope[MAGIC.length]===VERSION,"G3_ENVELOPE_VERSION_INVALID");
  const nonceStart=MAGIC.length+1;
  const nonce=envelope.subarray(nonceStart,nonceStart+12);
  const tag=envelope.subarray(nonceStart+12,nonceStart+28);
  const ciphertext=envelope.subarray(nonceStart+28);
  const decipher=createDecipheriv("aes-256-gcm",key,nonce);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext),decipher.final()]);
}

async function atomicWrite(target,data){
  await writeFile(TMP,data,{mode:0o600});
  const fh=await openFile(TMP,"r+");
  try{await fh.sync();}finally{await fh.close();}
  await rename(TMP,target);
}

async function applyMigrations(pg){
  const names=(await readdir(MIGRATIONS)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
  assert(names.length===13,"G3_EXPECTED_13_MIGRATIONS");
  for(const name of names){
    const sql=await readFile(path.join(MIGRATIONS,name),"utf8");
    await pg.exec(sql);
  }
  return names;
}

async function seedLockedProfile(pg){
  await pg.query("INSERT INTO customer(customer_id,synthetic) VALUES($1,true)",["CUS-SYN-G3-ENC"]);
  await pg.query("INSERT INTO profile(profile_id,customer_id) VALUES($1,$2)",[PROFILE_ID,"CUS-SYN-G3-ENC"]);
  await pg.query("INSERT INTO risk_profile_version(risk_profile_version_id,profile_id,version_no,status) VALUES($1,$2,1,'DRAFT')",[VERSION_ID,PROFILE_ID]);
  await pg.query(
    "INSERT INTO canonical_field_value(canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type) VALUES($1,$2,'main_driver_id','F',$3::jsonb,'g3_encrypted_snapshot_spike')",
    ["CFV-SYN-G3-ENC-MAIN",VERSION_ID,JSON.stringify(MARKER)]
  );
  await pg.query(
    "INSERT INTO canonical_field_value(canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type) VALUES($1,$2,'annual_mileage','F',$3::jsonb,'g3_encrypted_snapshot_spike')",
    ["CFV-SYN-G3-ENC-MILE",VERSION_ID,JSON.stringify(8000)]
  );
  await pg.query("UPDATE risk_profile_version SET status='LOCKED',locked_at=now() WHERE risk_profile_version_id=$1",[VERSION_ID]);
  await pg.query(
    "INSERT INTO audit_event(audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json) VALUES($1,'profile_locked','risk_profile_version',$2,$3,$4::jsonb)",
    ["AUD-SYN-G3-ENC-LOCK",VERSION_ID,PROFILE_ID,JSON.stringify({proof:"G3.2"})]
  );
}

async function assertLockedProfile(pg){
  const version=await pg.query("SELECT status FROM risk_profile_version WHERE risk_profile_version_id=$1",[VERSION_ID]);
  assert(version.rows.length===1 && version.rows[0].status==="LOCKED","G3_LOCKED_PROFILE_RESTART_PARITY_FAILED");
  const value=await pg.query("SELECT value_json FROM canonical_field_value WHERE risk_profile_version_id=$1 AND field_id='main_driver_id'",[VERSION_ID]);
  assert(value.rows.length===1 && value.rows[0].value_json===MARKER,"G3_SENSITIVE_VALUE_RESTART_PARITY_FAILED");
}

async function dumpPlain(pg){
  const blob=await pg.dumpDataDir("none");
  return Buffer.from(await blob.arrayBuffer());
}

async function createFromPlainTar(plain){
  return PGlite.create({loadDataDir:new Blob([plain])});
}

async function expectDecryptFailure(key,envelope,label){
  let failed=false;
  try{decryptSnapshot(key,envelope);}catch{failed=true;}
  assert(failed,label);
}

await rm(PROOF,{recursive:true,force:true});
await mkdir(PROOF,{recursive:true});

const key=randomBytes(32);
let plain1=Buffer.alloc(0);
let plainRestart=Buffer.alloc(0);
let plain2=Buffer.alloc(0);

try{
  const pg=await PGlite.create();
  const migrations=await applyMigrations(pg);
  await seedLockedProfile(pg);
  await assertLockedProfile(pg);

  plain1=await dumpPlain(pg);
  assert(plain1.includes(Buffer.from(MARKER,"utf8")),"G3_CONTROL_PLAINTEXT_MARKER_NOT_PRESENT_IN_MEMORY_DUMP");
  const encrypted1=encryptSnapshot(key,plain1);
  assert(!encrypted1.includes(Buffer.from(MARKER,"utf8")),"G3_PLAINTEXT_MARKER_VISIBLE_IN_ENCRYPTED_STORE");
  await atomicWrite(STORE,encrypted1);
  await pg.close();

  const persisted1=await readFile(STORE);
  assert(!persisted1.includes(Buffer.from(MARKER,"utf8")),"G3_PERSISTED_PLAINTEXT_MARKER_FOUND");

  await expectDecryptFailure(randomBytes(32),persisted1,"G3_WRONG_KEY_DID_NOT_FAIL");
  const tampered=Buffer.from(persisted1);
  tampered[tampered.length-1]^=0x01;
  await expectDecryptFailure(key,tampered,"G3_TAMPER_DID_NOT_FAIL_AUTHENTICATION");

  plainRestart=decryptSnapshot(key,persisted1);
  const pg2=await createFromPlainTar(plainRestart);
  await assertLockedProfile(pg2);
  await pg2.query(
    "INSERT INTO audit_event(audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json) VALUES($1,'g3_encrypted_restart','profile',$2,$2,$3::jsonb)",
    ["AUD-SYN-G3-ENC-RESTART",PROFILE_ID,JSON.stringify({checkpoint:2})]
  );
  plain2=await dumpPlain(pg2);
  const encrypted2=encryptSnapshot(key,plain2);
  await atomicWrite(STORE,encrypted2);
  await pg2.close();

  const persisted2=await readFile(STORE);
  assert(!persisted2.includes(Buffer.from(MARKER,"utf8")),"G3_SECOND_PERSISTED_PLAINTEXT_MARKER_FOUND");
  const recovered2=decryptSnapshot(key,persisted2);
  const pg3=await createFromPlainTar(recovered2);
  await assertLockedProfile(pg3);
  const audit=await pg3.query("SELECT count(*)::int AS count FROM audit_event WHERE audit_event_id='AUD-SYN-G3-ENC-RESTART'");
  assert(Number(audit.rows[0]?.count)===1,"G3_SECOND_CHECKPOINT_RESTART_FAILED");
  await pg3.close();
  recovered2.fill(0);

  let tmpExists=true;
  try{await stat(TMP);}catch{tmpExists=false;}
  assert(!tmpExists,"G3_ATOMIC_TEMP_FILE_REMAINS");

  const persistentFiles=(await readdir(PROOF)).sort();
  assert(persistentFiles.length===1 && persistentFiles[0]===path.basename(STORE),"G3_UNEXPECTED_PERSISTED_FILE_BEFORE_SUMMARY");

  const summary={
    gate:"G3.2",
    result:"PASS",
    proofClass:"FEASIBILITY_SPIKE",
    pgliteVersion:"0.5.8",
    storageMode:"MEMORY_PGLITE_PLUS_AUTHENTICATED_ENCRYPTED_SNAPSHOT",
    encryption:"AES-256-GCM",
    keySource:"EPHEMERAL_TEST_ONLY",
    persistentPlaintextPgdata:false,
    migrationCount:migrations.length,
    lockedProfileRestartParity:"PASS",
    secondCheckpointRestart:"PASS",
    wrongKeyFailClosed:"PASS",
    tamperAuthentication:"PASS",
    plaintextMarkerPersistentScan:"PASS",
    atomicReplaceTempCleanup:"PASS",
    boundary:"SYNTHETIC_ONLY",
    decision:"GO_TO_G3.3_WITH_DURABILITY_INTEGRATION_REQUIRED",
    encryptedStoreSha256:createHash("sha256").update(persisted2).digest("hex"),
    encryptedStoreBytes:persisted2.length
  };
  await writeFile(path.join(PROOF,"g3.2-feasibility-proof.json"),JSON.stringify(summary,null,2)+"\n",{mode:0o600});
  console.log(JSON.stringify(summary));
}finally{
  key.fill(0);
  plain1.fill(0);
  plainRestart.fill(0);
  plain2.fill(0);
}
