import pg from "pg";
import {drizzle,type NodePgDatabase} from "drizzle-orm/node-postgres";
import * as coreSchema from "./schema.ts";
import * as sprint4Schema from "./sp4-schema.ts";

const {Pool}=pg;
export const schema={...coreSchema,...sprint4Schema};

export type MiqoDatabase=NodePgDatabase<typeof schema>;

export function createPool(connectionString=process.env.DATABASE_URL){
  if(!connectionString)throw new Error("DATABASE_URL is required");
  return new Pool({connectionString});
}

export function createDatabase(pool:pg.Pool):MiqoDatabase{
  return drizzle(pool,{schema});
}
