import {createHash,randomUUID} from "node:crypto";
import {and,asc,eq,sql} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  canonicalFieldValue,
  customerObjective,
  riskProfileVersion,
  scenario,
  scenarioDelta,
} from "../../../packages/db/src/schema.ts";
import {
  scenarioGenerationRejection,
  sp4ScenarioLineage,
} from "../../../packages/db/src/sp4-schema.ts";
import {
  OPTIMISATION_CATALOGUE_VERSION,
  optimisationPolicyFingerprint,
} from "../../../packages/optimisation/src/index.ts";
import {
  SP4_SCENARIO_GENERATOR_VERSION,
  buildSprint4ScenarioCandidates,
  deterministicSprint4RejectionId,
  deterministicSprint4ScenarioId,
  isPersistableSprint4Control,
  scenarioExplorationFingerprint,
  type ScenarioChoiceSets,
  type ScenarioGenerationContext,
} from "../../../packages/scenarios/src/sprint4.ts";
import {ConflictError,ValidationError} from "./errors.ts";

const uuid=(prefix:string)=>prefix+"-"+randomUUID();

function stableId(prefix:string,...parts:string[]){
  return prefix+"-"+createHash("sha256").update(parts.join("|")).digest("hex").slice(0,24);
}

async function loadObjective(db:MiqoDatabase,customerObjectiveId:string){
  const row=(await db.select().from(customerObjective)
    .where(eq(customerObjective.customerObjectiveId,customerObjectiveId)).limit(1))[0];
  if(!row)throw new ValidationError("CUSTOMER_OBJECTIVE_NOT_FOUND");

  const version=(await db.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,row.riskProfileVersionId)).limit(1))[0];
  if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");
  if(version.status!=="LOCKED")throw new ConflictError("SCENARIO_REQUIRES_LOCKED_PROFILE");

  if(row.catalogueVersion!==OPTIMISATION_CATALOGUE_VERSION
    || row.policyFingerprint!==optimisationPolicyFingerprint()){
    throw new ConflictError("CUSTOMER_OBJECTIVE_POLICY_NOT_CURRENT");
  }

  return {objective:row,version};
}

async function loadContext(db:MiqoDatabase,versionId:string):Promise<ScenarioGenerationContext>{
  const facts=await db.select().from(canonicalFieldValue)
    .where(eq(canonicalFieldValue.riskProfileVersionId,versionId))
    .orderBy(asc(canonicalFieldValue.fieldId));

  const byId=new Map(facts.map(item=>[item.fieldId,item.valueJson]));
  const vehicleMode=byId.get("vehicle_mode")==="PRE_PURCHASE"?"PRE_PURCHASE" as const:"CURRENT_VEHICLE" as const;
  const mainDriverRaw=byId.get("main_driver_id");
  const mainDriverId=typeof mainDriverRaw==="string"?mainDriverRaw:null;
  const genuineNamedDriverIds=facts
    .filter(item=>item.fieldId.startsWith("named_driver_id"))
    .map(item=>String(item.valueJson))
    .sort();

  return Object.freeze({
    vehicleMode,
    mainDriverId,
    genuineNamedDriverIds:Object.freeze(genuineNamedDriverIds),
    candidateVehicleIds:Object.freeze([]),
  });
}

