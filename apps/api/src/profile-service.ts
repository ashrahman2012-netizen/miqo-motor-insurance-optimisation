import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { MiqoDatabase } from "../../../packages/db/src/client.ts";
import { auditEvent, canonicalFieldValue, discrepancy, profile, riskProfileVersion, scenario, scenarioDelta, customer } from "../../../packages/db/src/schema.ts";
import { createScenario, type ControlClass, type RiskProfileVersion } from "../../../packages/domain/src/model.ts";
import { OPTIMISATION_PREFERENCE_KEYS } from "../../../packages/scenarios/src/model.ts";
import { ConflictError, ValidationError } from "./errors.ts";

const REQUIRED_FACTS = ["main_driver_id", "annual_mileage", "licence_held_since"] as const;
const uuid=(p:string)=>`${p}-${randomUUID()}`;

async function appendAudit(tx:any,args:{eventType:string;entityType:string;entityId:string;traceId?:string;metadata?:unknown}) {
  await tx.insert(auditEvent).values({auditEventId:uuid("AUD"),eventType:args.eventType,entityType:args.entityType,entityId:args.entityId,traceId:args.traceId,metadataJson:args.metadata??{}});
}

export async function createProfile(db:MiqoDatabase) {
  return db.transaction(async tx=>{
    const customerId=uuid("CUS-SYN"), profileId=uuid("PRO-SYN"), versionId=uuid("RPV-SYN");
    await tx.insert(customer).values({customerId,synthetic:true});
    await tx.insert(profile).values({profileId,customerId});
    await tx.insert(riskProfileVersion).values({riskProfileVersionId:versionId,profileId,versionNo:1,status:"DRAFT"});
    await appendAudit(tx,{eventType:"profile_created",entityType:"profile",entityId:profileId,traceId:profileId,metadata:{versionId}});
    return {profileId,versionId};
  });
}

export async function currentVersion(db:MiqoDatabase, profileId:string) {
  return (await db.select().from(riskProfileVersion).where(eq(riskProfileVersion.profileId,profileId)).orderBy(desc(riskProfileVersion.versionNo)).limit(1))[0];
}

export async function listValues(db:MiqoDatabase,versionId:string) {
  const rows=await db.select().from(canonicalFieldValue).where(eq(canonicalFieldValue.riskProfileVersionId,versionId)).orderBy(asc(canonicalFieldValue.fieldId));
  return rows.map(r=>({fieldId:r.fieldId,controlClass:r.controlClass,value:r.valueJson,sourceType:r.sourceType,createdAt:r.createdAt}));
}

export async function putFact(db:MiqoDatabase,args:{profileId:string;fieldId:string;value:unknown;controlClass?:ControlClass}) {
  const version=await currentVersion(db,args.profileId); if(!version) throw new ValidationError("Profile not found");
  if(version.status!=="DRAFT") throw new ConflictError("LOCKED_PROFILE_IMMUTABLE");
  const controlClass=args.controlClass??"F";
  await db.transaction(async tx=>{
    await tx.insert(canonicalFieldValue).values({canonicalFieldValueId:uuid("CFV"),riskProfileVersionId:version.riskProfileVersionId,fieldId:args.fieldId,controlClass,valueJson:args.value,sourceType:"customer_declared"})
      .onConflictDoUpdate({target:[canonicalFieldValue.riskProfileVersionId,canonicalFieldValue.fieldId],set:{controlClass,valueJson:args.value,sourceType:"customer_declared"}});
    await appendAudit(tx,{eventType:"fact_saved",entityType:"risk_profile_version",entityId:version.riskProfileVersionId,traceId:args.profileId,metadata:{fieldId:args.fieldId,controlClass}});
  });
  return {versionId:version.riskProfileVersionId};
}

export async function validateProfile(db:MiqoDatabase,profileId:string) {
  const version=await currentVersion(db,profileId); if(!version) throw new ValidationError("Profile not found");
  const values=await listValues(db,version.riskProfileVersionId); const present=new Set(values.map(v=>v.fieldId));
  const issues=REQUIRED_FACTS.filter(x=>!present.has(x)).map(x=>`Missing required field: ${x}`);
  await appendAudit(db,{eventType:"profile_validated",entityType:"risk_profile_version",entityId:version.riskProfileVersionId,traceId:profileId,metadata:{valid:issues.length===0,issues}});
  return {valid:issues.length===0,issues,versionId:version.riskProfileVersionId};
}

export async function lockProfile(db:MiqoDatabase,profileId:string,opts:{simulateAuditFailure?:boolean}={}) {
  return db.transaction(async tx=>{
    const versions=await tx.select().from(riskProfileVersion).where(eq(riskProfileVersion.profileId,profileId)).orderBy(desc(riskProfileVersion.versionNo)).limit(1);
    const version=versions[0]; if(!version) throw new ValidationError("Profile not found");
    if(version.status!=="DRAFT") throw new ConflictError("Only a DRAFT profile version can be locked");
    const values=await tx.select().from(canonicalFieldValue).where(eq(canonicalFieldValue.riskProfileVersionId,version.riskProfileVersionId));
    const present=new Set(values.map(v=>v.fieldId)); const issues=REQUIRED_FACTS.filter(x=>!present.has(x)).map(x=>`Missing required field: ${x}`);
    if(issues.length) throw new ValidationError("Profile cannot be locked",issues);
    await tx.update(riskProfileVersion).set({status:"SUPERSEDED"}).where(and(eq(riskProfileVersion.profileId,profileId),eq(riskProfileVersion.status,"LOCKED")));
    await tx.update(riskProfileVersion).set({status:"LOCKED",lockedAt:new Date()}).where(and(eq(riskProfileVersion.riskProfileVersionId,version.riskProfileVersionId),eq(riskProfileVersion.status,"DRAFT")));
    if(opts.simulateAuditFailure) throw new Error("SIMULATED_AUDIT_FAILURE");
    await appendAudit(tx,{eventType:"profile_locked",entityType:"risk_profile_version",entityId:version.riskProfileVersionId,traceId:profileId,metadata:{versionNo:version.versionNo}});
    return {versionId:version.riskProfileVersionId,versionNo:version.versionNo};
  });
}

