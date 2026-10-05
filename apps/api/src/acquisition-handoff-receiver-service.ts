import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { ConflictError, ValidationError } from "./errors.ts";

export const LG_G7_HANDOFF_CONTRACT_VERSION="lg-g7-handoff.v1";
export const LG_G7_HANDOFF_RESPONSE_VERSION="lg-g7-handoff-response.v1";

export type LgG7HandoffRequest=Readonly<{
  contractVersion:string;
  handoffId:string;
  acceptedClientId:string;
  acceptanceEventId:string;
  acceptedAt:string;
  acquisitionLeadId:string;
  campaignId:string;
  source:string;
  permissionBasis:"CONSENT"|"SOFT_OPT_IN"|"CORPORATE_B2B"|"TEST_SYNTHETIC"|"UNVERIFIED_DO_NOT_SEND";
  lifecycleState:"ACCEPTED_CLIENT";
  contactPreference?:string;
}>;

export type LgG7HandoffResponse=Readonly<{
  contractVersion:"lg-g7-handoff-response.v1";
  handoffId:string;
  outcome:"ACCEPTED";
  receivedAt:string;
  auditReference:string;
  receiverReference:string;
}>;

function nonEmpty(value:string,label:string){
  if(!value.trim())throw new ValidationError("INVALID_LG_G7_HANDOFF",[`${label} must not be empty`]);
}

function canonicalRequest(request:LgG7HandoffRequest){
  return {
    contractVersion:request.contractVersion,
    handoffId:request.handoffId,
    acceptedClientId:request.acceptedClientId,
    acceptanceEventId:request.acceptanceEventId,
    acceptedAt:request.acceptedAt,
    acquisitionLeadId:request.acquisitionLeadId,
    campaignId:request.campaignId,
    source:request.source,
    permissionBasis:request.permissionBasis,
    lifecycleState:request.lifecycleState,
    ...(request.contactPreference===undefined?{}:{contactPreference:request.contactPreference}),
  };
}

export function lgG7HandoffFingerprint(request:LgG7HandoffRequest){
  return createHash("sha256").update(JSON.stringify(canonicalRequest(request))).digest("hex");
}

function validateReceiverRequest(request:LgG7HandoffRequest){
  if(request.contractVersion!==LG_G7_HANDOFF_CONTRACT_VERSION)
    throw new ValidationError("INVALID_LG_G7_HANDOFF",["Unsupported contractVersion"]);
  if(request.lifecycleState!=="ACCEPTED_CLIENT")
    throw new ValidationError("INVALID_LG_G7_HANDOFF",["lifecycleState must be ACCEPTED_CLIENT"]);

  for(const [label,value] of [
    ["handoffId",request.handoffId],
    ["acceptedClientId",request.acceptedClientId],
    ["acceptanceEventId",request.acceptanceEventId],
    ["acquisitionLeadId",request.acquisitionLeadId],
    ["campaignId",request.campaignId],
    ["source",request.source],
  ] as const)nonEmpty(value,label);

  if(request.contactPreference!==undefined)nonEmpty(request.contactPreference,"contactPreference");

  const acceptedAt=new Date(request.acceptedAt);
  if(Number.isNaN(acceptedAt.getTime()))
    throw new ValidationError("INVALID_LG_G7_HANDOFF",["acceptedAt must be a valid date-time"]);

  if(request.permissionBasis!=="TEST_SYNTHETIC")
    throw new ConflictError("HANDOFF_REAL_DATA_GATE_CLOSED");
}

function rowResponse(row:any):LgG7HandoffResponse{
  return Object.freeze({
    contractVersion:LG_G7_HANDOFF_RESPONSE_VERSION,
    handoffId:String(row.handoff_id),
    outcome:"ACCEPTED",
    receivedAt:new Date(row.received_at).toISOString(),
    auditReference:String(row.audit_reference),
    receiverReference:String(row.receiver_reference),
  });
}

export async function receiveSyntheticAcquisitionHandoff(
  pool:Pool,
  request:LgG7HandoffRequest,
  now:()=>Date=()=>new Date(),
){
  validateReceiverRequest(request);
  const fingerprint=lgG7HandoffFingerprint(request);
  const receivedAt=now();
  if(Number.isNaN(receivedAt.getTime()))
    throw new ValidationError("INVALID_LG_G7_HANDOFF",["receiver time is invalid"]);

  const client=await pool.connect();
  try{
    await client.query("BEGIN");

    const existing=await client.query(
      `SELECT handoff_id,request_fingerprint,outcome,receiver_reference,audit_reference,received_at
         FROM acquisition_handoff_receipt
        WHERE handoff_id=$1
        FOR UPDATE`,
      [request.handoffId]
    );

    if(existing.rowCount){
      const row=existing.rows[0];
      if(row.request_fingerprint!==fingerprint)
        throw new ConflictError("HANDOFF_IDEMPOTENCY_CONFLICT");
      await client.query("COMMIT");
      return {response:rowResponse(row),idempotentReplay:true};
    }

    const receiverReference=`MIQOS-RCV-SYN-${randomUUID()}`;
    const auditReference=`MIQOS-AUD-SYN-${randomUUID()}`;
    const canonical=canonicalRequest(request);

    const inserted=await client.query(
      `INSERT INTO acquisition_handoff_receipt(
         handoff_id,contract_version,accepted_client_id,acceptance_event_id,accepted_at,
         acquisition_lead_id,campaign_id,source,permission_basis,lifecycle_state,
         contact_preference,request_fingerprint,request_json,outcome,
         receiver_reference,audit_reference,received_at,synthetic
       ) VALUES(
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,'ACCEPTED',$14,$15,$16,true
       )
       RETURNING handoff_id,request_fingerprint,outcome,receiver_reference,audit_reference,received_at`,
      [
        request.handoffId,
        request.contractVersion,
        request.acceptedClientId,
        request.acceptanceEventId,
        request.acceptedAt,
        request.acquisitionLeadId,
        request.campaignId,
        request.source,
        request.permissionBasis,
        request.lifecycleState,
        request.contactPreference??null,
        fingerprint,
        JSON.stringify(canonical),
        receiverReference,
        auditReference,
        receivedAt,
      ]
    );

    await client.query("COMMIT");
    return {response:rowResponse(inserted.rows[0]),idempotentReplay:false};
  }catch(error:any){
    await client.query("ROLLBACK");

    if(error?.code==="23505"){
      const raced=await pool.query(
        `SELECT handoff_id,request_fingerprint,outcome,receiver_reference,audit_reference,received_at
           FROM acquisition_handoff_receipt
          WHERE handoff_id=$1`,
        [request.handoffId]
      );
      if(raced.rowCount){
        const row=raced.rows[0];
        if(row.request_fingerprint===fingerprint)
          return {response:rowResponse(row),idempotentReplay:true};
        throw new ConflictError("HANDOFF_IDEMPOTENCY_CONFLICT");
      }
    }

    throw error;
  }finally{
    client.release();
  }
}
