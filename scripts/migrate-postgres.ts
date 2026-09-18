import { readFile } from "node:fs/promises";
import pg from "pg";
const {Client}=pg; const client=new Client({connectionString:process.env.DATABASE_URL}); await client.connect();
try { const sql=await readFile(new URL("../packages/db/migrations/0001_walking_skeleton.sql",import.meta.url),"utf8"); await client.query(sql); console.log("POSTGRES_MIGRATION_PASS"); }
finally { await client.end(); }
