import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { createPool } from "../../../packages/db/src/client.ts";
import { deriveCustomerIntakeStatus, parseStructuredCustomerIntakeEmail, processCustomerIntakeEmail, refreshDueCustomerIntakeLifecycle } from "../src/customer-intake-service.ts";
import { ConflictError, ValidationError } from "../src/errors.ts";
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
