import {createHash} from "node:crypto";
import {mkdir,readdir,readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {PGlite} from "@electric-sql/pglite";

export async function migratePglite(dataDir:string,migrationsDir:string){
  await mkdir(dataDir,{recursive:true});
  const pg=await PGlite.create(dataDir);
  try{
    await pg.exec(`CREATE TABLE IF NOT EXISTS _miqo_migrations(
      name text PRIMARY KEY,
      sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
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
      console.log("PGLITE_MIGRATION_APPLIED "+name);
    }
    console.log("PGLITE_MIGRATION_PASS");
  }finally{
    await pg.close();
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const dataDir=process.env.MIQO_PGLITE_DATA_DIR;
  const migrationsDir=process.env.MIQO_MIGRATIONS_DIR;
  if(!dataDir)throw new Error("MIQO_PGLITE_DATA_DIR is required");
  if(!migrationsDir)throw new Error("MIQO_MIGRATIONS_DIR is required");
  await migratePglite(dataDir,migrationsDir);
}
