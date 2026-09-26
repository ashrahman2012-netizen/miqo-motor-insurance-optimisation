import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { ConflictError, ValidationError } from "./errors.ts";
import { deriveCustomerIntakeStatus, intakeDedupeKey, type ParsedCustomerIntake } from "./customer-intake-service.ts";
import { renderHtmlToPdf } from "./html-pdf-renderer.ts";
import { sendGmailWithAttachments } from "./gmail-delivery-adapter.ts";

export const DIRECT_FORM_VERSION="CIRF-1.2.2";
export const DIRECT_FORM_SCHEMA_VERSION="miqos.customer-information-request.v1";
export const DIRECT_FORM_SOURCE="PUBLIC_CUSTOMER_INFORMATION_REQUEST";

export type DirectFormSubmissionRequest=Readonly<{
  idempotencyKey:string;
  payload:unknown;
  html:Buffer;
  excel:Buffer;
  subject:string;
  formVersion:string;
  renderPdf:boolean;
}>;

export class FormDeliveryError extends Error {
  readonly phase:"PDF_RENDER"|"EMAIL_DELIVERY";
  constructor(phase:"PDF_RENDER"|"EMAIL_DELIVERY"){super(`FORM_${phase}_FAILED`);this.phase=phase;}
}

export type FormSubmissionDependencies=Readonly<{
  renderPdf?:(html:Buffer)=>Promise<Buffer>;
  sendEmail?:(input:{subject:string;textBody:string;attachments:readonly {filename:string;contentType:string;data:Buffer}[]})=>Promise<{provider:string;messageId:string;recipient:string}>;
}>;

function text(value:unknown,label:string,max=2000){
  if(typeof value!=="string"||!value.trim())throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} is required`]);
  const output=value.trim();
  if(output.length>max)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} is too long`]);
  return output;
}
function nullableText(value:unknown,label:string,max=2000){
  if(value===null||value===undefined||value==="")return null;
  if(typeof value!=="string")throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} must be text or null`]);
  const output=value.trim();
  if(output.length>max)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} is too long`]);
  return output||null;
}
function bool(value:unknown,label:string){if(typeof value!=="boolean")throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} must be boolean`]);return value;}
function money(value:unknown,label:string){
  if(value===null||value===undefined||value==="")return null;
  if(typeof value!=="number"||!Number.isFinite(value)||value<0)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} must be a non-negative number or null`]);
  return value;
}
function isoDate(value:unknown,label:string,required=true){
  if((value===null||value===undefined||value==="")&&!required)return null;
  const output=text(value,label,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(output)||Number.isNaN(Date.parse(`${output}T00:00:00Z`)))throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} must use YYYY-MM-DD`]);
  return output;
}
function record(value:unknown,label:string){if(!value||typeof value!=="object"||Array.isArray(value))throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${label} must be an object`]);return value as Record<string,unknown>;}
function hash(data:Buffer|string){return createHash("sha256").update(data).digest("hex");}
function id(prefix:string){return `${prefix}-${randomUUID()}`;}
function normaliseMobile(value:string){const digits=value.replace(/\D/g,"");return digits.startsWith("447")?`0${digits.slice(2)}`:digits;}
function normaliseReg(value:string){return value.replace(/[^A-Z0-9]/gi,"").toUpperCase();}

