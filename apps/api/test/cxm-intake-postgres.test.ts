import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { createPool } from "../../../packages/db/src/client.ts";
import { deriveCustomerIntakeStatus, parseStructuredCustomerIntakeEmail, processCustomerIntakeEmail, refreshDueCustomerIntakeLifecycle } from "../src/customer-intake-service.ts";
import { ConflictError, ValidationError } from "../src/errors.ts";
import { buildApp } from "../src/server.ts";
import { GMAIL_INTAKE_LABELS, gmailDispositionForError, handleGmailIntakeEvent, validateGmailIntakeEvent } from "../src/customer-intake-event-adapter.ts";
const {Client}=pg;

const body=(overrides:Record<string,string>={})=>{
  const fields:Record<string,string>={
    "Submission ID":"SUB-SYN-001",
    "Form version":"CIRF-1.1",
    "Submitted by customer":"Synthetic Customer",
    "Full Name":"Synthetic Customer",
    "Email":"synthetic.customer@example.test",
    "Mobile":"07123456789",
    "Address":"1 Synthetic Street",
    "City":"London",
    "Postcode":"E20 1EJ",
    "Motor REG":"AB12 CDE",
    "Driving Licence Type":"Full UK",
    "Existing Insurance Policy":"Yes",
    "Policy Type":"Private Car",
    "Policy Cover":"Comprehensive",
    "Policy Excess":"£350",
    "Monthly Amount Paid":"£75",
    "Yearly Amount Paid":"Not provided",
    "Total Policy Cost":"£900",
    "Policy Start Date":"2026-01-01",
    "Policy End Date":"2026-12-31",
    "Current Insurer":"Synthetic Insurer",
    "No Claim Bonus":"5 years",
    "Additional Driver":"No",
    "Additional Cover":"Breakdown, Legal cover",
    "Recent quotation supplied":"Yes",
    "Quotation Date":"2026-09-20",
    "Quotation Amount":"£810",
    "Renewal / Future Start Date":"2026-10-20",
    "Authorised to Contact":"Yes",
    "Referral Code":"REF-SYN",
    "Customer Note":"Line one\nLine two",
    "Privacy notice acknowledged":"Yes",
    "Privacy notice version":"CIRF-PRIVACY-1.0",
    "Service contact authorised":"Yes",
    ...overrides,
  };
  const ordered=[
    "Submission ID","Form version","Submitted by customer","Full Name","Email","Mobile","Address","City","Postcode",
    "Motor REG","Driving Licence Type","Existing Insurance Policy","Policy Type","Policy Cover","Policy Excess","Monthly Amount Paid","Yearly Amount Paid","Total Policy Cost","Policy Start Date","Policy End Date","Current Insurer","No Claim Bonus","Additional Driver","Additional Cover",
    "Recent quotation supplied","Quotation Date","Quotation Amount","Renewal / Future Start Date","Authorised to Contact","Referral Code","Customer Note","Privacy notice acknowledged","Privacy notice version","Service contact authorised"
  ];
  return ["MIQOS — New Customer Information Request","",...ordered.map(k=>`${k}: ${fields[k]}`)].join("\n");
};

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
  await c.query("TRUNCATE customer_notification_outbox, customer_lifecycle_event, customer_intake_submission, customer_intake_identity RESTART IDENTITY CASCADE");
  await c.end();
}

test("CXM intake parser preserves structured fields and multiline notes",()=>{
  const parsed=parseStructuredCustomerIntakeEmail(body());
  assert.equal(parsed.customer.fullName,"Synthetic Customer");
  assert.equal(parsed.motor.registration,"AB12CDE");
  assert.equal(parsed.insurance.policyExcess,350);
  assert.deepEqual(parsed.insurance.additionalCover,["Breakdown","Legal cover"]);
  assert.match(parsed.customerNote??"",/Line two/);
});

test("CXM intake lifecycle derives renewal monitoring state deterministically",()=>{
  const result=deriveCustomerIntakeStatus("2026-12-01",new Date("2026-09-25T12:00:00Z"),35);
  assert.equal(result.status,"RENEWAL_MONITORING");
  assert.equal(result.nextActionAt.toISOString(),"2026-10-27T09:00:00.000Z");
});

