import {createHash,randomUUID} from "node:crypto";
import {and,asc,eq,sql} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  canonicalFieldValue,
  riskProfileVersion,
} from "../../../packages/db/src/schema.ts";
import {
  candidateVehicle,
  marketRoute,
  occupationTaxonomyMapping,
  occupationTaxonomyRule,
} from "../../../packages/db/src/sp4-schema.ts";
import {
  OCCUPATION_TAXONOMY_VERSION,
  mapCanonicalOccupation,
} from "../../../packages/quote-orchestration/src/index.ts";
import {ensureSyntheticMarketRoutes} from "./sprint4-market-route-service.ts";
import {ConflictError,ValidationError} from "./errors.ts";

const uuid=(prefix:string)=>prefix+"-"+randomUUID();

function canonicalise(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonicalise);
  if(value && typeof value==="object"){
    return Object.fromEntries(Object.entries(value as Record<string,unknown>)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([key,item])=>[key,canonicalise(item)]));
  }
  return value;
}

function fingerprint(value:unknown){
  return createHash("sha256").update(JSON.stringify(canonicalise(value))).digest("hex");
}

function stableId(prefix:string,...parts:string[]){
  return prefix+"-"+createHash("sha256").update(parts.join("|")).digest("hex").slice(0,24);
}

async function loadLockedVersion(db:MiqoDatabase,versionId:string){
  const version=(await db.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,versionId)).limit(1))[0];
  if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");
  if(version.status!=="LOCKED")throw new ConflictError("SP4_PROFILE_INTEGRITY_REQUIRES_LOCKED_PROFILE");
  return version;
}

async function loadFact(db:MiqoDatabase,versionId:string,fieldId:string){
  return (await db.select().from(canonicalFieldValue).where(and(
    eq(canonicalFieldValue.riskProfileVersionId,versionId),
    eq(canonicalFieldValue.fieldId,fieldId),
  )).limit(1))[0]??null;
}

function presentOccupation(row:any,route:any){
  return {
    occupationTaxonomyMappingId:row.occupationTaxonomyMappingId,
    riskProfileVersionId:row.riskProfileVersionId,
    marketRouteId:row.marketRouteId,
    routeKey:route.routeKey,
    providerKey:route.providerKey,
    mappingVersion:route.mappingVersion,
    taxonomyVersion:row.taxonomyVersion,
    canonicalOccupation:row.canonicalOccupation,
    providerOccupationCode:row.providerOccupationCode,
    ruleFingerprint:row.ruleFingerprint,
    mappingFingerprint:row.mappingFingerprint,
    createdAt:row.createdAt,
  };
}