async function presentExploration(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  explorationFingerprint:string;
  created:boolean;
}){
  const lineageRows=await db.select().from(sp4ScenarioLineage).where(and(
    eq(sp4ScenarioLineage.customerObjectiveId,args.customerObjectiveId),
    eq(sp4ScenarioLineage.explorationFingerprint,args.explorationFingerprint),
  )).orderBy(asc(sp4ScenarioLineage.candidateFingerprint));

  const items=(await Promise.all(lineageRows.map(async lineage=>{
    const row=(await db.select().from(scenario).where(eq(scenario.scenarioId,lineage.scenarioId)).limit(1))[0];
    const deltas=await db.select().from(scenarioDelta)
      .where(eq(scenarioDelta.scenarioId,lineage.scenarioId))
      .orderBy(asc(scenarioDelta.fieldId));
    return {
      scenarioId:lineage.scenarioId,
      riskProfileVersionId:lineage.riskProfileVersionId,
      customerObjectiveId:lineage.customerObjectiveId,
      generationVersion:lineage.generationVersion,
      generationOrdinal:row?.generationOrdinal??null,
      explorationFingerprint:lineage.explorationFingerprint,
      candidateFingerprint:lineage.candidateFingerprint,
      catalogueVersion:lineage.catalogueVersion,
      policyFingerprint:lineage.policyFingerprint,
      explorationSnapshot:row?.preferenceSnapshotJson??null,
      deltas:deltas.map(delta=>({
        fieldId:delta.fieldId,
        controlClass:delta.controlClass,
        value:delta.valueJson,
      })),
    };
  }))).sort((a,b)=>(Number(a.generationOrdinal)-Number(b.generationOrdinal))||a.scenarioId.localeCompare(b.scenarioId));

  const rejectionRows=await db.select().from(scenarioGenerationRejection).where(and(
    eq(scenarioGenerationRejection.customerObjectiveId,args.customerObjectiveId),
    eq(scenarioGenerationRejection.explorationFingerprint,args.explorationFingerprint),
  )).orderBy(
    asc(scenarioGenerationRejection.candidateFingerprint),
    asc(scenarioGenerationRejection.ruleId),
    asc(scenarioGenerationRejection.scenarioGenerationRejectionId),
  );

  return {
    created:args.created,
    customerObjectiveId:args.customerObjectiveId,
    explorationFingerprint:args.explorationFingerprint,
    generationVersion:SP4_SCENARIO_GENERATOR_VERSION,
    items,
    rejections:rejectionRows.map(row=>({
      rejectionId:row.scenarioGenerationRejectionId,
      candidateFingerprint:row.candidateFingerprint,
      candidate:row.candidateJson,
      ruleId:row.ruleId,
      category:row.category,
      reason:row.reason,
      catalogueVersion:row.catalogueVersion,
      generationVersion:row.generationVersion,
    })),
  };
}

