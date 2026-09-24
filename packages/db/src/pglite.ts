import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import * as coreSchema from "./schema.ts";
import * as sprint4Schema from "./sp4-schema.ts";
import type {MiqoDatabase,MiqoDatabaseRuntime} from "./client.ts";

const schema={...coreSchema,...sprint4Schema};

export async function createPgliteRuntime(dataDir:string):Promise<MiqoDatabaseRuntime>{
  const client=await PGlite.create(dataDir);
  const db=drizzle(client,{schema}) as unknown as MiqoDatabase;
  return {
    db,
    backend:"pglite",
    close:async()=>{await client.close();}
  };
}
