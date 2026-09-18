import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { MiqoDatabase } from "../../../packages/db/src/client.ts";
import { auditEvent, canonicalFieldValue, optimisationPreference, riskProfileVersion, scenario } from "../../../packages/db/src/schema.ts";
import { createOptimisationPreference, type OptimisationPreferenceKey } from "../../../packages/scenarios/src/model.ts";
import { ConflictError, ValidationError } from "./errors.ts";
import { loadRiskProfileVersion } from "./profile-service.ts";

export type PreferenceInput = Partial<Record<OptimisationPreferenceKey, unknown>>;

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

function validateValue(key:OptimisationPreferenceKey,value:unknown) {
  switch(key) {
    case "voluntary_excess":
      if(!Number.isInteger(value) || Number(value)<0) throw new ValidationError("INVALID_OPTIMISATION_PREFERENCE",[`${key} must be a non-negative integer`]);
      return;
    case "payment_structure":
      if(!["ANNUAL","MONTHLY"].includes(String(value))) throw new ValidationError("INVALID_OPTIMISATION_PREFERENCE",[`${key} must be ANNUAL or MONTHLY`]);
      return;
    case "policy_start_date":
      if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new ValidationError("INVALID_OPTIMISATION_PREFERENCE",[`${key} must be an ISO date`]);
      return;
    case "telematics_preference":
      if(typeof value!=="boolean") throw new ValidationError("INVALID_OPTIMISATION_PREFERENCE",[`${key} must be boolean`]);
      return;
    case "genuine_named_driver_inclusion":
      if(!Array.isArray(value) || value.some(driverId=>typeof driverId!=="string" || !driverId.trim())) throw new ValidationError("INVALID_OPTIMISATION_PREFERENCE",[`${key} must be an array of existing driver IDs`]);
  }
}

async function assertExistingDrivers(db:MiqoDatabase,versionId:string,value:unknown) {
  const requested=value as string[];
  const facts=await db.select().from(canonicalFieldValue).where(eq(canonicalFieldValue.riskProfileVersionId,versionId));
  const existing=new Set(facts.filter(f=>f.fieldId==="main_driver_id" || f.fieldId.startsWith("named_driver_id")).map(f=>String(f.valueJson)));
  const missing=requested.filter(driverId=>!existing.has(driverId));
  if(missing.length) throw new ValidationError("UNKNOWN_GENUINE_DRIVER",missing.map(driverId=>`Driver ${driverId} is not present in the locked profile`));
}

export async function saveOptimisationPreferences(db:MiqoDatabase,args:{versionId:string;preferences:PreferenceInput}) {
  const entries=Object.entries(args.preferences) as [OptimisationPreferenceKey,unknown][];
  if(!entries.length) throw new ValidationError("EMPTY_OPTIMISATION_PREFERENCES");
  const profileVersion=await loadRiskProfileVersion(db,args.versionId);
  if(profileVersion.status!=="LOCKED") throw new ConflictError("OPTIMISATION_REQUIRES_LOCKED_PROFILE");

  return db.transaction(async tx=>{
    const generated=await tx.select({scenarioId:scenario.scenarioId}).from(scenario).where(and(eq(scenario.riskProfileVersionId,args.versionId),eq(scenario.status,"GENERATED"))).limit(1);
    if(generated.length) throw new ConflictError("PREFERENCE_SET_FROZEN_BY_SCENARIO");

    for(const [key,value] of entries) {
      validateValue(key,value);
      createOptimisationPreference({id:"validation-only",profileVersion,key,value});
      if(key==="genuine_named_driver_inclusion") await assertExistingDrivers(tx as MiqoDatabase,args.versionId,value);
      await tx.insert(optimisationPreference).values({
        optimisationPreferenceId:uuid("OPT"),riskProfileVersionId:args.versionId,preferenceKey:key,valueJson:value,
      }).onConflictDoUpdate({
        target:[optimisationPreference.riskProfileVersionId,optimisationPreference.preferenceKey],
        set:{valueJson:value},
      });
    }
    const versionRow=(await tx.select({profileId:riskProfileVersion.profileId}).from(riskProfileVersion).where(eq(riskProfileVersion.riskProfileVersionId,args.versionId)).limit(1))[0];
    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),eventType:"optimisation_preferences_saved",entityType:"risk_profile_version",entityId:args.versionId,
      traceId:versionRow.profileId,metadataJson:{keys:entries.map(([key])=>key)},
    });
    return listOptimisationPreferences(tx as MiqoDatabase,args.versionId);
  });
}

export async function listOptimisationPreferences(db:MiqoDatabase,versionId:string) {
  await loadRiskProfileVersion(db,versionId);
  const items=await db.select().from(optimisationPreference).where(eq(optimisationPreference.riskProfileVersionId,versionId)).orderBy(asc(optimisationPreference.preferenceKey));
  return {riskProfileVersionId:versionId,items:items.map(item=>({
    preferenceId:item.optimisationPreferenceId,key:item.preferenceKey,value:item.valueJson,frozenAt:item.frozenAt,createdAt:item.createdAt,
  }))};
}
