import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildApp } from "../src/server.ts";
const {Client}=pg;

const payload=(clientSubmissionId:string)=>({
  schemaVersion:"miqos.customer-information-request.v1",
  formVersion:"CIRF-1.2.2",
  source:"PUBLIC_CUSTOMER_INFORMATION_REQUEST",
  clientSubmissionId,
  customer:{fullName:"Synthetic Direct Customer",address:"1 Synthetic Street",city:"London",postcode:"E20 1EJ",email:"synthetic.direct@example.test",mobile:"07123456789"},
  motor:{registration:"AB12CDE",drivingLicenceType:"Full UK"},
  insurance:{
    existingInsurancePolicy:true,policyType:"Private Car",policyCover:"Comprehensive",policyExcess:350,
    monthlyAmountPaid:75,yearlyAmountPaid:null,totalPolicyCost:900,policyStartDate:"2026-01-01",policyEndDate:"2026-12-31",
    currentInsurer:"Synthetic Insurer",noClaimBonus:"5 years",additionalDriver:"No",additionalCover:["Breakdown","Legal cover"]
  },
  recentQuotation:{supplied:true,quotationDate:"2026-09-20",quotationAmount:810},
  renewalOrFutureStartDate:"2026-10-20",
  authorisedToContact:true,
  referralCode:"REF-SYN-DIRECT",
  customerNote:"Synthetic direct submission gateway test.",
  acknowledgements:{privacyNoticeAcknowledged:true,privacyNoticeVersion:"CIRF-PRIVACY-1.0",serviceContactAuthorised:true},
  clientContext:{locale:"en-GB",timezone:"Europe/London"},
});

function multipart(clientSubmissionId:string){
  const boundary="----MIQOSTest"+clientSubmissionId.replace(/[^A-Z0-9]/gi,"");
  const chunks:Buffer[]=[];
  const add=(name:string,value:Buffer|string,filename?:string,contentType?:string)=>{
    chunks.push(Buffer.from("--"+boundary+"\r\n"));
    chunks.push(Buffer.from("Content-Disposition: form-data; name=\""+name+"\""+(filename?"; filename=\""+filename+"\"":"")+"\r\n"));
    if(contentType)chunks.push(Buffer.from("Content-Type: "+contentType+"\r\n"));
    chunks.push(Buffer.from("\r\n"));
    chunks.push(Buffer.isBuffer(value)?value:Buffer.from(value));
    chunks.push(Buffer.from("\r\n"));
  };
  add("payload",JSON.stringify(payload(clientSubmissionId)),"submission.json","application/json");
  add("html","<!doctype html><html><body><h1>MIQOS</h1><p>"+clientSubmissionId+"</p></body></html>","submission.html","text/html");
  add("excel",Buffer.from("synthetic-xls-content"),"submission.xls","application/vnd.ms-excel");
  add("subject","[MIQOS NEW CUSTOMER] Synthetic Direct Customer | 2026-10-20");
  add("formVersion","CIRF-1.2.2");
  add("renderPdf","true");
  chunks.push(Buffer.from("--"+boundary+"--\r\n"));
  return {body:Buffer.concat(chunks),contentType:"multipart/form-data; boundary="+boundary};
}

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
  await c.query("TRUNCATE customer_form_delivery, customer_notification_outbox, customer_lifecycle_event, customer_intake_submission, customer_intake_identity RESTART IDENTITY CASCADE");
  await c.end();
}

async function withEnv(run:()=>Promise<void>){
  const previous={enabled:process.env.MIQO_FORM_SUBMISSION_ENABLED,file:process.env.MIQO_ALLOW_FILE_ORIGIN};
  process.env.MIQO_FORM_SUBMISSION_ENABLED="true";
  process.env.MIQO_ALLOW_FILE_ORIGIN="true";
  try{await run();}finally{
    if(previous.enabled===undefined)delete process.env.MIQO_FORM_SUBMISSION_ENABLED;else process.env.MIQO_FORM_SUBMISSION_ENABLED=previous.enabled;
    if(previous.file===undefined)delete process.env.MIQO_ALLOW_FILE_ORIGIN;else process.env.MIQO_ALLOW_FILE_ORIGIN=previous.file;
  }
}

