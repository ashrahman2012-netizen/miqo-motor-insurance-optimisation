import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { MiqoDatabase } from "../../../packages/db/src/client.ts";
import { auditEvent, canonicalFieldValue, quoteRequest, quoteRun, rawProviderResponse, riskProfileVersion, scenarioDelta } from "../../../packages/db/src/schema.ts";
import { createProviderRegistry, executeProvider, type ProviderRegistry } from "../../../packages/provider-integration/src/index.ts";
import { mockProviderAdapter } from "../../../packages/mock-providers/src/index.ts";
import { ValidationError } from "./errors.ts";

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;
const defaultRegistry=createProviderRegistry({syntheticOnly:true}).register(mockProviderAdapter);

function present(row:any) {
  return {
    rawProviderResponseId:row.rawProviderResponseId,
    quoteRequestId:row.quoteRequestId,
    providerReference:row.providerReference,
    responseTimestamp:row.providerResponseAt,
    payloadText:row.payloadText,
    payload:row.payloadJson,
    payloadSha256:row.payloadSha256,
    receivedAt:row.receivedAt,
  };
}

export async function executePreparedQuoteRequest(
  db:MiqoDatabase,
  quoteRequestId:string,
  options:{registry?:ProviderRegistry;timeoutMs?:number}={},
) {
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`provider:${quoteRequestId}`}))`);

    const request=(await tx.select().from(quoteRequest)
      .where(eq(quoteRequest.quoteRequestId,quoteRequestId)).limit(1))[0];
    if(!request) throw new ValidationError("QUOTE_REQUEST_NOT_FOUND");

    const existing=(await tx.select().from(rawProviderResponse)
      .where(eq(rawProviderResponse.quoteRequestId,quoteRequestId)).limit(1))[0];
    if(existing) return {created:false,item:present(existing)};

    const run=(await tx.select().from(quoteRun).where(eq(quoteRun.quoteRunId,request.quoteRunId)).limit(1))[0];
    if(!run)throw new ValidationError("QUOTE_RUN_NOT_FOUND");
    const version=(await tx.select().from(riskProfileVersion)
      .where(eq(riskProfileVersion.riskProfileVersionId,run.riskProfileVersionId)).limit(1))[0];
    if(!version)throw new ValidationError("PROFILE_VERSION_NOT_FOUND");

    const [deltas,facts]=await Promise.all([
      tx.select().from(scenarioDelta).where(eq(scenarioDelta.scenarioId,request.scenarioId)),
      tx.select().from(canonicalFieldValue).where(eq(canonicalFieldValue.riskProfileVersionId,run.riskProfileVersionId)),
    ]);

    const result=await executeProvider(options.registry??defaultRegistry,{
      schemaVersion:"1.0",
      quoteRequestId:request.quoteRequestId,
      requestFingerprint:request.requestFingerprint,
      providerKey:request.providerKey,
      channelKey:request.channelKey,
      adapterVersion:request.adapterVersion,
      mappingVersion:request.mappingVersion,
      scenario:{
        scenarioId:request.scenarioId,
        optimisationDeltas:deltas.map(delta=>({fieldId:delta.fieldId,value:delta.valueJson})),
      },
      canonicalInput:Object.freeze(Object.fromEntries(facts.map(fact=>[fact.fieldId,fact.valueJson]))),
    },{timeoutMs:options.timeoutMs});

    if(result.kind!=="RESPONSE"){
      const detail="reasonCode" in result?result.reasonCode:"errorCode" in result?result.errorCode:result.kind;
      throw new ValidationError("PROVIDER_EXECUTION_NOT_RESPONSE",[result.kind,String(detail)]);
    }

    const rawProviderResponseId=uuid("RAW");
    await tx.insert(rawProviderResponse).values({
      rawProviderResponseId,
      quoteRequestId,
      payloadJson:result.rawPayload,
      payloadText:result.rawPayloadText,
      payloadSha256:result.payloadSha256,
      providerReference:result.providerReference,
      providerResponseAt:new Date(result.receivedAt),
    });

    await tx.insert(auditEvent).values({
      auditEventId:uuid("AUD"),
      eventType:"raw_provider_response_captured",
      entityType:"raw_provider_response",
      entityId:rawProviderResponseId,
      traceId:version.profileId,
      metadataJson:{
        quoteRequestId,
        scenarioId:request.scenarioId,
        providerKey:request.providerKey,
        providerReference:result.providerReference,
        payloadSha256:result.payloadSha256,
        providerVersion:result.metadata?.providerVersion??null,
        fixtureKey:result.metadata?.fixtureKey??null,
        adapterVersion:request.adapterVersion,
        mappingVersion:request.mappingVersion,
      },
    });

    const row=(await tx.select().from(rawProviderResponse)
      .where(eq(rawProviderResponse.rawProviderResponseId,rawProviderResponseId)).limit(1))[0];
    return {created:true,item:present(row)};
  });
}

export async function getRawProviderResponse(db:MiqoDatabase,quoteRequestId:string) {
  const row=(await db.select().from(rawProviderResponse)
    .where(eq(rawProviderResponse.quoteRequestId,quoteRequestId)).limit(1))[0];
  if(!row) throw new ValidationError("RAW_PROVIDER_RESPONSE_NOT_FOUND");
  return present(row);
}
