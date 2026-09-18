import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { MiqoDatabase } from "../../../packages/db/src/client.ts";
import { auditEvent, quoteRequest, quoteRun, rawProviderResponse, riskProfileVersion, scenarioDelta } from "../../../packages/db/src/schema.ts";
import { executeMockProvider, MOCK_PROVIDER_KEY } from "../../../packages/mock-providers/src/index.ts";
import { ValidationError } from "./errors.ts";

const uuid=(prefix:string)=>`${prefix}-${randomUUID()}`;

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

export async function executePreparedQuoteRequest(db:MiqoDatabase,quoteRequestId:string) {
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`provider:${quoteRequestId}`}))`);

    const request=(await tx.select().from(quoteRequest)
      .where(eq(quoteRequest.quoteRequestId,quoteRequestId)).limit(1))[0];
    if(!request) throw new ValidationError("QUOTE_REQUEST_NOT_FOUND");
    if(request.providerKey!==MOCK_PROVIDER_KEY) throw new ValidationError("UNSUPPORTED_PROVIDER");

    const existing=(await tx.select().from(rawProviderResponse)
      .where(eq(rawProviderResponse.quoteRequestId,quoteRequestId)).limit(1))[0];
    if(existing) return {created:false,item:present(existing)};

    const deltas=await tx.select().from(scenarioDelta)
      .where(eq(scenarioDelta.scenarioId,request.scenarioId));
    const response=executeMockProvider({
      requestFingerprint:request.requestFingerprint,
      scenarioId:request.scenarioId,
      deltas:deltas.map(delta=>({fieldId:delta.fieldId,value:delta.valueJson})),
      fixtureKey:"STANDARD",
    });

    const rawProviderResponseId=uuid("RAW");
    await tx.insert(rawProviderResponse).values({
      rawProviderResponseId,
      quoteRequestId,
      payloadJson:response.payload,
      payloadText:response.payloadText,
      payloadSha256:response.payloadSha256,
      providerReference:response.providerReference,
      providerResponseAt:new Date(response.responseTimestamp),
    });

    const run=(await tx.select().from(quoteRun).where(eq(quoteRun.quoteRunId,request.quoteRunId)).limit(1))[0];
    const version=(await tx.select().from(riskProfileVersion)
      .where(eq(riskProfileVersion.riskProfileVersionId,run.riskProfileVersionId)).limit(1))[0];

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
        providerReference:response.providerReference,
        payloadSha256:response.payloadSha256,
        providerVersion:response.providerVersion,
        fixtureKey:response.fixtureKey,
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
