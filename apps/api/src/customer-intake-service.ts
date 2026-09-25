import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { ConflictError, ValidationError } from "./errors.ts";

export const CONTROLLED_INTAKE_MAILBOX = "miqos.new@gmail.com";
export const INTAKE_FORM_VERSION = "CIRF-1.1";

const MONEY_LABELS = new Set([
  "Policy Excess",
  "Monthly Amount Paid",
  "Yearly Amount Paid",
  "Total Policy Cost",
  "Quotation Amount",
]);

const KNOWN_LABELS = [
  "Submission ID",
  "Form version",
  "Submitted by customer",
  "Full Name",
  "Email",
  "Mobile",
  "Address",
  "City",
  "Postcode",
  "Motor REG",
  "Driving Licence Type",
  "Existing Insurance Policy",
  "Policy Type",
  "Policy Cover",
  "Policy Excess",
  "Monthly Amount Paid",
  "Yearly Amount Paid",
  "Total Policy Cost",
  "Policy Start Date",
  "Policy End Date",
  "Current Insurer",
  "No Claim Bonus",
  "Additional Driver",
  "Additional Cover",
  "Recent quotation supplied",
  "Quotation Date",
  "Quotation Amount",
  "Renewal / Future Start Date",
  "Authorised to Contact",
  "Referral Code",
  "Customer Note",
  "Privacy notice acknowledged",
  "Privacy notice version",
  "Service contact authorised",
] as const;

const SECTION_HEADERS = new Set([
  "MIQOS — New Customer Information Request",
  "CUSTOMER DETAILS",
  "MOTOR / LICENCE",
  "INSURANCE INFORMATION",
  "RECENT QUOTATION",
  "RENEWAL / CONTACT",
  "ACKNOWLEDGEMENTS",
  "INTERIM ROUTING NOTICE",
]);

export type ParsedCustomerIntake = Readonly<{
  clientSubmissionId:string;
  formVersion:string;
  customer:Readonly<{fullName:string;email:string;mobile:string;address:string;city:string;postcode:string}>;
  motor:Readonly<{registration:string;drivingLicenceType:string}>;
  insurance:Readonly<{
    existingInsurancePolicy:string;
    policyType:string|null;
    policyCover:string|null;
    policyExcess:number|null;
    monthlyAmountPaid:number|null;
    yearlyAmountPaid:number|null;
    totalPolicyCost:number|null;
    policyStartDate:string|null;
    policyEndDate:string|null;
    currentInsurer:string|null;
    noClaimBonus:string|null;
    additionalDriver:string|null;
    additionalCover:readonly string[];
  }>;
  recentQuotation:Readonly<{supplied:string;quotationDate:string|null;quotationAmount:number|null}>;
  renewalOrFutureStartDate:string;
  authorisedToContact:boolean;
  referralCode:string|null;
  customerNote:string|null;
  acknowledgements:Readonly<{
    privacyNoticeAcknowledged:boolean;
    privacyNoticeVersion:string;
    serviceContactAuthorised:boolean;
  }>;
}>;

export type IntakeEmailEnvelope = Readonly<{
  sourceMailbox:string;
  sourceMessageId:string;
  sourceThreadId?:string|null;
  receivedAt?:string|null;
  subject:string;
  body:string;
  synthetic:boolean;
}>;

