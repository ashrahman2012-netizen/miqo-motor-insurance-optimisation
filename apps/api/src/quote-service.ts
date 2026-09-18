import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { MiqoDatabase } from "../../../packages/db/src/client.ts";
import {
  auditEvent,
  canonicalFieldValue,
  discrepancy,
  integritySignal,
  quoteRequest,
  quoteRun,
  riskProfileVersion,
  scenario,
  scenarioDelta,
} from "../../../packages/db/src/schema.ts";
import { OPTIMISATION_PREFERENCE_KEYS } from "../../../packages/scenarios/src/model.ts";
import { PreQuoteIntegrityError, ValidationError } from "./errors.ts";

export const SYNTHETIC_PROVIDER_KEY = "MOCK-PROVIDER-001";
export const SYNTHETIC_CHANNEL = "DIRECT_SYNTHETIC";
export const QUOTE_ADAPTER_VERSION = "mock-adapter-v1";
export const QUOTE_MAPPING_VERSION = "mock-mapping-v1";

const REQUIRED_QUOTE_FACTS = ["main_driver_id","annual_mileage","licence_held_since"] as const;
const approvedOptimisationFields=new Set<string>(OPTIMISATION_PREFERENCE_KEYS);
const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

export type PreQuoteRuleId =
  | "PROFILE_NOT_LOCKED"
  | "UNRESOLVED_DISCREPANCY"
  | "SCENARIO_CONTAINS_NON_O_DELTA"
  | "PROFILE_VERSION_SUPERSEDED"
  | "MISSING_REQUIRED_QUOTE_INPUT";

export type PreQuoteSignal = Readonly<{
  ruleId: PreQuoteRuleId;
  evidence: Readonly<Record<string,unknown>>;
}>;

function requestFingerprint(args:{
  riskProfileVersionId:string;
  scenarioId:string;
  providerKey:string;
  channel:string;
  adapterVersion:string;
  mappingVersion:string;
}) {
  return createHash("sha256").update(JSON.stringify(args)).digest("hex");
}

async function evaluatePreQuoteIntegrity(tx:any,scenarioId:string) {
  const scenarioRow=(await tx.select().from(scenario).where(eq(scenario.scenarioId,scenarioId)).limit(1))[0];
  if(!scenarioRow) throw new ValidationError("SCENARIO_NOT_FOUND");

  await tx.execute(sql`SELECT risk_profile_version_id FROM scenario WHERE scenario_id=${scenarioId} FOR SHARE`);
  await tx.execute(sql`SELECT risk_profile_version_id FROM risk_profile_version WHERE risk_profile_version_id=${scenarioRow.riskProfileVersionId} FOR SHARE`);

  const profileRow=(await tx.select().from(riskProfileVersion)
    .where(eq(riskProfileVersion.riskProfileVersionId,scenarioRow.riskProfileVersionId)).limit(1))[0];
  if(!profileRow) throw new ValidationError("PROFILE_VERSION_NOT_FOUND");

  const signals:PreQuoteSignal[]=[];

  if(profileRow.status==="SUPERSEDED") {
    signals.push({ruleId:"PROFILE_VERSION_SUPERSEDED",evidence:{riskProfileVersionId:profileRow.riskProfileVersionId}});
  } else if(profileRow.status!=="LOCKED") {
    signals.push({ruleId:"PROFILE_NOT_LOCKED",evidence:{riskProfileVersionId:profileRow.riskProfileVersionId,status:profileRow.status}});
  }

  const unresolved=await tx.select().from(discrepancy).where(and(
    eq(discrepancy.riskProfileVersionId,profileRow.riskProfileVersionId),
    eq(discrepancy.blocking,true),
  )).orderBy(asc(discrepancy.createdAt));
  if(unresolved.length) {
    signals.push({
      ruleId:"UNRESOLVED_DISCREPANCY",
      evidence:{discrepancyIds:unresolved.map((item:any)=>item.discrepancyId),states:unresolved.map((item:any)=>item.state)},
    });
  }

  const deltas=await tx.select().from(scenarioDelta).where(eq(scenarioDelta.scenarioId,scenarioId));
  const invalidDeltas=deltas.filter((delta:any)=>delta.controlClass!=="O" || !approvedOptimisationFields.has(delta.fieldId));
  if(invalidDeltas.length) {
    signals.push({
      ruleId:"SCENARIO_CONTAINS_NON_O_DELTA",
      evidence:{fieldIds:invalidDeltas.map((delta:any)=>delta.fieldId)},
    });
  }

  const facts=await tx.select().from(canonicalFieldValue)
    .where(eq(canonicalFieldValue.riskProfileVersionId,profileRow.riskProfileVersionId));
  const present=new Set(facts.filter((fact:any)=>fact.valueJson!==null).map((fact:any)=>fact.fieldId));
  const missingFacts=REQUIRED_QUOTE_FACTS.filter(fieldId=>!present.has(fieldId));
  if(scenarioRow.status!=="GENERATED" || missingFacts.length) {
    signals.push({
      ruleId:"MISSING_REQUIRED_QUOTE_INPUT",
      evidence:{scenarioStatus:scenarioRow.status,missingFacts},
    });
  }

  return {scenarioRow,profileRow,signals};
}

