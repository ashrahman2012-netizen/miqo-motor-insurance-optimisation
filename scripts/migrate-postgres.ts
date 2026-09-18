import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
const {Client}=pg; const client=new Client({connectionString:process.env.DATABASE_URL}); await client.connect();
try {
  const directory=new URL("../packages/db/migrations/",import.meta.url);
  const migrations=(await readdir(directory)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
  for(const migration of migrations) {
    const sql=await readFile(new URL(migration,directory),"utf8");
    await client.query(sql);
    console.log(`POSTGRES_MIGRATION_APPLIED ${migration}`);
  }
  console.log("POSTGRES_MIGRATION_PASS");
}
finally { await client.end(); }