test("CXM intake persists one synthetic customer and deduplicates a second Gmail message",async()=>{
  await reset(); const pool=createPool();
  const first=await processCustomerIntakeEmail(pool,{sourceMailbox:"miqos.new@gmail.com",sourceMessageId:"GMAIL-SYN-001",sourceThreadId:"THREAD-SYN-001",subject:"[MIQOS NEW CUSTOMER] Synthetic Customer | 2026-10-20",body:body(),synthetic:true,receivedAt:"2026-09-25T20:00:00Z"});
  assert.equal(first.deduplicated,false);
  assert.match(first.customerId,/^CUS-SYN-CXM-/);
  const second=await processCustomerIntakeEmail(pool,{sourceMailbox:"miqos.new@gmail.com",sourceMessageId:"GMAIL-SYN-002",sourceThreadId:"THREAD-SYN-002",subject:"[MIQOS NEW CUSTOMER] Synthetic Customer | 2026-10-20",body:body({"Submission ID":"SUB-SYN-002"}),synthetic:true,receivedAt:"2026-09-25T20:05:00Z"});
  assert.equal(second.deduplicated,true);
  assert.equal(second.customerId,first.customerId);
  assert.equal(second.duplicateReason,"IDENTITY_FINGERPRINT");
  const counts=await pool.query("SELECT (SELECT count(*) FROM customer_intake_identity)::int identities,(SELECT count(*) FROM customer_intake_submission)::int submissions,(SELECT count(*) FROM customer_notification_outbox WHERE status='PENDING')::int pending");
  assert.deepEqual(counts.rows[0],{identities:1,submissions:2,pending:2});
  await pool.end();
});

test("CXM intake idempotently returns the first result for the same Gmail message or client submission",async()=>{
  await reset(); const pool=createPool();
  const envelope={sourceMailbox:"miqos.new@gmail.com",sourceMessageId:"GMAIL-SYN-IDEMP",subject:"[MIQOS NEW CUSTOMER] Synthetic Customer | 2026-10-20",body:body({"Submission ID":"SUB-SYN-IDEMP"}),synthetic:true,receivedAt:"2026-09-25T20:00:00Z"} as const;
  const first=await processCustomerIntakeEmail(pool,envelope);
  const second=await processCustomerIntakeEmail(pool,envelope);
  assert.equal(second.deduplicated,true);
  assert.equal(second.submissionId,first.submissionId);
  assert.equal(second.customerId,first.customerId);
  assert.equal(second.duplicateReason,"MESSAGE_OR_CLIENT_SUBMISSION_ID");
  await pool.end();
});

test("CXM intake fails closed for the wrong mailbox and for real-customer mode",async()=>{
  const pool=createPool();
  await assert.rejects(()=>processCustomerIntakeEmail(pool,{sourceMailbox:"other@example.com",sourceMessageId:"G1",subject:"[MIQOS NEW CUSTOMER] X",body:body(),synthetic:true}),ValidationError);
  await assert.rejects(()=>processCustomerIntakeEmail(pool,{sourceMailbox:"miqos.new@gmail.com",sourceMessageId:"G2",subject:"[MIQOS NEW CUSTOMER] X",body:body(),synthetic:false}),ConflictError);
  await pool.end();
});