function normaliseWhitespace(value:string){return value.replace(/\s+/g," ").trim();}
function normaliseEmail(value:string){return value.trim().toLowerCase();}
function normaliseMobile(value:string){
  const digits=value.replace(/\D/g,"");
  if(digits.startsWith("447")) return `0${digits.slice(2)}`;
  return digits;
}
function normalisePostcode(value:string){return value.replace(/\s+/g,"").toUpperCase();}
function normaliseVehicleReg(value:string){return value.replace(/\s+/g,"").toUpperCase();}
function nullable(value:string|undefined){
  if(value===undefined)return null;
  const v=value.trim();
  if(!v || /^(not provided|none)$/i.test(v))return null;
  return v;
}
function yesNo(value:string|undefined,label:string){
  const v=(value??"").trim().toLowerCase();
  if(v==="yes")return true;
  if(v==="no")return false;
  throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",[`${label} must be Yes or No`]);
}
function money(value:string|undefined,label:string){
  const v=nullable(value); if(v===null)return null;
  const numeric=Number(v.replace(/^£/,"").replace(/,/g,""));
  if(!Number.isFinite(numeric)||numeric<0)throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",[`${label} must be a non-negative amount`]);
  return numeric;
}
function required(fields:Map<string,string>,label:string){
  const v=nullable(fields.get(label));
  if(v===null)throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",[`Missing required field: ${label}`]);
  return v;
}
function assertIsoDate(value:string,label:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",[`${label} must use YYYY-MM-DD`]);
}