export async function persistOccupationTaxonomyMappings(db:MiqoDatabase,versionId:string){
  const version=await loadLockedVersion(db,versionId);
  const occupation=await loadFact(db,versionId,"occupation");
  if(!occupation || occupation.controlClass!=="F" || typeof occupation.valueJson!=="string"){
    throw new ValidationError("CANONICAL_OCCUPATION_FACT_NOT_FOUND");
  }
  const canonicalOccupation=String(occupation.valueJson);

  const routes=(await ensureSyntheticMarketRoutes(db)).items;
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"sp4-occupation:"+versionId}))`);
    const items=[];
    let anyCreated=false;

    for(const route of routes){
      let mapped:any;
      try{
        mapped=mapCanonicalOccupation({
          providerKey:route.providerKey,
          mappingVersion:route.mappingVersion,
          canonicalOccupation,
        });
      }catch{
        throw new ValidationError("OCCUPATION_TAXONOMY_MAPPING_NOT_FOUND");
      }

      const rule=(await tx.select().from(occupationTaxonomyRule).where(and(
        eq(occupationTaxonomyRule.taxonomyVersion,mapped.taxonomyVersion),
        eq(occupationTaxonomyRule.providerKey,mapped.providerKey),
        eq(occupationTaxonomyRule.mappingVersion,mapped.mappingVersion),
        eq(occupationTaxonomyRule.canonicalOccupation,mapped.canonicalOccupation),
      )).limit(1))[0];
      if(!rule
        || rule.providerOccupationCode!==mapped.providerOccupationCode
        || rule.ruleFingerprint!==mapped.ruleFingerprint){
        throw new ConflictError("OCCUPATION_TAXONOMY_RULE_VERSION_MISMATCH");
      }

      const mappingFingerprint=fingerprint({
        riskProfileVersionId:versionId,
        marketRouteId:route.marketRouteId,
        taxonomyVersion:mapped.taxonomyVersion,
        canonicalOccupation:mapped.canonicalOccupation,
        providerOccupationCode:mapped.providerOccupationCode,
        ruleFingerprint:mapped.ruleFingerprint,
      });
      const mappingId=stableId("OTM-SP4",versionId,route.marketRouteId,mappingFingerprint);

      const existing=(await tx.select().from(occupationTaxonomyMapping).where(and(
        eq(occupationTaxonomyMapping.riskProfileVersionId,versionId),
        eq(occupationTaxonomyMapping.marketRouteId,route.marketRouteId),
        eq(occupationTaxonomyMapping.taxonomyVersion,OCCUPATION_TAXONOMY_VERSION),
      )).limit(1))[0];

      if(existing){
        if(existing.mappingFingerprint!==mappingFingerprint)throw new ConflictError("OCCUPATION_MAPPING_VERSION_MISMATCH");
        items.push(presentOccupation(existing,route));
        continue;
      }

      await tx.insert(occupationTaxonomyMapping).values({
        occupationTaxonomyMappingId:mappingId,
        riskProfileVersionId:versionId,
        marketRouteId:route.marketRouteId,
        occupationTaxonomyRuleId:rule.occupationTaxonomyRuleId,
        taxonomyVersion:mapped.taxonomyVersion,
        canonicalOccupation:mapped.canonicalOccupation,
        providerOccupationCode:mapped.providerOccupationCode,
        ruleFingerprint:mapped.ruleFingerprint,
        mappingFingerprint,
      });
      anyCreated=true;

      await tx.insert(auditEvent).values({
        auditEventId:uuid("AUD"),
        eventType:"sp4_occupation_taxonomy_mapped",
        entityType:"occupation_taxonomy_mapping",
        entityId:mappingId,
        traceId:version.profileId,
        metadataJson:{
          riskProfileVersionId:versionId,
          marketRouteId:route.marketRouteId,
          taxonomyVersion:mapped.taxonomyVersion,
          canonicalOccupation:mapped.canonicalOccupation,
          providerOccupationCode:mapped.providerOccupationCode,
          mappingFingerprint,
        },
      });

      const inserted=(await tx.select().from(occupationTaxonomyMapping)
        .where(eq(occupationTaxonomyMapping.occupationTaxonomyMappingId,mappingId)).limit(1))[0];
      items.push(presentOccupation(inserted,route));
    }

    items.sort((a:any,b:any)=>a.routeKey.localeCompare(b.routeKey));
    return {created:anyCreated,items};
  });
}

export async function listOccupationTaxonomyMappings(db:MiqoDatabase,versionId:string){
  await loadLockedVersion(db,versionId);
  const rows=await db.select().from(occupationTaxonomyMapping)
    .where(eq(occupationTaxonomyMapping.riskProfileVersionId,versionId))
    .orderBy(asc(occupationTaxonomyMapping.marketRouteId));
  const items=[];
  for(const row of rows){
    const route=(await db.select().from(marketRoute)
      .where(eq(marketRoute.marketRouteId,row.marketRouteId)).limit(1))[0];
    items.push(presentOccupation(row,route));
  }
  items.sort((a:any,b:any)=>a.routeKey.localeCompare(b.routeKey));
  return {items};
}

export async function registerCandidateVehicle(db:MiqoDatabase,args:{
  versionId:string;
  candidateVehicleId:string;
  vehicleSnapshot:Record<string,unknown>;
}){
  const version=await loadLockedVersion(db,args.versionId);
  if(!args.candidateVehicleId?.trim())throw new ValidationError("INVALID_CANDIDATE_VEHICLE_ID");
  if(!args.vehicleSnapshot || Array.isArray(args.vehicleSnapshot) || typeof args.vehicleSnapshot!=="object"){
    throw new ValidationError("INVALID_CANDIDATE_VEHICLE_SNAPSHOT");
  }

  const mode=await loadFact(db,args.versionId,"vehicle_mode");
  if(!mode || mode.controlClass!=="F" || mode.valueJson!=="PRE_PURCHASE"){
    throw new ConflictError("CANDIDATE_VEHICLE_REQUIRES_PRE_PURCHASE");
  }
  const current=await loadFact(db,args.versionId,"vehicle_id");
  if(current?.controlClass==="F" && current.valueJson===args.candidateVehicleId){
    throw new ConflictError("CURRENT_VEHICLE_CANNOT_BE_CANDIDATE");
  }

  const evidenceFingerprint=fingerprint({
    riskProfileVersionId:args.versionId,
    candidateVehicleId:args.candidateVehicleId,
    vehicleSnapshot:args.vehicleSnapshot,
  });
  const evidenceId=stableId("CVE-SP4",args.versionId,args.candidateVehicleId,evidenceFingerprint);

  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"sp4-candidate-vehicle:"+args.versionId+":"+args.candidateVehicleId}))`);
    const existing=(await tx.select().from(candidateVehicle).where(and(
      eq(candidateVehicle.riskProfileVersionId,args.versionId),
      eq(candidateVehicle.candidateVehicleId,args.candidateVehicleId),
    )).limit(1))[0];
    if(existing){
      if(existing.evidenceFingerprint!==evidenceFingerprint)throw new ConflictError("CANDIDATE_VEHICLE_EVIDENCE_MISMATCH");
      return {created:false,item:existing};
    }

    await tx.insert(candidateVehicle).values({
      candidateVehicleEvidenceId:evidenceId,
      riskProfileVersionId:args.versionId,
      candidateVehicleId:args.candidateVehicleId,
      vehicleSnapshotJson:canonicalise(args.vehicleSnapshot),
      evidenceFingerprint,
    });

    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"sp4_candidate_vehicle_registered",
      entityType:"candidate_vehicle",
      entityId:evidenceId,
      traceId:version.profileId,
      metadataJson:{
        riskProfileVersionId:args.versionId,
        candidateVehicleId:args.candidateVehicleId,
        evidenceFingerprint,
      },
    });

    const item=(await tx.select().from(candidateVehicle)
      .where(eq(candidateVehicle.candidateVehicleEvidenceId,evidenceId)).limit(1))[0];
    return {created:true,item};
  });
}

export async function listCandidateVehicles(db:MiqoDatabase,versionId:string){
  await loadLockedVersion(db,versionId);
  const items=await db.select().from(candidateVehicle)
    .where(eq(candidateVehicle.riskProfileVersionId,versionId))
    .orderBy(asc(candidateVehicle.candidateVehicleId));
  return {items};
}