export async function loadRiskProfileVersion(db:MiqoDatabase,versionId:string):Promise<RiskProfileVersion> {
  const row=(await db.select().from(riskProfileVersion).where(eq(riskProfileVersion.riskProfileVersionId,versionId)).limit(1))[0]; if(!row) throw new ValidationError("Profile version not found");
  return Object.freeze({id:row.riskProfileVersionId,version:row.versionNo,status:row.status,values:Object.freeze((await listValues(db,versionId)).map(v=>Object.freeze({fieldId:v.fieldId,controlClass:v.controlClass,value:v.value})))}) as RiskProfileVersion;
}

export async function createPersistedScenario(db:MiqoDatabase,args:{versionId:string;deltas:Array<{fieldId:string;controlClass:ControlClass;value:unknown}>}) {
  const approved=new Set<string>(OPTIMISATION_PREFERENCE_KEYS);
  const invalid=args.deltas.filter(delta=>delta.controlClass==="O" && !approved.has(delta.fieldId));
  if(invalid.length) throw new ValidationError("INVALID_SCENARIO_DELTA",invalid.map(delta=>`${delta.fieldId} is not an approved O-class optimisation control`));
  const p=await loadRiskProfileVersion(db,args.versionId); const d=createScenario({id:uuid("SCN"),profileVersion:p,deltas:args.deltas});
  return db.transaction(async tx=>{
    await tx.insert(scenario).values({scenarioId:d.id,riskProfileVersionId:args.versionId,status:"READY"});
    if(d.deltas.length) await tx.insert(scenarioDelta).values(d.deltas.map(x=>({scenarioDeltaId:uuid("SCD"),scenarioId:d.id,fieldId:x.fieldId,controlClass:"O" as const,valueJson:x.value})));
    await appendAudit(tx,{eventType:"scenario_generated",entityType:"scenario",entityId:d.id,metadata:{versionId:args.versionId}}); return d;
  });
}

export async function createCorrectionDraft(db:MiqoDatabase,args:{profileId:string;fieldId:string;value:unknown;simulateAuditFailure?:boolean}) {
  return db.transaction(async tx=>{
    const source=(await tx.select().from(riskProfileVersion).where(eq(riskProfileVersion.profileId,args.profileId)).orderBy(desc(riskProfileVersion.versionNo)).limit(1))[0];
    if(!source) throw new ValidationError("Profile not found"); if(!["LOCKED","SUPERSEDED"].includes(source.status)) throw new ConflictError("Correction flow starts from a locked version");
    const nextNo=source.versionNo+1,nextId=uuid("RPV-SYN");
    await tx.insert(riskProfileVersion).values({riskProfileVersionId:nextId,profileId:args.profileId,versionNo:nextNo,status:"DRAFT"});
    const sourceValues=await tx.select().from(canonicalFieldValue).where(eq(canonicalFieldValue.riskProfileVersionId,source.riskProfileVersionId));
    const copied=sourceValues.map(v=>({canonicalFieldValueId:uuid("CFV"),riskProfileVersionId:nextId,fieldId:v.fieldId,controlClass:v.controlClass,valueJson:v.fieldId===args.fieldId?args.value:v.valueJson,sourceType:v.fieldId===args.fieldId?"customer_correction":v.sourceType}));
    if(!sourceValues.some(v=>v.fieldId===args.fieldId)) copied.push({canonicalFieldValueId:uuid("CFV"),riskProfileVersionId:nextId,fieldId:args.fieldId,controlClass:"F",valueJson:args.value,sourceType:"customer_correction"});
    if(copied.length) await tx.insert(canonicalFieldValue).values(copied as any);
    if(args.simulateAuditFailure) throw new Error("SIMULATED_CORRECTION_AUDIT_FAILURE");
    await appendAudit(tx,{eventType:"profile_correction_started",entityType:"risk_profile_version",entityId:nextId,traceId:args.profileId,metadata:{sourceVersionId:source.riskProfileVersionId,fieldId:args.fieldId}});
    return {versionId:nextId,versionNo:nextNo,sourceVersionId:source.riskProfileVersionId};
  });
}

export async function profileSnapshot(db:MiqoDatabase,profileId:string) {
  const versions=await db.select().from(riskProfileVersion).where(eq(riskProfileVersion.profileId,profileId)).orderBy(asc(riskProfileVersion.versionNo));
  return Promise.all(versions.map(async v=>({versionId:v.riskProfileVersionId,versionNo:v.versionNo,status:v.status,lockedAt:v.lockedAt,values:await listValues(db,v.riskProfileVersionId)})));
}

export async function auditEvents(db:MiqoDatabase,profileId:string) {
  return db.select().from(auditEvent).where(eq(auditEvent.traceId,profileId)).orderBy(asc(auditEvent.occurredAt),asc(auditEvent.auditEventId));
}

export async function listDiscrepancies(db:MiqoDatabase,profileId:string) {
  const v=await currentVersion(db,profileId); if(!v) throw new ValidationError("Profile not found");
  return db.select().from(discrepancy).where(eq(discrepancy.riskProfileVersionId,v.riskProfileVersionId));
}