export async function generateSprint4Scenarios(db:MiqoDatabase,args:{
  customerObjectiveId:string;
  choiceSets:ScenarioChoiceSets;
  simulateFailureAfterFirstScenario?:boolean;
}){
  const {objective,version}=await loadObjective(db,args.customerObjectiveId);
  const context=await loadContext(db,version.riskProfileVersionId);

  let candidates;
  try{
    candidates=buildSprint4ScenarioCandidates({choiceSets:args.choiceSets,context});
  }catch(error:any){
    throw new ValidationError(String(error?.message??error));
  }

  const explorationFingerprint=scenarioExplorationFingerprint({
    riskProfileVersionId:version.riskProfileVersionId,
    customerObjectiveId:objective.customerObjectiveId,
    catalogueVersion:objective.catalogueVersion,
    policyFingerprint:objective.policyFingerprint,
    choiceSets:args.choiceSets,
    context,
  });

  return db.transaction(async tx=>{
    const txDb=tx as MiqoDatabase;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`sp4-scenario:${objective.customerObjectiveId}:${explorationFingerprint}`}))`);

    const existingLineage=await tx.select({scenarioId:sp4ScenarioLineage.scenarioId})
      .from(sp4ScenarioLineage).where(and(
        eq(sp4ScenarioLineage.customerObjectiveId,objective.customerObjectiveId),
        eq(sp4ScenarioLineage.explorationFingerprint,explorationFingerprint),
      )).limit(1);

    const existingRejection=await tx.select({id:scenarioGenerationRejection.scenarioGenerationRejectionId})
      .from(scenarioGenerationRejection).where(and(
        eq(scenarioGenerationRejection.customerObjectiveId,objective.customerObjectiveId),
        eq(scenarioGenerationRejection.explorationFingerprint,explorationFingerprint),
      )).limit(1);

    if(existingLineage.length || existingRejection.length){
      return presentExploration(txDb,{
        customerObjectiveId:objective.customerObjectiveId,
        explorationFingerprint,
        created:false,
      });
    }

    const snapshot={
      customerObjectiveId:objective.customerObjectiveId,
      objectiveId:objective.objectiveId,
      objectiveVersion:objective.objectiveVersion,
      catalogueVersion:objective.catalogueVersion,
      policyFingerprint:objective.policyFingerprint,
      generationVersion:SP4_SCENARIO_GENERATOR_VERSION,
      choiceSets:args.choiceSets,
      context,
    };
    const generatedAt=new Date();
    let insertedScenarioCount=0;

    for(const candidate of candidates){
      if(candidate.rejections.length){
        for(const rejection of candidate.rejections){
          await tx.insert(scenarioGenerationRejection).values({
            scenarioGenerationRejectionId:deterministicSprint4RejectionId(
              explorationFingerprint,candidate.candidateFingerprint,rejection.ruleId,
            ),
            customerObjectiveId:objective.customerObjectiveId,
            riskProfileVersionId:version.riskProfileVersionId,
            catalogueVersion:objective.catalogueVersion,
            generationVersion:SP4_SCENARIO_GENERATOR_VERSION,
            explorationFingerprint,
            candidateFingerprint:candidate.candidateFingerprint,
            candidateJson:candidate.values,
            ruleId:rejection.ruleId,
            category:rejection.category,
            reason:rejection.reason,
          });
        }
        continue;
      }

      const scenarioId=deterministicSprint4ScenarioId(explorationFingerprint,candidate.candidateFingerprint);
      await tx.insert(scenario).values({
        scenarioId,
        riskProfileVersionId:version.riskProfileVersionId,
        optimisationPreferenceId:null,
        generationVersion:SP4_SCENARIO_GENERATOR_VERSION,
        generatedAt,
        preferenceSnapshotJson:snapshot,
        generationFingerprint:explorationFingerprint,
        generationOrdinal:candidate.ordinal,
        status:"GENERATING",
      });

      await tx.insert(sp4ScenarioLineage).values({
        scenarioId,
        customerObjectiveId:objective.customerObjectiveId,
        riskProfileVersionId:version.riskProfileVersionId,
        catalogueVersion:objective.catalogueVersion,
        policyFingerprint:objective.policyFingerprint,
        generationVersion:SP4_SCENARIO_GENERATOR_VERSION,
        explorationFingerprint,
        candidateFingerprint:candidate.candidateFingerprint,
      });

      const deltas=Object.entries(candidate.values);
      if(deltas.length){
        await tx.insert(scenarioDelta).values(deltas.map(([fieldId,value])=>{
          if(!isPersistableSprint4Control(fieldId)){
            throw new ValidationError("SP4_ACCEPTED_CANDIDATE_CONTAINS_NON_PERSISTABLE_CONTROL");
          }
          return {
            scenarioDeltaId:stableId("SCD-SP4",scenarioId,fieldId),
            scenarioId,
            fieldId,
            controlClass:"O" as const,
            valueJson:value,
          };
        }));
      }

      if(args.simulateFailureAfterFirstScenario && insertedScenarioCount===0){
        throw new Error("SIMULATED_SP4_SCENARIO_GENERATION_FAILURE");
      }

      await tx.update(scenario).set({status:"GENERATED"}).where(eq(scenario.scenarioId,scenarioId));
      insertedScenarioCount+=1;
    }

    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"sp4_scenario_exploration_generated",
      entityType:"customer_objective",
      entityId:objective.customerObjectiveId,
      traceId:version.profileId,
      metadataJson:{
        riskProfileVersionId:version.riskProfileVersionId,
        catalogueVersion:objective.catalogueVersion,
        policyFingerprint:objective.policyFingerprint,
        generationVersion:SP4_SCENARIO_GENERATOR_VERSION,
        explorationFingerprint,
        candidateCount:candidates.length,
        acceptedCount:candidates.filter(candidate=>candidate.rejections.length===0).length,
        rejectedCandidateCount:candidates.filter(candidate=>candidate.rejections.length>0).length,
      },
    });

    return presentExploration(txDb,{
      customerObjectiveId:objective.customerObjectiveId,
      explorationFingerprint,
      created:true,
    });
  });
}

export async function listSprint4ScenarioExplorations(db:MiqoDatabase,customerObjectiveId:string){
  await loadObjective(db,customerObjectiveId);
  const lineage=await db.select({fingerprint:sp4ScenarioLineage.explorationFingerprint})
    .from(sp4ScenarioLineage).where(eq(sp4ScenarioLineage.customerObjectiveId,customerObjectiveId));
  const rejected=await db.select({fingerprint:scenarioGenerationRejection.explorationFingerprint})
    .from(scenarioGenerationRejection).where(eq(scenarioGenerationRejection.customerObjectiveId,customerObjectiveId));

  const fingerprints=[...new Set([...lineage,...rejected].map(item=>item.fingerprint))].sort();
  const items=[];
  for(const explorationFingerprint of fingerprints){
    items.push(await presentExploration(db,{customerObjectiveId,explorationFingerprint,created:false}));
  }
  return {items};
}
