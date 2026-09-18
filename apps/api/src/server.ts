import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import { createDatabase, createPool } from "../../../packages/db/src/client.ts";
import { ConflictError, PreQuoteIntegrityError, ValidationError } from "./errors.ts";
import { auditEvents, createCorrectionDraft, createPersistedScenario, createProfile, currentVersion, listDiscrepancies, lockProfile, profileSnapshot, putFact, validateProfile } from "./profile-service.ts";
import { listOptimisationPreferences, saveOptimisationPreferences } from "./preference-service.ts";
import { generateScenarios, listGeneratedScenarios } from "./scenario-service.ts";
import { getPreparedQuoteRequest, listPreQuoteIntegritySignals, prepareQuoteRequest } from "./quote-service.ts";
import { executePreparedQuoteRequest, getRawProviderResponse } from "./provider-service.ts";

const classification=process.env.MIQO_DATA_CLASSIFICATION??"SYNTHETIC";
const live=(process.env.MIQO_LIVE_PROVIDERS_ENABLED??"false").toLowerCase();
if(classification!=="SYNTHETIC" || ["1","true","yes","on"].includes(live)) throw new Error("Prototype boundary violation");

export async function buildApp() {
  const pool=createPool(); const db=createDatabase(pool); const app=Fastify({logger:true});
  await app.register(cors,{origin:[process.env.CUSTOMER_WEB_URL??"http://127.0.0.1:3000",process.env.ADMIN_WEB_URL??"http://127.0.0.1:3001"],methods:["GET","HEAD","POST","PUT","OPTIONS"]});
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
  app.post("/profile-versions/:versionId/optimisation-preferences",{
    schema:{body:{type:"object",additionalProperties:false,minProperties:1,properties:{
      voluntary_excess:{type:"integer",minimum:0},
      payment_structure:{type:"string",enum:["ANNUAL","MONTHLY"]},
      policy_start_date:{type:"string",format:"date"},
      telematics_preference:{type:"boolean"},
      genuine_named_driver_inclusion:{type:"array",uniqueItems:true,items:{type:"string",minLength:1}},
    }}},
  },async(req:any,reply)=>reply.code(200).send(await saveOptimisationPreferences(db,{versionId:req.params.versionId,preferences:req.body})));
  app.get("/profile-versions/:versionId/optimisation-preferences",async(req:any)=>listOptimisationPreferences(db,req.params.versionId));
  app.post("/profile-versions/:versionId/scenarios/generate",async(req:any,reply)=>{
    const result=await generateScenarios(db,{versionId:req.params.versionId});
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/profile-versions/:versionId/scenarios/generated",async(req:any)=>listGeneratedScenarios(db,req.params.versionId));
  app.post("/scenarios/:scenarioId/quote-requests",{
    schema:{body:{type:"object",additionalProperties:false,required:["providerKey","channel"],properties:{
      providerKey:{type:"string",enum:["MOCK-PROVIDER-001"]},
      channel:{type:"string",enum:["DIRECT_SYNTHETIC"]},
    }}},
  },async(req:any,reply)=>{
    const result=await prepareQuoteRequest(db,{scenarioId:req.params.scenarioId,providerKey:req.body.providerKey,channel:req.body.channel});
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/quote-requests/:quoteRequestId",async(req:any)=>getPreparedQuoteRequest(db,req.params.quoteRequestId));
  app.post("/quote-requests/:quoteRequestId/execute",async(req:any,reply)=>{
    const result=await executePreparedQuoteRequest(db,req.params.quoteRequestId);
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/quote-requests/:quoteRequestId/raw-response",async(req:any)=>getRawProviderResponse(db,req.params.quoteRequestId));
  app.get("/scenarios/:scenarioId/integrity-signals",async(req:any)=>({items:await listPreQuoteIntegritySignals(db,req.params.scenarioId)}));

  app.get("/admin/profiles/:profileId",async(req:any)=>({versions:await profileSnapshot(db,req.params.profileId),audit:await auditEvents(db,req.params.profileId),discrepancies:await listDiscrepancies(db,req.params.profileId)}));
  app.get("/admin/profile-versions/:versionId",async(req:any)=>profileSnapshotByVersion(db,req.params.versionId));
  app.get("/admin/audit",async(req:any)=>({items:await auditEvents(db,String(req.query.profileId??""))}));

  app.setErrorHandler((error:any,req:any,reply)=>{
    if(error instanceof PreQuoteIntegrityError)return reply.code(409).send({error:error.message,signals:error.signals});
    if(error instanceof ConflictError)return reply.code(409).send({error:error.message});
    if(error instanceof ValidationError)return reply.code(422).send({error:error.message,issues:error.issues});
    if(error?.validation){
      const code=String(req?.url??"").includes("/quote-requests")?"INVALID_QUOTE_REQUEST":"INVALID_OPTIMISATION_PREFERENCE";
      return reply.code(422).send({error:code,issues:error.validation.map((item:any)=>item.message)});
    }
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