test("CXM scheduler advances monitoring through renewal window to follow-up due",async()=>{
  await reset(); const pool=createPool();
  const first=await processCustomerIntakeEmail(pool,{
    sourceMailbox:"miqos.new@gmail.com",
    sourceMessageId:"GMAIL-SYN-LIFECYCLE",
    subject:"[MIQOS NEW CUSTOMER] Synthetic Customer | 2026-12-01",
    body:body({"Submission ID":"SUB-SYN-LIFECYCLE","Renewal / Future Start Date":"2026-12-01"}),
    synthetic:true,
    receivedAt:"2026-09-25T20:00:00Z"
  });
  assert.equal(first.status,"RENEWAL_MONITORING");

  const opened=await refreshDueCustomerIntakeLifecycle(pool,new Date("2026-10-27T09:00:00Z"));
  assert.deepEqual(opened.changed.map(x=>[x.customerId,x.from,x.to]),[[first.customerId,"RENEWAL_MONITORING","RENEWAL_WINDOW_OPEN"]]);

  const due=await refreshDueCustomerIntakeLifecycle(pool,new Date("2026-12-01T09:00:00Z"));
  assert.deepEqual(due.changed.map(x=>[x.customerId,x.from,x.to]),[[first.customerId,"RENEWAL_WINDOW_OPEN","QUOTE_FOLLOW_UP_DUE"]]);

  const events=await pool.query(
    "SELECT event_payload_json FROM customer_lifecycle_event WHERE customer_id=$1 AND event_type='CUSTOMER_STATUS_CHANGED' ORDER BY occurred_at",
    [first.customerId]
  );
  assert.ok(events.rows.some((r:any)=>r.event_payload_json.to==="RENEWAL_WINDOW_OPEN"));
  assert.ok(events.rows.some((r:any)=>r.event_payload_json.to==="QUOTE_FOLLOW_UP_DUE"));
  await pool.end();
});


test("CXM Gmail event adapter returns mailbox dispositions only after persistence",async()=>{
  await reset(); const pool=createPool();
  const base={
    provider:"gmail" as const,
    eventId:"EVT-SYN-GMAIL-001",
    mailbox:"miqos.new@gmail.com",
    synthetic:true,
    message:{
      id:"GMAIL-SYN-EVENT-001",
      threadId:"THREAD-SYN-EVENT-001",
      receivedAt:"2026-09-25T20:00:00Z",
      subject:"[MIQOS NEW CUSTOMER] Synthetic Customer | 2026-10-20",
      body:body({"Submission ID":"SUB-SYN-GMAIL-EVENT-001"}),
    },
  };
  const first=await handleGmailIntakeEvent(pool,base);
  assert.equal(first.disposition,"PROCESSED");
  assert.equal(first.gmailLabel,GMAIL_INTAKE_LABELS.processed);
  assert.equal(first.result.deduplicated,false);

  const replay=await handleGmailIntakeEvent(pool,{
    ...base,
    eventId:"EVT-SYN-GMAIL-REPLAY",
    message:{...base.message,id:"GMAIL-SYN-EVENT-REPLAY"},
  });
  assert.equal(replay.disposition,"PROCESSED");
  assert.equal(replay.gmailLabel,GMAIL_INTAKE_LABELS.processed);
  assert.equal(replay.result.deduplicated,true);
  assert.equal(replay.result.duplicateReason,"MESSAGE_OR_CLIENT_SUBMISSION_ID");

  const duplicate=await handleGmailIntakeEvent(pool,{
    ...base,
    eventId:"EVT-SYN-GMAIL-002",
    message:{
      ...base.message,
      id:"GMAIL-SYN-EVENT-002",
      body:body({"Submission ID":"SUB-SYN-GMAIL-EVENT-002"}),
    },
  });
  assert.equal(duplicate.disposition,"DUPLICATE");
  assert.equal(duplicate.gmailLabel,GMAIL_INTAKE_LABELS.duplicate);
  assert.equal(duplicate.result.deduplicated,true);
  assert.equal(duplicate.result.duplicateReason,"IDENTITY_FINGERPRINT");

  const count=await pool.query("SELECT count(*)::int AS n FROM customer_intake_submission");
  assert.equal(count.rows[0].n,2);
  await pool.end();
});

test("CXM Gmail event validation and errors map to fail-closed mailbox states",()=>{
  assert.throws(()=>validateGmailIntakeEvent({
    provider:"gmail",
    eventId:"EVT-WRONG",
    mailbox:"wrong@example.com",
    synthetic:true,
    message:{id:"G1",subject:"x",body:"x"},
  }),ValidationError);

  const sourceDisposition=gmailDispositionForError(new ValidationError("INVALID_CUSTOMER_INTAKE_SOURCE",["wrong mailbox"]));
  assert.deepEqual(sourceDisposition,{disposition:"MANUAL_REVIEW",gmailLabel:GMAIL_INTAKE_LABELS.manualReview,retryable:false});

  const malformedDisposition=gmailDispositionForError(new ValidationError("INVALID_CUSTOMER_INTAKE_EMAIL",["bad form"]));
  assert.deepEqual(malformedDisposition,{disposition:"REJECTED",gmailLabel:GMAIL_INTAKE_LABELS.rejected,retryable:false});

  const realDataDisposition=gmailDispositionForError(new ConflictError("INTAKE_REAL_DATA_GATE_CLOSED"));
  assert.deepEqual(realDataDisposition,{disposition:"MANUAL_REVIEW",gmailLabel:GMAIL_INTAKE_LABELS.manualReview,retryable:false});
});