test("CXM direct form route commits intake, generates PDF, delivers attachments, and is idempotent",async()=>{
  await reset();
  await withEnv(async()=>{
    let sends=0;
    const app=await buildApp({formSubmissionDependencies:{
      renderPdf:async html=>{assert.match(html.toString("utf8"),/MIQOS/);return Buffer.from("%PDF-1.4\nsynthetic\n");},
      sendEmail:async input=>{
        sends+=1;
        assert.equal(input.attachments.length,2);
        assert.equal(input.attachments[0].contentType,"application/pdf");
        assert.equal(input.attachments[1].contentType,"application/vnd.ms-excel");
        return {provider:"gmail",messageId:"GMAIL-SYN-DIRECT-"+sends,recipient:"miqos.new@gmail.com"};
      },
    }});
    try{
      const firstBody=multipart("SUB-SYN-DIRECT-001");
      const first=await app.inject({method:"POST",url:"/api/v1/customer-information-requests/submit",headers:{
        origin:"null","content-type":firstBody.contentType,"x-miqos-form-version":"CIRF-1.2.2","idempotency-key":"SUB-SYN-DIRECT-001"
      },payload:firstBody.body});
      assert.equal(first.statusCode,201,first.body);
      const firstResult=first.json();
      assert.equal(firstResult.ok,true);
      assert.equal(firstResult.emailAccepted,true);
      assert.equal(firstResult.pdfGenerated,true);
      assert.equal(firstResult.idempotentReplay,false);
      assert.match(firstResult.customerId,/^CUS-SYN-CXM-/);
      assert.equal(sends,1);

      const replay=await app.inject({method:"POST",url:"/api/v1/customer-information-requests/submit",headers:{
        origin:"null","content-type":firstBody.contentType,"x-miqos-form-version":"CIRF-1.2.2","idempotency-key":"SUB-SYN-DIRECT-001"
      },payload:firstBody.body});
      assert.equal(replay.statusCode,200,replay.body);
      assert.equal(replay.json().customerId,firstResult.customerId);
      assert.equal(replay.json().idempotentReplay,true);
      assert.equal(sends,1);

      const duplicateBody=multipart("SUB-SYN-DIRECT-002");
      const duplicate=await app.inject({method:"POST",url:"/api/v1/customer-information-requests/submit",headers:{
        origin:"null","content-type":duplicateBody.contentType,"x-miqos-form-version":"CIRF-1.2.2","idempotency-key":"SUB-SYN-DIRECT-002"
      },payload:duplicateBody.body});
      assert.equal(duplicate.statusCode,201,duplicate.body);
      const duplicateResult=duplicate.json();
      assert.equal(duplicateResult.customerId,firstResult.customerId);
      assert.equal(duplicateResult.deduplicated,true);
      assert.equal(duplicateResult.duplicateReason,"IDENTITY_FINGERPRINT");
      assert.equal(sends,2);

      const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
      try{
        const submissions=await c.query("SELECT source_channel,source_mailbox,customer_id,processing_status FROM customer_intake_submission ORDER BY created_at");
        assert.equal(submissions.rowCount,2);
        assert.equal(submissions.rows[0].source_channel,"DIRECT_FORM");
        assert.equal(submissions.rows[0].source_mailbox,null);
        assert.equal(submissions.rows[0].processing_status,"ACCEPTED");
        assert.equal(submissions.rows[1].processing_status,"DUPLICATE_MATCHED");
        assert.equal(submissions.rows[0].customer_id,submissions.rows[1].customer_id);
        const deliveries=await c.query("SELECT email_delivery_status,pdf_generated,delivery_attempts,email_provider FROM customer_form_delivery ORDER BY created_at");
        assert.equal(deliveries.rowCount,2);
        assert.deepEqual(deliveries.rows.map((x:any)=>[x.email_delivery_status,x.pdf_generated,x.delivery_attempts,x.email_provider]),[["SENT",true,1,"gmail"],["SENT",true,1,"gmail"]]);
      }finally{await c.end();}
    }finally{await app.close();}
  });
});

test("CXM direct form retries failed Gmail delivery against the same committed submission",async()=>{
  await reset();
  await withEnv(async()=>{
    let sends=0;
    const app=await buildApp({formSubmissionDependencies:{
      renderPdf:async()=>Buffer.from("%PDF-1.4\nsynthetic\n"),
      sendEmail:async()=>{sends+=1;if(sends===1)throw new Error("synthetic Gmail outage");return {provider:"gmail",messageId:"GMAIL-SYN-RETRY",recipient:"miqos.new@gmail.com"};},
    }});
    try{
      const request=multipart("SUB-SYN-DIRECT-RETRY");
      const headers={origin:"null","content-type":request.contentType,"x-miqos-form-version":"CIRF-1.2.2","idempotency-key":"SUB-SYN-DIRECT-RETRY"};
      const failed=await app.inject({method:"POST",url:"/api/v1/customer-information-requests/submit",headers,payload:request.body});
      assert.equal(failed.statusCode,502,failed.body);
      assert.equal(failed.json().error,"FORM_EMAIL_DELIVERY_FAILED");

      const succeeded=await app.inject({method:"POST",url:"/api/v1/customer-information-requests/submit",headers,payload:request.body});
      assert.equal(succeeded.statusCode,200,succeeded.body);
      assert.equal(succeeded.json().idempotentReplay,true);
      assert.equal(sends,2);

      const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
      try{
        const counts=await c.query("SELECT (SELECT count(*) FROM customer_intake_submission)::int submissions,(SELECT count(*) FROM customer_form_delivery)::int deliveries");
        assert.deepEqual(counts.rows[0],{submissions:1,deliveries:1});
        const delivery=await c.query("SELECT email_delivery_status,delivery_attempts,email_provider_message_id FROM customer_form_delivery");
        assert.deepEqual(delivery.rows[0],{email_delivery_status:"SENT",delivery_attempts:2,email_provider_message_id:"GMAIL-SYN-RETRY"});
      }finally{await c.end();}
    }finally{await app.close();}
  });
});