export function validateDirectFormPayload(input:unknown):ParsedCustomerIntake{
  const root=record(input,"payload");
  if(root.schemaVersion!==DIRECT_FORM_SCHEMA_VERSION)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`Unsupported schemaVersion: ${String(root.schemaVersion??"")}`]);
  if(root.formVersion!==DIRECT_FORM_VERSION)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`Unsupported formVersion: ${String(root.formVersion??"")}`]);
  if(root.source!==DIRECT_FORM_SOURCE)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`source must be ${DIRECT_FORM_SOURCE}`]);
  const clientSubmissionId=text(root.clientSubmissionId,"clientSubmissionId",200);
  const customer=record(root.customer,"customer");
  const motor=record(root.motor,"motor");
  const insurance=record(root.insurance,"insurance");
  const quotation=record(root.recentQuotation,"recentQuotation");
  const acknowledgements=record(root.acknowledgements,"acknowledgements");

  const fullName=text(customer.fullName,"customer.fullName",200).replace(/\s+/g," ");
  const email=text(customer.email,"customer.email",320).toLowerCase();
  const mobile=text(customer.mobile,"customer.mobile",40);
  const address=text(customer.address,"customer.address",500).replace(/\s+/g," ");
  const city=text(customer.city,"customer.city",200).replace(/\s+/g," ");
  const postcode=text(customer.postcode,"customer.postcode",20).toUpperCase();
  const registration=normaliseReg(text(motor.registration,"motor.registration",20));
  const drivingLicenceType=text(motor.drivingLicenceType,"motor.drivingLicenceType",100);
  const existing=bool(insurance.existingInsurancePolicy,"insurance.existingInsurancePolicy");
  const recentSupplied=bool(quotation.supplied,"recentQuotation.supplied");
  const renewal=isoDate(root.renewalOrFutureStartDate,"renewalOrFutureStartDate",true)!;
  const authorised=bool(root.authorisedToContact,"authorisedToContact");
  const privacy=bool(acknowledgements.privacyNoticeAcknowledged,"acknowledgements.privacyNoticeAcknowledged");
  const serviceContact=bool(acknowledgements.serviceContactAuthorised,"acknowledgements.serviceContactAuthorised");
  const privacyVersion=text(acknowledgements.privacyNoticeVersion,"acknowledgements.privacyNoticeVersion",100);

  const issues:string[]=[];
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))issues.push("customer.email is not valid");
  if(!/^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i.test(postcode))issues.push("customer.postcode is not a valid UK postcode format");
  if(!/^07\d{9}$/.test(normaliseMobile(mobile)))issues.push("customer.mobile is not a valid UK mobile number");
  if(!registration||registration.length>10)issues.push("motor.registration is not valid");
  if(!privacy)issues.push("privacy acknowledgement is required");
  if(!authorised||!serviceContact)issues.push("service contact authorisation is required");

  const policyType=existing?nullableText(insurance.policyType,"insurance.policyType",100):null;
  const policyCover=existing?nullableText(insurance.policyCover,"insurance.policyCover",100):null;
  const policyStartDate=existing?isoDate(insurance.policyStartDate,"insurance.policyStartDate",false):null;
  const policyEndDate=existing?isoDate(insurance.policyEndDate,"insurance.policyEndDate",false):null;
  const currentInsurer=existing?nullableText(insurance.currentInsurer,"insurance.currentInsurer",200):null;
  if(existing){
    if(!policyType)issues.push("insurance.policyType is required for an existing policy");
    if(!policyCover)issues.push("insurance.policyCover is required for an existing policy");
    if(!policyStartDate)issues.push("insurance.policyStartDate is required for an existing policy");
    if(!policyEndDate)issues.push("insurance.policyEndDate is required for an existing policy");
    if(!currentInsurer)issues.push("insurance.currentInsurer is required for an existing policy");
    if(policyStartDate&&policyEndDate&&policyEndDate<policyStartDate)issues.push("insurance.policyEndDate must not be before policyStartDate");
  }

  const quotationDate=recentSupplied?isoDate(quotation.quotationDate,"recentQuotation.quotationDate",false):null;
  const quotationAmount=recentSupplied?money(quotation.quotationAmount,"recentQuotation.quotationAmount"):null;
  if(recentSupplied&&!quotationDate)issues.push("recentQuotation.quotationDate is required when a quotation is supplied");
  if(recentSupplied&&quotationAmount===null)issues.push("recentQuotation.quotationAmount is required when a quotation is supplied");
  if(issues.length)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",issues);

  const covers=Array.isArray(insurance.additionalCover)?insurance.additionalCover.map((x,i)=>text(x,`insurance.additionalCover[${i}]`,200)):[];

  return Object.freeze({
    clientSubmissionId,
    formVersion:DIRECT_FORM_VERSION,
    customer:Object.freeze({fullName,email,mobile,address,city,postcode}),
    motor:Object.freeze({registration,drivingLicenceType}),
    insurance:Object.freeze({
      existingInsurancePolicy:existing?"Yes":"No",
      policyType,
      policyCover,
      policyExcess:existing?money(insurance.policyExcess,"insurance.policyExcess"):null,
      monthlyAmountPaid:existing?money(insurance.monthlyAmountPaid,"insurance.monthlyAmountPaid"):null,
      yearlyAmountPaid:existing?money(insurance.yearlyAmountPaid,"insurance.yearlyAmountPaid"):null,
      totalPolicyCost:existing?money(insurance.totalPolicyCost,"insurance.totalPolicyCost"):null,
      policyStartDate,
      policyEndDate,
      currentInsurer,
      noClaimBonus:existing?nullableText(insurance.noClaimBonus,"insurance.noClaimBonus",100):null,
      additionalDriver:nullableText(insurance.additionalDriver,"insurance.additionalDriver",100),
      additionalCover:Object.freeze(covers),
    }),
    recentQuotation:Object.freeze({supplied:recentSupplied?"Yes":"No",quotationDate,quotationAmount}),
    renewalOrFutureStartDate:renewal,
    authorisedToContact:authorised,
    referralCode:nullableText(root.referralCode,"referralCode",200),
    customerNote:nullableText(root.customerNote,"customerNote",5000),
    acknowledgements:Object.freeze({privacyNoticeAcknowledged:privacy,privacyNoticeVersion:privacyVersion,serviceContactAuthorised:serviceContact}),
  });
}

