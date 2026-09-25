import {readFileSync} from "node:fs";
import {rekeyProtectedStore,protectedEnvelopeKeyVersion} from "../packages/db/src/protected-pglite.ts";

const storePath=process.env.MIQO_G3_PROTECTED_STORE;
const oldVersion=Number(process.env.MIQO_G3_OLD_KEY_VERSION);
const newVersion=Number(process.env.MIQO_G3_NEW_KEY_VERSION);
const fd=Number(process.env.MIQO_G3_REKEY_FD??"0");

if(!storePath)throw new Error("MIQO_G3_PROTECTED_STORE is required");
if(!Number.isInteger(oldVersion)||oldVersion<=0)throw new Error("MIQO_G3_OLD_KEY_VERSION invalid");
if(!Number.isInteger(newVersion)||newVersion<=oldVersion)throw new Error("MIQO_G3_NEW_KEY_VERSION invalid");
if(!Number.isInteger(fd)||fd<0||fd===1||fd===2)throw new Error("MIQO_G3_REKEY_FD invalid");

const raw=readFileSync(fd);
if(raw.length!==64){
  raw.fill(0);
  throw new Error("G3_REKEY_KEY_MATERIAL_LENGTH_INVALID");
}
const oldKey=Buffer.from(raw.subarray(0,32));
const newKey=Buffer.from(raw.subarray(32,64));
raw.fill(0);

try{
  const before=readFileSync(storePath);
  const beforeVersion=protectedEnvelopeKeyVersion(before);
  if(beforeVersion!==oldVersion)throw new Error("G3_REKEY_SOURCE_VERSION_MISMATCH");

  await rekeyProtectedStore(storePath,oldKey,oldVersion,newKey,newVersion);

  const after=readFileSync(storePath);
  const afterVersion=protectedEnvelopeKeyVersion(after);
  if(afterVersion!==newVersion)throw new Error("G3_REKEY_TARGET_VERSION_MISMATCH");
  console.log(JSON.stringify({
    gate:"G3.4",
    operation:"protected-store-rekey",
    fromVersion:oldVersion,
    toVersion:newVersion,
    result:"PASS"
  }));
}finally{
  oldKey.fill(0);
  newKey.fill(0);
}
