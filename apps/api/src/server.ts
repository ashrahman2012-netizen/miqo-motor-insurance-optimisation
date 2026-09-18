import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import { createDatabase, createPool } from "../../../packages/db/src/client.ts";
import { ConflictError, ValidationError } from "./errors.ts";
import { auditEvents, createCorrectionDraft, createPersistedScenario, createProfile, currentVersion, listDiscrepancies, lockProfile, profileSnapshot, putFact, validateProfile } from "./profile-service.ts";

const classification=process.env.MIQO_DATA_CLASSIFICATION??"SYNTHETIC";
const live=(process.env.MIQO_LIVE_PROVIDERS_ENABLED??"false").toLowerCase();
if(classification!=="SYNTHETIC" || ["1","true","yes","on"].includes(live)) throw new Error("Prototype boundary violation");

export async function buildApp() {
  const pool=createPool(); const db=createDatabase(pool); const app=Fastify({logger:true});
  await app.register(cors,{origin:[process.env.CUSTOMER_WEB_URL??"http://127.0.0.1:3000",process.env.ADMIN_WEB_URL??"http://127.0.0.1:3001"]});
  app.addHook("onClose",async()=>pool.end());

  app.get("/health",async()=>({status:"ok",dataClassification:classification,liveProvidersEnabled:false}));
  app.post("/profiles",async(_req,reply)=>reply.code(201).send(await createProfile(db)));
  app.get("/profiles/:profileId",async(req:any)=>({versions:await profileSnapshot(db,req.params.profileId)}));
  app.post("/profiles/:profileId/validate",async(req:any)=>validateProfile(db,req.params.profileId));
  app.get("/profiles/:profileId/discrepancies",async(req:any)=>({items:await listDiscrepancies(db,req.params.profileId)}));
  app.post("/profiles/:profileId/lock",async(req:any)=>lockProfile(db,req.params.profileId));
  app.post("/profiles/:profileId/corrections",async(req:any,reply)=>reply.code(201).send(await createCorrectionDraft(db,{profileId:req.params.profileId,fieldId:(req.body as any).fieldId,value:(req.body as any).value})));
  app.get("/profiles/:profileId/snapshot",async(req:any)=>({versions:await profileSnapshot(db,req.params.profileId),audit:await auditEvents(db,req.params.profileId)}));

  app.put("/profile-versions/:versionId/facts/:fieldId",async(req:any)=>{
    const v=await currentVersion(db,(await profileSnapshotByVersion(db,req.params.versionId)).profileId);
    if(!v || v.riskProfileVersionId!==req.params.versionId) throw new ConflictError("LOCKED_PROFILE_IMMUTABLE");
    return putFact(db,{profileId:v.profileId,fieldId:req.params.fieldId,value:(req.body as any).value,controlClass:"F"});
  });
  app.post("/profile-versions/:versionId/scenarios",async(req:any,reply)=>reply.code(201).send(await createPersistedScenario(db,{versionId:req.params.versionId,deltas:(req.body as any).deltas??[]})));

  app.get("/admin/profiles/:profileId",async(req:any)=>({versions:await profileSnapshot(db,req.params.profileId),audit:await auditEvents(db,req.params.profileId),discrepancies:await listDiscrepancies(db,req.params.profileId)}));
  app.get("/admin/profile-versions/:versionId",async(req:any)=>profileSnapshotByVersion(db,req.params.versionId));
  app.get("/admin/audit",async(req:any)=>({items:await auditEvents(db,String(req.query.profileId??""))}));

  app.setErrorHandler((error:any,_req,reply)=>{
    if(error instanceof ConflictError)return reply.code(409).send({error:error.message});
    if(error instanceof ValidationError)return reply.code(422).send({error:error.message,issues:error.issues});
    if(String(error?.message??error).includes("only O is permitted"))return reply.code(422).send({error:String(error.message)});
    if(String(error?.message??error).includes("LOCKED_PROFILE_IMMUTABLE"))return reply.code(409).send({error:"LOCKED_PROFILE_IMMUTABLE"});
    app.log.error(error); return reply.code(500).send({error:"internal_error",message:String(error?.message??error)});
  });
  return app;
}

async function profileSnapshotByVersion(db:any,versionId:string){
  const {riskProfileVersion}=await import("../../../packages/db/src/schema.ts");
  const {eq}=await import("drizzle-orm");
  const row=(await db.select().from(riskProfileVersion).where(eq(riskProfileVersion.riskProfileVersionId,versionId)).limit(1))[0];
  if(!row)throw new ValidationError("Profile version not found");
  const versions=await profileSnapshot(db,row.profileId); return {profileId:row.profileId,version:versions.find(v=>v.versionId===versionId)};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const app=await buildApp(); const port=Number(process.env.PORT??4000); await app.listen({host:"127.0.0.1",port});
}