async function persistDirectSubmission(pool:Pool,payload:ParsedCustomerIntake,request:DirectFormSubmissionRequest){
  const dedupeKey=intakeDedupeKey(payload);
  const lifecycle=deriveCustomerIntakeStatus(payload.renewalOrFutureStartDate);
  const htmlSha=hash(request.html);
  const excelSha=hash(request.excel);
  const sourceMessageId=`FORM:${payload.clientSubmissionId}`;
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const prior=await client.query(
      `SELECT s.intake_submission_id,s.customer_id,s.processing_status,s.created_at,i.customer_status,
              d.idempotency_key,d.html_sha256,d.excel_sha256,d.pdf_sha256,d.pdf_generated,
              d.email_delivery_status,d.email_provider,d.email_provider_message_id,d.email_recipient
         FROM customer_intake_submission s
         JOIN customer_intake_identity i ON i.dedupe_key=s.dedupe_key
         LEFT JOIN customer_form_delivery d ON d.intake_submission_id=s.intake_submission_id
        WHERE s.client_submission_id=$1
        LIMIT 1 FOR UPDATE OF s`,
      [payload.clientSubmissionId]
    );
    if(prior.rowCount){
      const row=prior.rows[0];
      if(!row.idempotency_key)throw new ConflictError("FORM_IDEMPOTENCY_KEY_USED_BY_OTHER_CHANNEL");
      if(row.idempotency_key!==request.idempotencyKey||row.html_sha256!==htmlSha||row.excel_sha256!==excelSha)
        throw new ConflictError("FORM_IDEMPOTENCY_PAYLOAD_MISMATCH");
      await client.query("COMMIT");
      return {existing:true,row,htmlSha,excelSha,deduplicated:true,duplicateReason:"MESSAGE_OR_CLIENT_SUBMISSION_ID" as const};
    }

    const existing=await client.query(`SELECT customer_id,customer_status FROM customer_intake_identity WHERE dedupe_key=$1 FOR UPDATE`,[dedupeKey]);
    const customerId=existing.rowCount?existing.rows[0].customer_id:id("CUS-SYN-CXM");
    const submissionId=id("CXM-SYN-SUB");
    const processingStatus=existing.rowCount?"DUPLICATE_MATCHED":"ACCEPTED";
    if(!existing.rowCount){
      await client.query(`INSERT INTO customer(customer_id,synthetic) VALUES($1,true)`,[customerId]);
      await client.query(
        `INSERT INTO customer_intake_identity(dedupe_key,customer_id,customer_status,renewal_or_future_start_date,next_action_at,synthetic)
         VALUES($1,$2,$3,$4,$5,true)`,
        [dedupeKey,customerId,lifecycle.status,payload.renewalOrFutureStartDate,lifecycle.nextActionAt]
      );
    }
    const inserted=await client.query(
      `INSERT INTO customer_intake_submission(
         intake_submission_id,source_channel,source_mailbox,source_message_id,source_thread_id,customer_id,dedupe_key,
         form_version,client_submission_id,subject,payload_sha256,payload_json,processing_status,synthetic,received_at
       ) VALUES($1,'DIRECT_FORM',NULL,$2,NULL,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,true,now()) RETURNING created_at`,
      [submissionId,sourceMessageId,customerId,dedupeKey,payload.formVersion,payload.clientSubmissionId,request.subject,hash(JSON.stringify(payload)),JSON.stringify(payload),processingStatus]
    );
    const events:Array<[string,unknown]>=existing.rowCount
      ? [["CUSTOMER_INFORMATION_REQUEST_RECEIVED",{deduplicated:true,source:"DIRECT_FORM"}],["CUSTOMER_MATCHED_EXISTING",{dedupeKey,source:"DIRECT_FORM"}]]
      : [["CUSTOMER_CREATED",{source:"DIRECT_FORM"}],["CUSTOMER_INFORMATION_REQUEST_RECEIVED",{deduplicated:false,source:"DIRECT_FORM"}],["CUSTOMER_STATUS_CHANGED",{status:lifecycle.status,nextActionAt:lifecycle.nextActionAt.toISOString()}]];
    for(const [eventType,eventPayload] of events){
      await client.query(
        `INSERT INTO customer_lifecycle_event(lifecycle_event_id,customer_id,intake_submission_id,event_type,event_payload_json,synthetic)
         VALUES($1,$2,$3,$4,$5::jsonb,true)`,
        [id("CXM-SYN-EVT"),customerId,submissionId,eventType,JSON.stringify(eventPayload)]
      );
    }
    const notificationEvent=existing.rowCount?"CUSTOMER_DUPLICATE_INTAKE_REVIEW":"CUSTOMER_INFORMATION_REQUEST_RECEIVED";
    await client.query(
      `INSERT INTO customer_notification_outbox(notification_outbox_id,customer_id,intake_submission_id,event_type,payload_json,status,synthetic)
       VALUES($1,$2,$3,$4,$5::jsonb,'PENDING',true)`,
      [id("CXM-SYN-OUT"),customerId,submissionId,notificationEvent,JSON.stringify({customerId,fullName:payload.customer.fullName,renewalOrFutureStartDate:payload.renewalOrFutureStartDate,receivedAt:new Date().toISOString(),adminPath:`/admin/customers/${customerId}`,source:"DIRECT_FORM"})]
    );
    await client.query(
      `INSERT INTO customer_lifecycle_event(lifecycle_event_id,customer_id,intake_submission_id,event_type,event_payload_json,synthetic)
       VALUES($1,$2,$3,'ADMIN_NOTIFICATION_QUEUED',$4::jsonb,true)`,
      [id("CXM-SYN-EVT"),customerId,submissionId,JSON.stringify({eventType:notificationEvent,source:"DIRECT_FORM"})]
    );
    await client.query(
      `INSERT INTO customer_form_delivery(intake_submission_id,idempotency_key,subject,html_sha256,excel_sha256,email_recipient,email_delivery_status,synthetic)
       VALUES($1,$2,$3,$4,$5,$6,'PENDING',true)`,
      [submissionId,request.idempotencyKey,request.subject,htmlSha,excelSha,process.env.MIQO_GMAIL_RECIPIENT?.trim()||"miqos.new@gmail.com"]
    );
    await client.query("COMMIT");
    return {existing:false,row:{intake_submission_id:submissionId,customer_id:customerId,processing_status:processingStatus,created_at:inserted.rows[0].created_at,customer_status:existing.rowCount?existing.rows[0].customer_status:lifecycle.status,email_delivery_status:"PENDING"},htmlSha,excelSha,deduplicated:Boolean(existing.rowCount),duplicateReason:existing.rowCount?"IDENTITY_FINGERPRINT" as const:null};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function processDirectCustomerFormSubmission(pool:Pool,request:DirectFormSubmissionRequest,deps:FormSubmissionDependencies={}){
  if((process.env.MIQO_DATA_CLASSIFICATION??"SYNTHETIC")!=="SYNTHETIC")throw new ConflictError("FORM_REAL_DATA_GATE_CLOSED");
  if((process.env.MIQO_FORM_SUBMISSION_ENABLED??"false").toLowerCase()!=="true")throw new ConflictError("FORM_SUBMISSION_GATE_CLOSED");
  if(request.formVersion!==DIRECT_FORM_VERSION)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`formVersion must be ${DIRECT_FORM_VERSION}`]);
  if(request.renderPdf!==true)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["renderPdf must be true"]);
  if(!request.subject.trim().startsWith("[MIQOS NEW CUSTOMER]"))throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["subject must begin [MIQOS NEW CUSTOMER]"]);
  const payload=validateDirectFormPayload(request.payload);
  if(request.idempotencyKey!==payload.clientSubmissionId)throw new ConflictError("FORM_IDEMPOTENCY_KEY_MISMATCH");
  if(request.html.length===0||request.html.length>4_500_000)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["HTML snapshot is empty or too large"]);
  if(request.excel.length===0||request.excel.length>1_500_000)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["Excel export is empty or too large"]);

  const persisted=await persistDirectSubmission(pool,payload,request);
  const row=persisted.row as any;
  if(row.email_delivery_status==="SENT"&&row.pdf_generated===true){
    return Object.freeze({ok:true,emailAccepted:true,pdfGenerated:true,customerId:row.customer_id,submissionId:row.intake_submission_id,reference:row.customer_id,deduplicated:true,duplicateReason:persisted.duplicateReason,emailProvider:row.email_provider,emailProviderMessageId:row.email_provider_message_id,idempotentReplay:true});
  }

  const renderPdf=deps.renderPdf??renderHtmlToPdf;
  const sendEmail=deps.sendEmail??sendGmailWithAttachments;
  await pool.query(`UPDATE customer_form_delivery SET email_delivery_status='PENDING',delivery_attempts=delivery_attempts+1,updated_at=now(),last_error=NULL WHERE intake_submission_id=$1`,[row.intake_submission_id]);
  let pdf:Buffer;
  try{
    pdf=await renderPdf(request.html);
    if(pdf.length<5||pdf.subarray(0,5).toString("ascii")!=="%PDF-")throw new Error("PDF renderer returned invalid content");
  }catch(error){
    const message=String((error as any)?.message??error).slice(0,2000);
    await pool.query(`UPDATE customer_form_delivery SET email_delivery_status='FAILED',updated_at=now(),last_error=$2 WHERE intake_submission_id=$1`,[row.intake_submission_id,`PDF: ${message}`]);
    throw new FormDeliveryError("PDF_RENDER");
  }
  const pdfSha=hash(pdf);
  const baseName=`MIQOS-Customer-Information-${payload.clientSubmissionId.replace(/[^A-Z0-9_-]/gi,"_")}`;
  let delivery:{provider:string;messageId:string;recipient:string};
  try{
    delivery=await sendEmail({
      subject:request.subject,
      textBody:[
        "MIQOS direct customer information submission",
        "",
        `Customer ID: ${row.customer_id}`,
        `Submission ID: ${row.intake_submission_id}`,
        `Client submission ID: ${payload.clientSubmissionId}`,
        `Processing status: ${row.processing_status}`,
        `Form version: ${payload.formVersion}`,
        "",
        "The completed PDF and Excel copies are attached.",
      ].join("\n"),
      attachments:[
        {filename:`${baseName}.pdf`,contentType:"application/pdf",data:pdf},
        {filename:`${baseName}.xls`,contentType:"application/vnd.ms-excel",data:request.excel},
      ],
    });
  }catch(error){
    const message=String((error as any)?.message??error).slice(0,2000);
    await pool.query(`UPDATE customer_form_delivery SET pdf_sha256=$2,pdf_generated=true,email_delivery_status='FAILED',updated_at=now(),last_error=$3 WHERE intake_submission_id=$1`,[row.intake_submission_id,pdfSha,`EMAIL: ${message}`]);
    throw new FormDeliveryError("EMAIL_DELIVERY");
  }
  await pool.query(
    `UPDATE customer_form_delivery
        SET pdf_sha256=$2,pdf_generated=true,email_delivery_status='SENT',email_provider=$3,email_provider_message_id=$4,
            email_recipient=$5,sent_at=now(),updated_at=now(),last_error=NULL
      WHERE intake_submission_id=$1`,
    [row.intake_submission_id,pdfSha,delivery.provider,delivery.messageId,delivery.recipient]
  );
  return Object.freeze({ok:true,emailAccepted:true,pdfGenerated:true,customerId:row.customer_id,submissionId:row.intake_submission_id,reference:row.customer_id,deduplicated:persisted.deduplicated,duplicateReason:persisted.duplicateReason,emailProvider:delivery.provider,emailProviderMessageId:delivery.messageId,idempotentReplay:persisted.existing});
}