export function parseStructuredCustomerIntakeEmail(body:string):ParsedCustomerIntake{
  if(!body.includes("MIQOS — New Customer Information Request"))
    throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",["Missing MIQOS intake marker"]);

  const fields=new Map<string,string>();
  let activeLabel:string|null=null;
  for(const rawLine of body.replace(/\r\n/g,"\n").split("\n")){
    const line=rawLine.trimEnd();
    const trimmed=line.trim();
    if(!trimmed){activeLabel=null;continue;}
    if(SECTION_HEADERS.has(trimmed)){activeLabel=null;continue;}
    const label=KNOWN_LABELS.find(candidate=>trimmed.startsWith(`${candidate}:`));
    if(label){
      const value=trimmed.slice(label.length+1).trim();
      fields.set(label,value);
      activeLabel=label;
      continue;
    }
    if(activeLabel){fields.set(activeLabel,`${fields.get(activeLabel)??""}\n${trimmed}`.trim());}
  }

  const clientSubmissionId=required(fields,"Submission ID");
  const formVersion=required(fields,"Form version");
  if(formVersion!==INTAKE_FORM_VERSION)
    throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",[`Unsupported form version: ${formVersion}`]);

  const fullName=normaliseWhitespace(required(fields,"Full Name"));
  const email=normaliseEmail(required(fields,"Email"));
  const mobile=required(fields,"Mobile").trim();
  const address=normaliseWhitespace(required(fields,"Address"));
  const city=normaliseWhitespace(required(fields,"City"));
  const postcode=required(fields,"Postcode").toUpperCase().trim();
  const registration=normaliseVehicleReg(required(fields,"Motor REG"));
  const drivingLicenceType=required(fields,"Driving Licence Type");
  const existingInsurancePolicy=required(fields,"Existing Insurance Policy");
  const renewalOrFutureStartDate=required(fields,"Renewal / Future Start Date");
  assertIsoDate(renewalOrFutureStartDate,"Renewal / Future Start Date");

  const issues:string[]=[];
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))issues.push("Email is not valid");
  if(!/^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i.test(postcode))issues.push("Postcode is not a valid UK postcode format");
  if(!/^(?:07\d{9}|447\d{9})$/.test(normaliseMobile(mobile)))issues.push("Mobile is not a valid UK mobile number");
  if(!registration || registration.length>10)issues.push("Motor REG is not valid");

  const privacyNoticeAcknowledged=yesNo(fields.get("Privacy notice acknowledged"),"Privacy notice acknowledged");
  const serviceContactAuthorised=yesNo(fields.get("Service contact authorised"),"Service contact authorised");
  const authorisedToContact=yesNo(fields.get("Authorised to Contact"),"Authorised to Contact");
  if(!privacyNoticeAcknowledged)issues.push("Privacy notice must be acknowledged");
  if(!serviceContactAuthorised || !authorisedToContact)issues.push("Service contact must be authorised");

  const existing=yesNo(fields.get("Existing Insurance Policy"),"Existing Insurance Policy");
  const policyType=nullable(fields.get("Policy Type"));
  const policyCover=nullable(fields.get("Policy Cover"));
  const policyStartDate=nullable(fields.get("Policy Start Date"));
  const policyEndDate=nullable(fields.get("Policy End Date"));
  const currentInsurer=nullable(fields.get("Current Insurer"));
  if(existing){
    for(const [label,value] of [["Policy Type",policyType],["Policy Cover",policyCover],["Policy Start Date",policyStartDate],["Policy End Date",policyEndDate],["Current Insurer",currentInsurer]] as const){
      if(value===null)issues.push(`${label} is required for an existing policy`);
    }
    if(policyStartDate)assertIsoDate(policyStartDate,"Policy Start Date");
    if(policyEndDate)assertIsoDate(policyEndDate,"Policy End Date");
    if(policyStartDate&&policyEndDate&&policyEndDate<policyStartDate)issues.push("Policy End Date must not be before Policy Start Date");
  }

  const quotationSupplied=required(fields,"Recent quotation supplied");
  const hasRecentQuotation=yesNo(fields.get("Recent quotation supplied"),"Recent quotation supplied");
  const quotationDate=nullable(fields.get("Quotation Date"));
  const quotationAmount=money(fields.get("Quotation Amount"),"Quotation Amount");
  if(hasRecentQuotation){
    if(!quotationDate)issues.push("Quotation Date is required when a recent quotation is supplied");
    else assertIsoDate(quotationDate,"Quotation Date");
    if(quotationAmount===null)issues.push("Quotation Amount is required when a recent quotation is supplied");
  }

  if(issues.length)throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",issues);

  const additionalCoverRaw=nullable(fields.get("Additional Cover"));
  const additionalCover=additionalCoverRaw?additionalCoverRaw.split(",").map(x=>x.trim()).filter(Boolean):[];

  for(const label of MONEY_LABELS){
    if(fields.has(label))money(fields.get(label),label);
  }

  return Object.freeze({
    clientSubmissionId,
    formVersion,
    customer:Object.freeze({fullName,email,mobile,address,city,postcode}),
    motor:Object.freeze({registration,drivingLicenceType}),
    insurance:Object.freeze({
      existingInsurancePolicy,
      policyType,
      policyCover,
      policyExcess:money(fields.get("Policy Excess"),"Policy Excess"),
      monthlyAmountPaid:money(fields.get("Monthly Amount Paid"),"Monthly Amount Paid"),
      yearlyAmountPaid:money(fields.get("Yearly Amount Paid"),"Yearly Amount Paid"),
      totalPolicyCost:money(fields.get("Total Policy Cost"),"Total Policy Cost"),
      policyStartDate,
      policyEndDate,
      currentInsurer,
      noClaimBonus:nullable(fields.get("No Claim Bonus")),
      additionalDriver:nullable(fields.get("Additional Driver")),
      additionalCover:Object.freeze(additionalCover),
    }),
    recentQuotation:Object.freeze({supplied:quotationSupplied,quotationDate,quotationAmount}),
    renewalOrFutureStartDate,
    authorisedToContact,
    referralCode:nullable(fields.get("Referral Code")),
    customerNote:nullable(fields.get("Customer Note")),
    acknowledgements:Object.freeze({
      privacyNoticeAcknowledged,
      privacyNoticeVersion:required(fields,"Privacy notice version"),
      serviceContactAuthorised,
    }),
  });
}

