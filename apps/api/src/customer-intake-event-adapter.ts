import type { Pool } from "pg";
import { ConflictError, ValidationError } from "./errors.ts";
import { CONTROLLED_INTAKE_MAILBOX, processCustomerIntakeEmail } from "./customer-intake-service.ts";

export const GMAIL_INTAKE_PROVIDER = "gmail" as const;
export const GMAIL_INTAKE_LABELS = Object.freeze({
  pending:"MIQOS/Intake/Pending",
  processed:"MIQOS/Intake/Processed",
  duplicate:"MIQOS/Intake/Duplicate",
  manualReview:"MIQOS/Intake/Manual Review",
  rejected:"MIQOS/Intake/Rejected",
});

export type GmailIntakeEvent = Readonly<{
  provider:"gmail";
  eventId:string;
  mailbox:string;
  message:Readonly<{
    id:string;
    threadId?:string|null;
    receivedAt?:string|null;
    subject:string;
    body:string;
  }>;
  synthetic:boolean;
}>;

export type GmailIntakeDisposition =
  | "PROCESSED"
  | "DUPLICATE"
  | "MANUAL_REVIEW"
  | "REJECTED";

function normaliseEmail(value:string){return value.trim().toLowerCase();}

export function validateGmailIntakeEvent(event:GmailIntakeEvent){
  const issues:string[]=[];
  if(event.provider!==GMAIL_INTAKE_PROVIDER)issues.push("provider must be gmail");
  if(!event.eventId?.trim())issues.push("eventId is required");
  if(normaliseEmail(event.mailbox)!==CONTROLLED_INTAKE_MAILBOX)issues.push(`mailbox must be ${CONTROLLED_INTAKE_MAILBOX}`);
  if(!event.message?.id?.trim())issues.push("message.id is required");
  if(!event.message?.subject?.trim())issues.push("message.subject is required");
  if(!event.message?.body?.trim())issues.push("message.body is required");
  if(event.message?.receivedAt && Number.isNaN(new Date(event.message.receivedAt).getTime()))issues.push("message.receivedAt is not a valid timestamp");
  if(issues.length)throw new ValidationError("INVALID_GMAIL_INTAKE_EVENT",issues);
  return event;
}

export function gmailDispositionForError(error:unknown):Readonly<{
  disposition:GmailIntakeDisposition;
  gmailLabel:string;
  retryable:boolean;
}>{
  if(error instanceof ConflictError && error.message==="INTAKE_REAL_DATA_GATE_CLOSED")
    return Object.freeze({disposition:"MANUAL_REVIEW",gmailLabel:GMAIL_INTAKE_LABELS.manualReview,retryable:false});
  if(error instanceof ValidationError){
    if(error.message==="INVALID_CUSTOMER_INTAKE_SOURCE" || error.message==="INVALID_GMAIL_INTAKE_EVENT")
      return Object.freeze({disposition:"MANUAL_REVIEW",gmailLabel:GMAIL_INTAKE_LABELS.manualReview,retryable:false});
    return Object.freeze({disposition:"REJECTED",gmailLabel:GMAIL_INTAKE_LABELS.rejected,retryable:false});
  }
  return Object.freeze({disposition:"MANUAL_REVIEW",gmailLabel:GMAIL_INTAKE_LABELS.manualReview,retryable:true});
}

export async function handleGmailIntakeEvent(pool:Pool,event:GmailIntakeEvent){
  validateGmailIntakeEvent(event);
  const result=await processCustomerIntakeEmail(pool,{
    sourceMailbox:event.mailbox,
    sourceMessageId:event.message.id,
    sourceThreadId:event.message.threadId??null,
    receivedAt:event.message.receivedAt??null,
    subject:event.message.subject,
    body:event.message.body,
    synthetic:event.synthetic,
  });
  const disposition:GmailIntakeDisposition=result.deduplicated?"DUPLICATE":"PROCESSED";
  return Object.freeze({
    acknowledged:true,
    eventId:event.eventId,
    disposition,
    gmailLabel:result.deduplicated?GMAIL_INTAKE_LABELS.duplicate:GMAIL_INTAKE_LABELS.processed,
    retryable:false,
    result,
  });
}
