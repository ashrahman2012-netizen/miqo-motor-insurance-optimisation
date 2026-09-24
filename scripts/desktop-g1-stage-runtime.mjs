import {build} from "esbuild";
import {cp,mkdir,readdir,rm,stat,writeFile} from "node:fs/promises";
import path from "node:path";

const root=process.cwd();
const out=path.join(root,"dist","desktop-g1","runtime");

async function findServer(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){
      const found=await findServer(full);
      if(found)return found;
    }else if(entry.name==="server.js"){
      return full;
    }
  }
  return null;
}

async function exists(p){
  try{await stat(p);return true;}catch{return false;}
}

async function stageNext(name,appPath){
  const app=path.join(root,appPath);
  const standalone=path.join(app,".next","standalone");
  if(!await exists(standalone))throw new Error(name+" standalone output missing");
  const server=await findServer(standalone);
  if(!server)throw new Error(name+" standalone server.js missing");
  const relServer=path.relative(standalone,server);
  const target=path.join(out,name);
  await cp(standalone,target,{recursive:true});
  const serverDir=path.dirname(path.join(target,relServer));
  await mkdir(path.join(serverDir,".next"),{recursive:true});
  await cp(path.join(app,".next","static"),path.join(serverDir,".next","static"),{recursive:true});
  if(await exists(path.join(app,"public"))){
    await cp(path.join(app,"public"),path.join(serverDir,"public"),{recursive:true});
  }
  return path.join(name,relServer).split(path.sep).join("/");
}

await rm(path.join(root,"dist","desktop-g1"),{recursive:true,force:true});
await mkdir(path.join(out,"api"),{recursive:true});

await build({
  entryPoints:[path.join(root,"scripts","desktop-api-entry.ts")],
  outfile:path.join(out,"api","server.cjs"),
  bundle:true,
  platform:"node",
  format:"cjs",
  target:"node22",
  sourcemap:false,
  external:["pg-native","@electric-sql/pglite"],
  logLevel:"info"
});

await build({
  entryPoints:[path.join(root,"scripts","migrate-pglite.ts")],
  outfile:path.join(out,"api","migrate-pglite.mjs"),
  bundle:true,
  platform:"node",
  format:"esm",
  target:"node22",
  sourcemap:false,
  external:["@electric-sql/pglite"],
  logLevel:"info"
});

await mkdir(path.join(out,"api","node_modules","@electric-sql"),{recursive:true});
await cp(
  path.join(root,"node_modules","@electric-sql","pglite"),
  path.join(out,"api","node_modules","@electric-sql","pglite"),
  {recursive:true}
);
await cp(
  path.join(root,"packages","db","migrations"),
  path.join(out,"api","migrations"),
  {recursive:true}
);

const customerServer=await stageNext("customer","apps/customer-web");
const adminServer=await stageNext("admin","apps/admin-web");

const manifest={
  version:1,
  nodeVersion:"22.16.0",
  api:"api/server.cjs",
  pgliteMigration:"api/migrate-pglite.mjs",
  pgliteVersion:"0.5.8",
  customerServer,
  adminServer,
  runtimeBoundary:"SYNTHETIC_ONLY"
};
await writeFile(path.join(out,"runtime-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest));
