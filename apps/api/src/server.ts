import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import { createDatabase, createPool } from "../../../packages/db/src/client.ts";
import { ConflictError, FinalIntegrityError, PreQuoteIntegrityError, ValidationError } from "./errors.ts";
import { auditEvents, createCorrectionDraft, createPersistedScenario, createProfile, currentVersion, listDiscrepancies, lockProfile, profileSnapshot, putFact, validateProfile } from "./profile-service.ts";
import { listOptimisationPreferences, saveOptimisationPreferences } from "./preference-service.ts";
import { generateScenarios, listGeneratedScenarios } from "./scenario-service.ts";
import { getPreparedQuoteRequest, listPreQuoteIntegritySignals, prepareQuoteRequest } from "./quote-service.ts";
import { executePreparedQuoteRequest, getRawProviderResponse } from "./provider-service.ts";
import { listNormalisedQuotes, normaliseRawProviderResponse } from "./normalisation-service.ts";
import { createShortlist, getShortlist } from "./comparison-service.ts";
import { getSelection, selectShortlistedQuote } from "./selection-service.ts";
import { getSelectionTrace } from "./trace-service.ts";
import { getSprint4AdminSelectionTrace } from "./sprint4-admin-trace-service.ts";
import { getPersistedOptimisationCatalogue, listCustomerObjectives, persistCustomerObjective } from "./optimisation-policy-service.ts";
import { generateSprint4Scenarios, listSprint4ScenarioExplorations } from "./sprint4-scenario-service.ts";
import { ensureSyntheticMarketRoutes, executeSprint4MarketRoutes, listSprint4MarketRouteQuotes } from "./sprint4-market-route-service.ts";
import { listCandidateVehicles, listOccupationTaxonomyMappings, persistOccupationTaxonomyMappings, registerCandidateVehicle } from "./sprint4-profile-integrity-service.ts";
import { createSprint4RecommendationSet, getSprint4RecommendationSet } from "./sprint4-recommendation-service.ts";
import { getSprint4RecommendationExplanation } from "./sprint4-explanation-service.ts";
import { processCustomerIntakeEmail, refreshDueCustomerIntakeLifecycle } from "./customer-intake-service.ts";
import { handleGmailIntakeEvent } from "./customer-intake-event-adapter.ts";
import { registerCustomerFormSubmissionRoute } from "./customer-form-submission-route.ts";
import type { FormSubmissionDependencies } from "./customer-form-submission-service.ts";

const classification=process.env.MIQO_DATA_CLASSIFICATION??"SYNTHETIC";
const live=(process.env.MIQO_LIVE_PROVIDERS_ENABLED??"false").toLowerCase();
if(classification!=="SYNTHETIC" || ["1","true","yes","on"].includes(live)) throw new Error("Prototype boundary violation");

export function internalErrorPayload(requestId:string){return {error:"internal_error",requestId};}

export type BuildAppOptions=Readonly<{formSubmissionDependencies?:FormSubmissionDependencies}>;

