import {randomUUID} from "node:crypto";
import {and,asc,eq} from "drizzle-orm";
import type {MiqoDatabase} from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  customerObjective,
  optimisationCatalogueVersion,
  riskProfileVersion,
} from "../../../packages/db/src/schema.ts";
import {
  CUSTOMER_OBJECTIVE_MODEL_VERSION,
  OPTIMISATION_CATALOGUE_VERSION,
  assertExecutableCustomerObjective,
  customerObjectiveModel,
  optimisationCatalogue,
  optimisationPolicyFingerprint,
} from "../../../packages/optimisation/src/index.ts";
import {ConflictError,ValidationError} from "./errors.ts";

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

function presentObjective(row:any){
  return {
    customerObjectiveId:row.customerObjectiveId,
    riskProfileVersionId:row.riskProfileVersionId,
    objectiveId:row.objectiveId,
    objectiveVersion:row.objectiveVersion,
    catalogueVersion:row.catalogueVersion,
    policyFingerprint:row.policyFingerprint,
    selectedAt:row.selectedAt,
  };
}

async function ensureCatalogue(tx:any,args:{traceId:string}){
  const fingerprint=optimisationPolicyFingerprint();
  const existing=(await tx.select().from(optimisationCatalogueVersion)
    .where(eq(optimisationCatalogueVersion.catalogueVersion,OPTIMISATION_CATALOGUE_VERSION))
    .limit(1))[0];

  if(existing){
    if(existing.objectiveModelVersion!==CUSTOMER_OBJECTIVE_MODEL_VERSION
      || existing.policyFingerprint!==fingerprint){
      throw new ConflictError("OPTIMISATION_POLICY_VERSION_MISMATCH");
    }
    return {row:existing,created:false};
  }

  const catalogue=optimisationCatalogue();
  const objectives=customerObjectiveModel();
  await tx.insert(optimisationCatalogueVersion).values({
    catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
    objectiveModelVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
    policyFingerprint:fingerprint,
    catalogueSnapshotJson:catalogue,
    objectiveModelSnapshotJson:objectives,
  });

  await tx.insert(auditEvent).values({
    auditEventId:uuid("AUD"),
    eventType:"optimisation_catalogue_registered",
    entityType:"optimisation_catalogue_version",
    entityId:OPTIMISATION_CATALOGUE_VERSION,
    traceId:args.traceId,
    metadataJson:{
      objectiveModelVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
      policyFingerprint:fingerprint,
    },
  });

  return {
    row:{
      catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
      objectiveModelVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
      policyFingerprint:fingerprint,
      catalogueSnapshotJson:catalogue,
      objectiveModelSnapshotJson:objectives,
    },
    created:true,
  };
}

export async function persistCustomerObjective(db:MiqoDatabase,args:{
  versionId:string;
  objectiveId:string;
}){
  let objective;
  try{
    objective=assertExecutableCustomerObjective(args.objectiveId);
  }catch(error:any){
    throw new ValidationError(String(error?.message??error));
  }

  return db.transaction(async tx=>{
    const version=(await tx.select().from(riskProfileVersion)
      .where(eq(riskProfileVersion.riskProfileVersionId,args.versionId)).limit(1))[0];
    if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");
    if(version.status!=="LOCKED")throw new ConflictError("CUSTOMER_OBJECTIVE_REQUIRES_LOCKED_PROFILE");

    const catalogue=await ensureCatalogue(tx,{traceId:version.profileId});
    const fingerprint=catalogue.row.policyFingerprint;

    const existing=(await tx.select().from(customerObjective).where(and(
      eq(customerObjective.riskProfileVersionId,args.versionId),
      eq(customerObjective.objectiveId,objective.objectiveId),
      eq(customerObjective.policyFingerprint,fingerprint),
    )).limit(1))[0];

    if(existing){
      return {created:false,item:presentObjective(existing)};
    }

    const customerObjectiveId=uuid("OBJ");
    await tx.insert(customerObjective).values({
      customerObjectiveId,
      riskProfileVersionId:args.versionId,
      objectiveId:objective.objectiveId,
      objectiveVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
      catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
      policyFingerprint:fingerprint,
    });

    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"customer_objective_selected",
      entityType:"customer_objective",
      entityId:customerObjectiveId,
      traceId:version.profileId,
      metadataJson:{
        riskProfileVersionId:args.versionId,
        objectiveId:objective.objectiveId,
        objectiveVersion:CUSTOMER_OBJECTIVE_MODEL_VERSION,
        catalogueVersion:OPTIMISATION_CATALOGUE_VERSION,
        policyFingerprint:fingerprint,
      },
    });

    const row=(await tx.select().from(customerObjective)
      .where(eq(customerObjective.customerObjectiveId,customerObjectiveId)).limit(1))[0];
    return {created:true,item:presentObjective(row)};
  });
}

export async function listCustomerObjectives(db:MiqoDatabase,versionId:string){
  const version=(await db.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,versionId)).limit(1))[0];
  if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");

  const rows=await db.select().from(customerObjective)
    .where(eq(customerObjective.riskProfileVersionId,versionId))
    .orderBy(asc(customerObjective.selectedAt),asc(customerObjective.customerObjectiveId));
  return {items:rows.map(presentObjective)};
}

export async function getPersistedOptimisationCatalogue(db:MiqoDatabase,catalogueVersion:string){
  const row=(await db.select().from(optimisationCatalogueVersion)
    .where(eq(optimisationCatalogueVersion.catalogueVersion,catalogueVersion)).limit(1))[0];
  if(!row)throw new ValidationError("OPTIMISATION_CATALOGUE_VERSION_NOT_FOUND");
  return {
    catalogueVersion:row.catalogueVersion,
    objectiveModelVersion:row.objectiveModelVersion,
    policyFingerprint:row.policyFingerprint,
    catalogue:row.catalogueSnapshotJson,
    objectiveModel:row.objectiveModelSnapshotJson,
    createdAt:row.createdAt,
  };
}