test("CXM controlled Gmail bridge rehearsal persists real Pending payloads and returns Processed/Duplicate labels",async()=>{
  await reset();
  const previousAdminKey=process.env.MIQO_SYNTHETIC_ADMIN_KEY;
  process.env.MIQO_SYNTHETIC_ADMIN_KEY="CXM-SYN-BRIDGE-TEST";
  const app=await buildApp();
  try{
    const first=await app.inject({
      method:"POST",
      url:"/admin/cxm/intake/gmail-event",
      headers:{"x-miqo-synthetic-admin":"CXM-SYN-BRIDGE-TEST"},
      payload:{
        provider:"gmail",
        eventId:"BRIDGE-REHEARSAL-1a0db12187f1eb7f",
        mailbox:"miqos.new@gmail.com",
        synthetic:true,
        message:{
          id:"1a0db12187f1eb7f",
          threadId:"1a0db12187f1eb7f",
          receivedAt:"2026-09-26T00:16:28Z",
          subject:"[MIQOS NEW CUSTOMER] Synthetic Test Customer | 2026-10-20",
          body:"MIQOS — New Customer Information Request\n\nSubmission ID: SUB-SYN-FORM-TEST-001\nForm version: CIRF-1.1\nSubmitted by customer: Synthetic Test Customer\n\nCUSTOMER DETAILS\nFull Name: Synthetic Test Customer\nEmail: synthetic.customer@example.test\nMobile: 07123456789\nAddress: 1 Synthetic Street\nCity: London\nPostcode: E20 1EJ\n\nMOTOR / LICENCE\nMotor REG: AB12 CDE\nDriving Licence Type: Full UK\n\nINSURANCE INFORMATION\nExisting Insurance Policy: Yes\nPolicy Type: Private Car\nPolicy Cover: Comprehensive\nPolicy Excess: £350\nMonthly Amount Paid: £75\nYearly Amount Paid: Not provided\nTotal Policy Cost: £900\nPolicy Start Date: 2026-01-01\nPolicy End Date: 2026-12-31\nCurrent Insurer: Synthetic Insurer\nNo Claim Bonus: 5 years\nAdditional Driver: No\nAdditional Cover: Breakdown, Legal cover\n\nRECENT QUOTATION\nRecent quotation supplied: Yes\nQuotation Date: 2026-09-20\nQuotation Amount: £810\n\nRENEWAL / CONTACT\nRenewal / Future Start Date: 2026-10-20\nAuthorised to Contact: Yes\nReferral Code: REF-SYN-TEST\nCustomer Note: Synthetic end-to-end test generated from MIQOS CIRF-1.1.\n\nACKNOWLEDGEMENTS\nPrivacy notice acknowledged: Yes\nPrivacy notice version: CIRF-PRIVACY-1.0\nService contact authorised: Yes\n\nINTERIM ROUTING NOTICE\nThis message was generated by the MIQOS Customer Information Request\nForm during the interim email-routing phase. It has not yet been\nwritten to the MIQOS production database.",
        },
      },
    });
    assert.equal(first.statusCode,201);
    const firstResult=first.json();
    assert.equal(firstResult.disposition,"PROCESSED");
    assert.equal(firstResult.gmailLabel,"MIQOS/Intake/Processed");
    assert.match(firstResult.result.customerId,/^CUS-SYN-CXM-/);
    assert.equal(firstResult.result.deduplicated,false);

    const second=await app.inject({
      method:"POST",
      url:"/admin/cxm/intake/gmail-event",
      headers:{"x-miqo-synthetic-admin":"CXM-SYN-BRIDGE-TEST"},
      payload:{
        provider:"gmail",
        eventId:"BRIDGE-REHEARSAL-1a0db157c351ce3c",
        mailbox:"miqos.new@gmail.com",
        synthetic:true,
        message:{
          id:"1a0db157c351ce3c",
          threadId:"1a0db157c351ce3c",
          receivedAt:"2026-09-26T00:20:11Z",
          subject:"[MIQOS NEW CUSTOMER] Synthetic Test Customer | 2026-10-20",
          body:"MIQOS — New Customer Information Request\n\nSubmission ID: SUB-SYN-FORM-TEST-002\nForm version: CIRF-1.1\nSubmitted by customer: Synthetic Test Customer\n\nCUSTOMER DETAILS\nFull Name: Synthetic Test Customer\nEmail: synthetic.customer@example.test\nMobile: 07123456789\nAddress: 1 Synthetic Street\nCity: London\nPostcode: E20 1EJ\n\nMOTOR / LICENCE\nMotor REG: AB12 CDE\nDriving Licence Type: Full UK\n\nINSURANCE INFORMATION\nExisting Insurance Policy: Yes\nPolicy Type: Private Car\nPolicy Cover: Comprehensive\nPolicy Excess: £350\nMonthly Amount Paid: £75\nYearly Amount Paid: Not provided\nTotal Policy Cost: £900\nPolicy Start Date: 2026-01-01\nPolicy End Date: 2026-12-31\nCurrent Insurer: Synthetic Insurer\nNo Claim Bonus: 5 years\nAdditional Driver: No\nAdditional Cover: Breakdown, Legal cover\n\nRECENT QUOTATION\nRecent quotation supplied: Yes\nQuotation Date: 2026-09-20\nQuotation Amount: £810\n\nRENEWAL / CONTACT\nRenewal / Future Start Date: 2026-10-20\nAuthorised to Contact: Yes\nReferral Code: REF-SYN-TEST\nCustomer Note: Synthetic duplicate-identity bridge rehearsal from\nMIQOS CIRF-1.1.\n\nACKNOWLEDGEMENTS\nPrivacy notice acknowledged: Yes\nPrivacy notice version: CIRF-PRIVACY-1.0\nService contact authorised: Yes\n\nINTERIM ROUTING NOTICE\nThis message was generated by the MIQOS Customer Information Request\nForm during the interim email-routing phase. It has not yet been\nwritten to the MIQOS production database.",
        },
      },
    });
    assert.equal(second.statusCode,200);
    const secondResult=second.json();
    assert.equal(secondResult.disposition,"DUPLICATE");
    assert.equal(secondResult.gmailLabel,"MIQOS/Intake/Duplicate");
    assert.equal(secondResult.result.customerId,firstResult.result.customerId);
    assert.equal(secondResult.result.duplicateReason,"IDENTITY_FINGERPRINT");

    const pool=createPool();
    try{
      const persisted=await pool.query(
        `SELECT source_message_id,customer_id,processing_status
           FROM customer_intake_submission
          WHERE source_message_id=ANY($1::text[])
          ORDER BY received_at`,
        [["1a0db12187f1eb7f","1a0db157c351ce3c"]]
      );
      assert.equal(persisted.rowCount,2);
      assert.equal(persisted.rows[0].customer_id,firstResult.result.customerId);
      assert.equal(persisted.rows[1].customer_id,firstResult.result.customerId);
      assert.equal(persisted.rows[0].processing_status,"ACCEPTED");
      assert.equal(persisted.rows[1].processing_status,"DUPLICATE_MATCHED");

      const identity=await pool.query(
        "SELECT customer_id,customer_status FROM customer_intake_identity WHERE customer_id=$1",
        [firstResult.result.customerId]
      );
      assert.equal(identity.rowCount,1);

      const outbox=await pool.query(
        "SELECT count(*)::int AS n FROM customer_notification_outbox WHERE customer_id=$1 AND status='PENDING'",
        [firstResult.result.customerId]
      );
      assert.equal(outbox.rows[0].n,2);
    }finally{await pool.end();}
  }finally{
    await app.close();
    if(previousAdminKey===undefined)delete process.env.MIQO_SYNTHETIC_ADMIN_KEY;
    else process.env.MIQO_SYNTHETIC_ADMIN_KEY=previousAdminKey;
  }
});