export async function buildApp(options:BuildAppOptions={}) {
  const pool=createPool(); const db=createDatabase(pool); const app=Fastify({logger:true,bodyLimit:131_072});
  const customerOrigin=process.env.CUSTOMER_WEB_URL??"http://127.0.0.1:3000";
  const adminOrigin=process.env.ADMIN_WEB_URL??"http://127.0.0.1:3001";
  const allowFileOrigin=classification==="SYNTHETIC" && (process.env.MIQO_ALLOW_FILE_ORIGIN??"false").toLowerCase()==="true";
  const allowedOrigins=new Set([customerOrigin,adminOrigin,...(allowFileOrigin?["null"]:[])]);
  const rateWindowMs=Number(process.env.MIQO_RATE_LIMIT_WINDOW_MS??"60000");
  const rateMax=Number(process.env.MIQO_RATE_LIMIT_MAX??"300");
  const rateBuckets=new Map<string,{started:number,count:number}>();
  await app.register(cors,{origin:Array.from(allowedOrigins),methods:["GET","HEAD","POST","PUT","OPTIONS"]});
  app.addHook("onRequest",async(req,reply)=>{
    const origin=typeof req.headers.origin==="string"?req.headers.origin:"";
    if(origin&&!allowedOrigins.has(origin))return reply.code(403).send({error:"origin_not_allowed",requestId:req.id});
    if(req.url.startsWith("/admin/")){
      const configuredAdminKey=process.env.MIQO_SYNTHETIC_ADMIN_KEY??"";
      if(!configuredAdminKey)return reply.code(503).send({error:"synthetic_admin_gate_unconfigured",requestId:req.id});
      if(req.headers["x-miqo-synthetic-admin"]!==configuredAdminKey)return reply.code(401).send({error:"synthetic_admin_access_required",requestId:req.id});
    }
    reply.header("x-request-id",req.id);
    if(["POST","PUT","PATCH","DELETE"].includes(req.method)){
      const now=Date.now();
      const key=req.ip+"|"+req.method+"|"+(req.routeOptions.url??req.url);
      const current=rateBuckets.get(key);
      const bucket=!current||now-current.started>=rateWindowMs?{started:now,count:0}:current;
      bucket.count+=1; rateBuckets.set(key,bucket);
      reply.header("x-ratelimit-limit",String(rateMax));
      reply.header("x-ratelimit-remaining",String(Math.max(0,rateMax-bucket.count)));
      if(bucket.count>rateMax)return reply.code(429).send({error:"rate_limit_exceeded",requestId:req.id});
    }
  });
  app.addHook("onSend",async(req,reply,payload)=>{
    reply.header("x-request-id",req.id);
    reply.header("x-content-type-options","nosniff");
    reply.header("referrer-policy","no-referrer");
    reply.header("permissions-policy","camera=(), microphone=(), geolocation=()");
    reply.header("x-frame-options","DENY");
    reply.header("content-security-policy","default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    reply.header("cache-control","no-store");
    return payload;
  });
  app.addHook("onClose",async()=>pool.end());
  registerCustomerFormSubmissionRoute(app,pool,options.formSubmissionDependencies??{});

  app.get("/health",async()=>({status:"ok",dataClassification:classification,liveProvidersEnabled:false}));
  app.post("/profiles",async(_req,reply)=>reply.code(201).send(await createProfile(db)));
  app.get("/profiles/:profileId",async(req:any)=>({versions:await profileSnapshot(db,req.params.profileId)}));
  app.post("/profiles/:profileId/validate",async(req:any)=>validateProfile(db,req.params.profileId));
  app.get("/profiles/:profileId/discrepancies",async(req:any)=>({items:await listDiscrepancies(db,req.params.profileId)}));
  app.post("/profiles/:profileId/lock",async(req:any)=>lockProfile(db,req.params.profileId));
  app.post("/profiles/:profileId/corrections",{
    schema:{body:{type:"object",additionalProperties:false,required:["fieldId","value"],properties:{fieldId:{type:"string",minLength:1},value:{}}}},
  },async(req:any,reply)=>reply.code(201).send(await createCorrectionDraft(db,{profileId:req.params.profileId,fieldId:(req.body as any).fieldId,value:(req.body as any).value})));
  app.get("/profiles/:profileId/snapshot",async(req:any)=>({versions:await profileSnapshot(db,req.params.profileId),audit:await auditEvents(db,req.params.profileId)}));

  app.put("/profile-versions/:versionId/facts/:fieldId",{
    schema:{body:{type:"object",additionalProperties:false,required:["value"],properties:{value:{}}}},
  },async(req:any)=>{
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
  app.post("/profile-versions/:versionId/customer-objectives",{
    schema:{body:{type:"object",additionalProperties:false,required:["objectiveId"],properties:{
      objectiveId:{type:"string",minLength:1},
    }}},
  },async(req:any,reply)=>{
    const result=await persistCustomerObjective(db,{versionId:req.params.versionId,objectiveId:req.body.objectiveId});
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/profile-versions/:versionId/customer-objectives",async(req:any)=>listCustomerObjectives(db,req.params.versionId));
  app.get("/optimisation/catalogues/:catalogueVersion",async(req:any)=>getPersistedOptimisationCatalogue(db,req.params.catalogueVersion));
  app.get("/market-routes/synthetic",async()=>ensureSyntheticMarketRoutes(db));
  app.post("/profile-versions/:versionId/occupation-mappings",async(req:any,reply)=>{
    const result=await persistOccupationTaxonomyMappings(db,req.params.versionId);
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/profile-versions/:versionId/occupation-mappings",async(req:any)=>
    listOccupationTaxonomyMappings(db,req.params.versionId));
  app.post("/profile-versions/:versionId/candidate-vehicles",{
    schema:{body:{type:"object",additionalProperties:false,required:["candidateVehicleId","vehicleSnapshot"],properties:{
      candidateVehicleId:{type:"string",minLength:1},
      vehicleSnapshot:{type:"object",additionalProperties:true},
    }}},
  },async(req:any,reply)=>{
    const result=await registerCandidateVehicle(db,{
      versionId:req.params.versionId,
      candidateVehicleId:req.body.candidateVehicleId,
      vehicleSnapshot:req.body.vehicleSnapshot,
    });
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/profile-versions/:versionId/candidate-vehicles",async(req:any)=>
    listCandidateVehicles(db,req.params.versionId));
  app.post("/customer-objectives/:customerObjectiveId/scenario-explorations",{
    schema:{body:{type:"object",additionalProperties:false,required:["choices"],properties:{
      choices:{type:"object",minProperties:1,additionalProperties:{type:"array",minItems:1}},
    }}},
  },async(req:any,reply)=>{
    const result=await generateSprint4Scenarios(db,{
      customerObjectiveId:req.params.customerObjectiveId,
      choiceSets:req.body.choices,
    });
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/customer-objectives/:customerObjectiveId/scenario-explorations",async(req:any)=>
    listSprint4ScenarioExplorations(db,req.params.customerObjectiveId));
  app.post("/customer-objectives/:customerObjectiveId/scenario-explorations/:explorationFingerprint/market-route-quotes",async(req:any,reply)=>{
    const result=await executeSprint4MarketRoutes(db,{
      customerObjectiveId:req.params.customerObjectiveId,
      explorationFingerprint:req.params.explorationFingerprint,
    });
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/customer-objectives/:customerObjectiveId/scenario-explorations/:explorationFingerprint/market-route-quotes",async(req:any)=>
    listSprint4MarketRouteQuotes(db,{
      customerObjectiveId:req.params.customerObjectiveId,
      explorationFingerprint:req.params.explorationFingerprint,
    }));
  app.post("/customer-objectives/:customerObjectiveId/scenario-explorations/:explorationFingerprint/recommendations",async(req:any,reply)=>{
    const result=await createSprint4RecommendationSet(db,{
      customerObjectiveId:req.params.customerObjectiveId,
      explorationFingerprint:req.params.explorationFingerprint,
    });
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/customer-objectives/:customerObjectiveId/scenario-explorations/:explorationFingerprint/recommendations",async(req:any)=>
    getSprint4RecommendationSet(db,{
      customerObjectiveId:req.params.customerObjectiveId,
      explorationFingerprint:req.params.explorationFingerprint,
    }));
  app.get("/recommendations/:recommendationSetId/explanation",async(req:any)=>
    getSprint4RecommendationExplanation(db,req.params.recommendationSetId));
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
  app.post("/raw-provider-responses/:rawProviderResponseId/normalise",async(req:any,reply)=>{
    const result=await normaliseRawProviderResponse(db,req.params.rawProviderResponseId);
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/raw-provider-responses/:rawProviderResponseId/normalised-quotes",async(req:any)=>listNormalisedQuotes(db,req.params.rawProviderResponseId));
  app.post("/profile-versions/:versionId/shortlists",async(req:any,reply)=>{
    const result=await createShortlist(db,req.params.versionId);
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/shortlists/:shortlistId",async(req:any)=>getShortlist(db,req.params.shortlistId));
  app.post("/shortlists/:shortlistId/selections",{
    schema:{body:{type:"object",additionalProperties:false,required:["normalisedQuoteId"],properties:{
      normalisedQuoteId:{type:"string",minLength:1},
      recommendationSetId:{type:"string",minLength:1},
    }}},
  },async(req:any,reply)=>reply.code(201).send(await selectShortlistedQuote(db,{
    shortlistId:req.params.shortlistId,
    normalisedQuoteId:req.body.normalisedQuoteId,
    recommendationSetId:req.body.recommendationSetId,
  })));
  app.get("/selections/:selectionId",async(req:any)=>getSelection(db,req.params.selectionId));
  app.get("/scenarios/:scenarioId/integrity-signals",async(req:any)=>({items:await listPreQuoteIntegritySignals(db,req.params.scenarioId)}));

  app.post("/admin/cxm/intake/refresh-lifecycle",{
    schema:{body:{type:"object",additionalProperties:false,properties:{
      now:{type:"string",format:"date-time"},
    }}},
  },async(req:any)=>refreshDueCustomerIntakeLifecycle(pool,req.body?.now?new Date(req.body.now):new Date()));

  app.post("/admin/cxm/intake/gmail-event",{
    schema:{body:{type:"object",additionalProperties:false,required:["provider","eventId","mailbox","message","synthetic"],properties:{
      provider:{type:"string",enum:["gmail"]},
      eventId:{type:"string",minLength:1,maxLength:512},
      mailbox:{type:"string",format:"email"},
      synthetic:{type:"boolean"},
      message:{type:"object",additionalProperties:false,required:["id","subject","body"],properties:{
        id:{type:"string",minLength:1,maxLength:512},
        threadId:{type:["string","null"],maxLength:512},
        receivedAt:{type:["string","null"],format:"date-time"},
        subject:{type:"string",minLength:1,maxLength:998},
        body:{type:"string",minLength:1,maxLength:120000},
      }},
    }}},
  },async(req:any,reply)=>{
    const result=await handleGmailIntakeEvent(pool,req.body);
    return reply.code(result.disposition==="PROCESSED"?201:200).send(result);
  });

  app.post("/admin/cxm/intake/email",{
    schema:{body:{type:"object",additionalProperties:false,required:["sourceMailbox","sourceMessageId","subject","body","synthetic"],properties:{
      sourceMailbox:{type:"string",format:"email"},
      sourceMessageId:{type:"string",minLength:1,maxLength:512},
      sourceThreadId:{type:["string","null"],maxLength:512},
      receivedAt:{type:["string","null"],format:"date-time"},
      subject:{type:"string",minLength:1,maxLength:998},
      body:{type:"string",minLength:1,maxLength:120000},
      synthetic:{type:"boolean"},
    }}},
  },async(req:any,reply)=>{
    const result=await processCustomerIntakeEmail(pool,req.body);
    return reply.code(result.deduplicated?200:201).send(result);
  });

  app.get("/admin/profiles/:profileId",async(req:any)=>({versions:await profileSnapshot(db,req.params.profileId),audit:await auditEvents(db,req.params.profileId),discrepancies:await listDiscrepancies(db,req.params.profileId)}));
  app.get("/admin/profile-versions/:versionId",async(req:any)=>profileSnapshotByVersion(db,req.params.versionId));
  app.get("/admin/audit",async(req:any)=>({items:await auditEvents(db,String(req.query.profileId??""))}));
  app.get("/admin/selections/:selectionId/trace",async(req:any)=>getSelectionTrace(db,req.params.selectionId));
  app.get("/admin/selections/:selectionId/sp4-trace",async(req:any)=>getSprint4AdminSelectionTrace(db,req.params.selectionId));

  app.setErrorHandler((error:any,req:any,reply)=>{
    if(error instanceof FinalIntegrityError)return reply.code(409).send({error:error.message,selectionId:error.selectionId,signals:error.signals});
    if(error instanceof PreQuoteIntegrityError)return reply.code(409).send({error:error.message,signals:error.signals});
    if(error instanceof ConflictError)return reply.code(409).send({error:error.message});
    if(error instanceof ValidationError)return reply.code(422).send({error:error.message,issues:error.issues});
    if(error?.validation){
      const url=String(req?.url??"");
      const code=url.includes("/admin/cxm/intake/")?"INVALID_CUSTOMER_INTAKE_EMAIL":url.includes("/quote-requests")?"INVALID_QUOTE_REQUEST":"INVALID_OPTIMISATION_PREFERENCE";
      return reply.code(422).send({error:code,issues:error.validation.map((item:any)=>item.message)});
    }
    if(String(error?.message??error).includes("only O is permitted"))return reply.code(422).send({error:String(error.message)});
    if(String(error?.message??error).includes("LOCKED_PROFILE_IMMUTABLE"))return reply.code(409).send({error:"LOCKED_PROFILE_IMMUTABLE"});
    const protocolStatus=Number(error?.statusCode??0);
    if([400,413,415].includes(protocolStatus)){
      const protocolError=protocolStatus===400?"invalid_request":protocolStatus===413?"payload_too_large":"unsupported_media_type";
      return reply.code(protocolStatus).send({error:protocolError,requestId:req.id});
    }
    app.log.error({err:error,requestId:req.id},"Unhandled request error"); return reply.code(500).send(internalErrorPayload(req.id));
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
