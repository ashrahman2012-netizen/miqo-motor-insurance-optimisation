import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { MiqoDatabase } from "../../../packages/db/src/client.ts";
import { auditEvent, optimisationPreference, riskProfileVersion, scenario, scenarioDelta } from "../../../packages/db/src/schema.ts";
import { createOptimisationPreference, generateScenario, type OptimisationPreferenceKey } from "../../../packages/scenarios/src/model.ts";
import { ConflictError, ValidationError } from "./errors.ts";
import { loadRiskProfileVersion } from "./profile-service.ts";

export const SCENARIO_GENERATOR_VERSION = "sp2-gen-v1";

const uuid=(prefix:string)=>\`\${prefix}-\${randomUUID()}\`;

function canonicalise(value:unknown):unknown {
  if(Array.isArray(value)) {
    const items=value.map(canonicalise);
    return items.every(item=>typeof item==="string") ? [...items].sort() : items;
  }
  if(value && typeof value==="object") {
    return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonicalise(item)]));
  }
  return value;
}

function buildSnapshot(rows:Array<{preferenceKey:string;valueJson:unknown}>) {
  return Object.fromEntries(rows.map(row=>[row.preferenceKey,canonicalise(row.valueJson)])) as Record<string,unknown>;
}

export function scenarioGenerationFingerprint(args:{versionId:string;generationVersion:string;preferenceSnapshot:Record<string,unknown>}) {
  const payload=JSON.stringify({
    riskProfileVersionId:args.versionId,
    generationVersion:args.generationVersion,
    preferences:canonicalise(args.preferenceSnapshot),
  });
  return createHash("sha256").update(payload).digest("hex");
}

async function loadGenerated(db:MiqoDatabase,versionId:string,fingerprint:string) {
  const rows=await db.select().from(scenario).where(and(
    eq(scenario.riskProfileVersionId,versionId),
    eq(scenario.status,"GENERATED"),
    eq(scenario.generationFingerprint,fingerprint),
  )).orderBy(asc(scenario.generationOrdinal));

  const items=await Promise.all(rows.map(async row=>({
    scenarioId:row.scenarioId,
    riskProfileVersionId:row.riskProfileVersionId,
    generationVersion:row.generationVersion,
    generatedAt:row.generatedAt,
    generationFingerprint:row.generationFingerprint,
    generationOrdinal:row.generationOrdinal,
    preferenceSnapshot:row.preferenceSnapshotJson,
    deltas:(await db.select().from(scenarioDelta).where(eq(scenarioDelta.scenarioId,row.scenarioId)).orderBy(asc(scenarioDelta.fieldId))).map(delta=>({
      fieldId:delta.fieldId,
      controlClass:delta.controlClass,
      value:delta.valueJson,
    })),
  })));
  return items;
}

export async function generateScenarios(db:MiqoDatabase,args:{
  versionId:string;
  generationVersion?:string;
  simulateFailureAfterScenario?:boolean;
}) {
  const generationVersion=args.generationVersion??SCENARIO_GENERATOR_VERSION;
  const profileVersion=await loadRiskProfileVersion(db,args.versionId);
  if(profileVersion.status!=="LOCKED") throw new ConflictError("SCENARIO_REQUIRES_LOCKED_PROFILE");

  return db.transaction(async tx=>{
    const txDb=tx as MiqoDatabase;
    await tx.execute(sql\`SELECT pg_advisory_xact_lock(hashtext(\${\`scenario:\${args.versionId}:\${generationVersion}\`}))\`);

    const preferences=await tx.select().from(optimisationPreference)
      .where(eq(optimisationPreference.riskProfileVersionId,args.versionId))
      .orderBy(asc(optimisationPreference.preferenceKey));

    if(!preferences.length) throw new ValidationError("SCENARIO_GENERATION_REQUIRES_PREFERENCES");

    const domainPreferences=preferences.map(row=>createOptimisationPreference({
      id:row.optimisationPreferenceId,
      profileVersion,
      key:row.preferenceKey,
      value:row.valueJson,
      createdAt:row.createdAt,
    }));

    const snapshot=buildSnapshot(preferences);
    const fingerprint=scenarioGenerationFingerprint({versionId:args.versionId,generationVersion,preferenceSnapshot:snapshot});
    const existing=await loadGenerated(txDb,args.versionId,fingerprint);
    if(existing.length) return {created:false,generationFingerprint:fingerprint,items:existing};

    if(preferences.some(row=>row.frozenAt!==null)) throw new ConflictError("PREFERENCE_SET_FROZEN_BY_SCENARIO");

    const generatedAt=new Date();
    const scenarioId=uuid("SCN");
    const anchor=domainPreferences[0];
    const deltas=domainPreferences.map(preference=>({
      fieldId:preference.key,
      controlClass:"O" as const,
      value:preference.value,
    }));
    const validated=generateScenario({
      id:scenarioId,
      profileVersion,
      preference:anchor,
      generationVersion,
      generatedAt,
      deltas,
    });

    await tx.insert(scenario).values({
      scenarioId,
      riskProfileVersionId:args.versionId,
      optimisationPreferenceId:anchor.id,
      generationVersion,
      generatedAt,
      status:"GENERATING",
      preferenceSnapshotJson:snapshot,
      generationFingerprint:fingerprint,
      generationOrdinal:1,
    });

    await tx.insert(scenarioDelta).values(validated.deltas.map(delta=>({
      scenarioDeltaId:uuid("SCD"),
      scenarioId,
      fieldId:delta.fieldId,
      controlClass:"O" as const,
      valueJson:delta.value,
    })));

    if(args.simulateFailureAfterScenario) throw new Error("SIMULATED_SCENARIO_GENERATION_FAILURE");

    await tx.update(optimisationPreference).set({frozenAt:generatedAt})
      .where(eq(optimisationPreference.riskProfileVersionId,args.versionId));

    await tx.update(scenario).set({status:"GENERATED"}).where(eq(scenario.scenarioId,scenarioId));

    const versionRow=(await tx.select({profileId:riskProfileVersion.profileId}).from(riskProfileVersion)
      .where(eq(riskProfileVersion.riskProfileVersionId,args.versionId)).limit(1))[0];

    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"scenario_generated",
      entityType:"scenario",
      entityId:scenarioId,
      traceId:versionRow.profileId,
      metadataJson:{
        versionId:args.versionId,
        generationVersion,
        generationFingerprint:fingerprint,
        preferenceKeys:domainPreferences.map(preference=>preference.key),
        generationOrdinal:1,
      },
    });

    return {created:true,generationFingerprint:fingerprint,items:await loadGenerated(txDb,args.versionId,fingerprint)};
  });
}

export async function listGeneratedScenarios(db:MiqoDatabase,versionId:string) {
  await loadRiskProfileVersion(db,versionId);
  const rows=await db.select({generationFingerprint:scenario.generationFingerprint}).from(scenario)
    .where(and(eq(scenario.riskProfileVersionId,versionId),eq(scenario.status,"GENERATED")))
    .orderBy(asc(scenario.generationOrdinal));
  const fingerprints=[...new Set(rows.map(row=>row.generationFingerprint).filter((value):value is string=>Boolean(value)))];
  const groups=[];
  for(const fingerprint of fingerprints) groups.push(...await loadGenerated(db,versionId,fingerprint));
  return {riskProfileVersionId:versionId,items:groups};
}
