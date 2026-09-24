import pg from "pg";
import {drizzle,type NodePgDatabase} from "drizzle-orm/node-postgres";
import * as coreSchema from "./schema.ts";
import * as sprint4Schema from "./sp4-schema.ts";

const {Pool}=pg;
export const schema={...coreSchema,...sprint4Schema};

export type MiqoDatabase=NodePgDatabase<typeof schema>;
export type MiqoDatabaseRuntime={
  db:MiqoDatabase;
  backend:"postgres"|"pglite";
  close:()=>Promise<void>;
};

export function createPool(connectionString=process.env.DATABASE_URL){
  if(!connectionString)throw new Error("DATABASE_URL is required");
  return new Pool({connectionString});
}

export function createDatabase(pool:pg.Pool):MiqoDatabase{
  return drizzle(pool,{schema});
}

export async function createDatabaseRuntime():Promise<MiqoDatabaseRuntime>{
  const backend=(process.env.MIQO_DB_BACKEND??"postgres").toLowerCase();
  if(backend==="pglite"){
    const {createPgliteRuntime}=await import("./pglite.ts");
    const dataDir=process.env.MIQO_PGLITE_DATA_DIR;
    if(!dataDir)throw new Error("MIQO_PGLITE_DATA_DIR is required for pglite");
    return createPgliteRuntime(dataDir);
  }
  if(backend!=="postgres")throw new Error("Unsupported MIQO_DB_BACKEND: "+backend);
  const pool=createPool();
  return {db:createDatabase(pool),backend:"postgres",close:async()=>{await pool.end();}};
}