export async function prepareQuoteRequest(db:MiqoDatabase,args:{
  scenarioId:string;
  providerKey:string;
  channel:string;
}) {
  if(args.providerKey!==SYNTHETIC_PROVIDER_KEY || args.channel!==SYNTHETIC_CHANNEL) {
    throw new ValidationError("INVALID_QUOTE_REQUEST",[
      "Only MOCK-PROVIDER-001 via DIRECT_SYNTHETIC is permitted in the Sprint 2 synthetic boundary",
    ]);
  }

  const result=await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`quote:${args.scenarioId}:${args.providerKey}:${args.channel}`}))`);
    const evaluated=await evaluatePreQuoteIntegrity(tx,args.scenarioId);
    const {scenarioRow,profileRow,signals}=evaluated;

    if(signals.length) {
      await tx.insert(integritySignal).values(signals.map(signal=>({
        integritySignalId:uuid("INT"),
        stage:"PRE_QUOTE",
        ruleId:signal.ruleId,
        riskProfileVersionId:profileRow.riskProfileVersionId,
        scenarioId:scenarioRow.scenarioId,
        state:"BLOCKING",
        blocking:true,
        evidenceJson:signal.evidence,
      })));
      await tx.insert(auditEvent).values({
        auditEventId:uuid("AUD"),
        eventType:"pre_quote_integrity_blocked",
        entityType:"scenario",
        entityId:scenarioRow.scenarioId,
        traceId:profileRow.profileId,
        metadataJson:{ruleIds:signals.map(signal=>signal.ruleId)},
      });
      return {blocked:true as const,signals};
    }

    const fingerprint=requestFingerprint({
      riskProfileVersionId:profileRow.riskProfileVersionId,
      scenarioId:scenarioRow.scenarioId,
      providerKey:args.providerKey,
      channel:args.channel,
      adapterVersion:QUOTE_ADAPTER_VERSION,
      mappingVersion:QUOTE_MAPPING_VERSION,
    });

    const existing=(await tx.select().from(quoteRequest)
      .where(eq(quoteRequest.requestFingerprint,fingerprint)).limit(1))[0];
    if(existing) {
      return {
        blocked:false as const,
        created:false,
        quoteRunId:existing.quoteRunId,
        quoteRequestId:existing.quoteRequestId,
        riskProfileVersionId:profileRow.riskProfileVersionId,
        scenarioId:existing.scenarioId,
        providerKey:existing.providerKey,
        channel:existing.channelKey,
        adapterVersion:existing.adapterVersion,
        mappingVersion:existing.mappingVersion,
        requestFingerprint:existing.requestFingerprint,
      };
    }

    const quoteRunId=uuid("QRUN");
    const quoteRequestId=uuid("QREQ");
    await tx.insert(quoteRun).values({
      quoteRunId,
      riskProfileVersionId:profileRow.riskProfileVersionId,
    });
    await tx.insert(quoteRequest).values({
      quoteRequestId,
      quoteRunId,
      scenarioId:scenarioRow.scenarioId,
      providerKey:args.providerKey,
      channelKey:args.channel,
      adapterVersion:QUOTE_ADAPTER_VERSION,
      mappingVersion:QUOTE_MAPPING_VERSION,
      requestFingerprint:fingerprint,
    });
    await tx.insert(auditEvent).values([
      {
        auditEventId:uuid("AUD"),
        eventType:"pre_quote_integrity_passed",
        entityType:"scenario",
        entityId:scenarioRow.scenarioId,
        traceId:profileRow.profileId,
        metadataJson:{riskProfileVersionId:profileRow.riskProfileVersionId},
      },
      {
        auditEventId:uuid("AUD"),
        eventType:"quote_request_prepared",
        entityType:"quote_request",
        entityId:quoteRequestId,
        traceId:profileRow.profileId,
        metadataJson:{
          quoteRunId,
          scenarioId:scenarioRow.scenarioId,
          providerKey:args.providerKey,
          channel:args.channel,
          adapterVersion:QUOTE_ADAPTER_VERSION,
          mappingVersion:QUOTE_MAPPING_VERSION,
        },
      },
    ]);

    return {
      blocked:false as const,
      created:true,
      quoteRunId,
      quoteRequestId,
      riskProfileVersionId:profileRow.riskProfileVersionId,
      scenarioId:scenarioRow.scenarioId,
      providerKey:args.providerKey,
      channel:args.channel,
      adapterVersion:QUOTE_ADAPTER_VERSION,
      mappingVersion:QUOTE_MAPPING_VERSION,
      requestFingerprint:fingerprint,
    };
  });

  if(result.blocked) throw new PreQuoteIntegrityError(result.signals);
  return result;
}

export async function getPreparedQuoteRequest(db:MiqoDatabase,quoteRequestId:string) {
  const request=(await db.select().from(quoteRequest)
    .where(eq(quoteRequest.quoteRequestId,quoteRequestId)).limit(1))[0];
  if(!request) throw new ValidationError("QUOTE_REQUEST_NOT_FOUND");
  const run=(await db.select().from(quoteRun).where(eq(quoteRun.quoteRunId,request.quoteRunId)).limit(1))[0];
  return {
    quoteRunId:request.quoteRunId,
    quoteRequestId:request.quoteRequestId,
    riskProfileVersionId:run.riskProfileVersionId,
    scenarioId:request.scenarioId,
    providerKey:request.providerKey,
    channel:request.channelKey,
    adapterVersion:request.adapterVersion,
    mappingVersion:request.mappingVersion,
    requestFingerprint:request.requestFingerprint,
    createdAt:request.createdAt,
  };
}

export async function listPreQuoteIntegritySignals(db:MiqoDatabase,scenarioId:string) {
  return db.select().from(integritySignal).where(and(
    eq(integritySignal.scenarioId,scenarioId),
    eq(integritySignal.stage,"PRE_QUOTE"),
  )).orderBy(asc(integritySignal.createdAt));
}
