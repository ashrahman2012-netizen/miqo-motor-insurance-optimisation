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
import { getCurrentOptimisationPolicy, getPersistedOptimisationCatalogue, listCustomerObjectives, persistCustomerObjective } from "./optimisation-policy-service.ts";
import { generateSprint4Scenarios, listSprint4ScenarioExplorations } from "./sprint4-scenario-service.ts";
import { ensureSyntheticMarketRoutes, executeSprint4MarketRoutes, listSprint4MarketRouteQuotes } from "./sprint4-market-route-service.ts";
import { listCandidateVehicles, listOccupationTaxonomyMappings, persistOccupationTaxonomyMappings, registerCandidateVehicle } from "./sprint4-profile-integrity-service.ts";
import { createSprint4RecommendationSet, getSprint4RecommendationSet } from "./sprint4-recommendation-service.ts";
import { getSprint4RecommendationExplanation } from "./sprint4-explanation-service.ts";
import { getSprint4ObjectiveQuoteComparison } from "./sprint4-comparison-service.ts";

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
  app.post("/profile-versions/:versionId/customer-objectives",{
    schema:{body:{type:"object",additionalProperties:false,required:["objectiveId"],properties:{
      objectiveId:{type:"string",minLength:1},
    }}},
  },async(req:any,reply)=>{
    const result=await persistCustomerObjective(db,{versionId:req.params.versionId,objectiveId:req.body.objectiveId});
    return reply.code(result.created?201:200).send(result);
  });
  app.get("/profile-versions/:versionId/customer-objectives",async(req:any)=>listCustomerObjectives(db,req.params.versionId));
  app.get("/optimisation/policy/current",async()=>getCurrentOptimisationPolicy());
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
  app.get("/customer-objectives/:customerObjectiveId/scenario-explorations/:explorationFingerprint/quote-comparison",async(req:any)=>getSprint4ObjectiveQuoteComparison(db,{customerObjectiveId:req.params.customerObjectiveId,explorationFingerprint:req.params.explorationFingerprint}));
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