export function intakeDedupeKey(payload:ParsedCustomerIntake){
  const material=[
    normaliseWhitespace(payload.customer.fullName).toLowerCase(),
    normaliseEmail(payload.customer.email),
    normaliseMobile(payload.customer.mobile),
    normalisePostcode(payload.customer.postcode),
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}

export function deriveCustomerIntakeStatus(renewalDate:string,now=new Date(),leadDays=35){
  assertIsoDate(renewalDate,"Renewal / Future Start Date");
  const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const renewal=new Date(`${renewalDate}T00:00:00Z`);
  const days=Math.ceil((renewal.getTime()-today.getTime())/86_400_000);
  if(days<=0)return {status:"QUOTE_FOLLOW_UP_DUE",nextActionAt:now};
  if(days<=leadDays)return {status:"RENEWAL_WINDOW_OPEN",nextActionAt:now};
  const nextAction=new Date(renewal.getTime()-leadDays*86_400_000);
  nextAction.setUTCHours(9,0,0,0);
  return {status:"RENEWAL_MONITORING",nextActionAt:nextAction};
}

export async function refreshDueCustomerIntakeLifecycle(pool:Pool,now=new Date()){
  if(Number.isNaN(now.getTime()))throw new ValidationError("INVALID_LIFECYCLE_REFRESH",["now is not a valid timestamp"]);
  const client=await pool.connect();
  const changed:Array<{customerId:string;from:string;to:string;renewalOrFutureStartDate:string}>=[];
  try{
    await client.query("BEGIN");
    const rows=await client.query(
      `SELECT customer_id,customer_status,renewal_or_future_start_date
         FROM customer_intake_identity
        WHERE synthetic=true
          AND customer_status IN ('RENEWAL_MONITORING','RENEWAL_WINDOW_OPEN')
          AND (next_action_at IS NULL OR next_action_at <= $1 OR renewal_or_future_start_date <= $1::date)
        ORDER BY customer_id
        FOR UPDATE`,
      [now]
    );
    for(const row of rows.rows){
      const renewalDate=String(row.renewal_or_future_start_date);
      const next=deriveCustomerIntakeStatus(renewalDate,now);
      if(next.status===row.customer_status)continue;
      await client.query(
        `UPDATE customer_intake_identity
            SET customer_status=$2,next_action_at=$3,updated_at=$4
          WHERE customer_id=$1`,
        [row.customer_id,next.status,next.nextActionAt,now]
      );
      await client.query(
        `INSERT INTO customer_lifecycle_event(
           lifecycle_event_id,customer_id,event_type,event_payload_json,synthetic,occurred_at
         ) VALUES($1,$2,'CUSTOMER_STATUS_CHANGED',$3::jsonb,true,$4)`,
        [id("CXM-SYN-EVT"),row.customer_id,JSON.stringify({from:row.customer_status,to:next.status,renewalOrFutureStartDate:renewalDate}),now]
      );
      changed.push({customerId:row.customer_id,from:row.customer_status,to:next.status,renewalOrFutureStartDate:renewalDate});
    }
    await client.query("COMMIT");
    return {evaluatedAt:now.toISOString(),changed};
  }catch(error){
    await client.query("ROLLBACK");
    throw error;
  }finally{client.release();}
}

function id(prefix:string){return `${prefix}-${randomUUID()}`;}
function payloadHash(payload:ParsedCustomerIntake){return createHash("sha256").update(JSON.stringify(payload)).digest("hex");}

export async function processCustomerIntakeEmail(pool:Pool,envelope:IntakeEmailEnvelope){
  if(envelope.synthetic!==true)throw new ConflictError("INTAKE_REAL_DATA_GATE_CLOSED");
  if(normaliseEmail(envelope.sourceMailbox)!==CONTROLLED_INTAKE_MAILBOX)
    throw new ValidationError("INVALID_CUSTOMER_INTAKE_SOURCE",[`Expected ${CONTROLLED_INTAKE_MAILBOX}`]);
  if(!/^\[MIQOS NEW CUSTOMER\]/.test(envelope.subject.trim()))
    throw new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",["Subject must begin [MIQOS NEW CUSTOMER]"]);
  if(!envelope.sourceMessageId.trim())throw new ValidationError("INVALID_CUSTOMER_INTAKE_SOURCE",["sourceMessageId is required"]);

  const payload=parseStructuredCustomerIntakeEmail(envelope.body);
  const dedupeKey=intakeDedupeKey(payload);
  const lifecycle=deriveCustomerIntakeStatus(payload.renewalOrFutureStartDate);
  const receivedAt=envelope.receivedAt?new Date(envelope.receivedAt):new Date();
  if(Number.isNaN(receivedAt.getTime()))throw new ValidationError("INVALID_CUSTOMER_INTAKE_SOURCE",["receivedAt is not a valid timestamp"]);

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const prior=await client.query(
      `SELECT s.intake_submission_id,s.customer_id,s.processing_status,s.created_at,i.customer_status
         FROM customer_intake_submission s
         JOIN customer_intake_identity i ON i.dedupe_key=s.dedupe_key
        WHERE s.source_message_id=$1 OR s.client_submission_id=$2
        ORDER BY s.created_at ASC LIMIT 1`,
      [envelope.sourceMessageId,payload.clientSubmissionId]
    );
    if(prior.rowCount){
      await client.query("COMMIT");
      const row=prior.rows[0];
      return {submissionId:row.intake_submission_id,customerId:row.customer_id,status:row.customer_status,processingStatus:row.processing_status,createdAt:new Date(row.created_at).toISOString(),deduplicated:true,duplicateReason:"MESSAGE_OR_CLIENT_SUBMISSION_ID"};
    }

    const existing=await client.query(
      `SELECT customer_id,customer_status FROM customer_intake_identity WHERE dedupe_key=$1 FOR UPDATE`,
      [dedupeKey]
    );
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
         intake_submission_id,source_mailbox,source_message_id,source_thread_id,customer_id,dedupe_key,
         form_version,client_submission_id,subject,payload_sha256,payload_json,processing_status,synthetic,received_at
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,true,$13)
       RETURNING created_at`,
      [submissionId,CONTROLLED_INTAKE_MAILBOX,envelope.sourceMessageId,envelope.sourceThreadId??null,customerId,dedupeKey,
       payload.formVersion,payload.clientSubmissionId,envelope.subject,payloadHash(payload),JSON.stringify(payload),processingStatus,receivedAt]
    );

    const events:Array<[string,unknown]> = existing.rowCount
      ? [["CUSTOMER_INFORMATION_REQUEST_RECEIVED",{deduplicated:true}],["CUSTOMER_MATCHED_EXISTING",{dedupeKey}]]
      : [["CUSTOMER_CREATED",{source:"CONTROLLED_INTAKE_MAILBOX"}],["CUSTOMER_INFORMATION_REQUEST_RECEIVED",{deduplicated:false}],["CUSTOMER_STATUS_CHANGED",{status:lifecycle.status,nextActionAt:lifecycle.nextActionAt.toISOString()}]];
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
      [id("CXM-SYN-OUT"),customerId,submissionId,notificationEvent,JSON.stringify({
        customerId,
        fullName:payload.customer.fullName,
        renewalOrFutureStartDate:payload.renewalOrFutureStartDate,
        receivedAt:receivedAt.toISOString(),
        adminPath:`/admin/customers/${customerId}`,
      })]
    );

    await client.query(
      `INSERT INTO customer_lifecycle_event(lifecycle_event_id,customer_id,intake_submission_id,event_type,event_payload_json,synthetic)
       VALUES($1,$2,$3,'ADMIN_NOTIFICATION_QUEUED',$4::jsonb,true)`,
      [id("CXM-SYN-EVT"),customerId,submissionId,JSON.stringify({eventType:notificationEvent})]
    );

    await client.query("COMMIT");
    return {
      submissionId,
      customerId,
      status:existing.rowCount?existing.rows[0].customer_status:lifecycle.status,
      processingStatus,
      createdAt:new Date(inserted.rows[0].created_at).toISOString(),
      deduplicated:Boolean(existing.rowCount),
      duplicateReason:existing.rowCount?"IDENTITY_FINGERPRINT":null,
      notificationQueued:true,
    };
  }catch(error){
    await client.query("ROLLBACK");
    throw error;
  }finally{client.release();}
}
