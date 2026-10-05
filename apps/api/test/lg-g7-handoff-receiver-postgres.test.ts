import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildApp } from "../src/server.ts";
const {Client}=pg;

const key="synthetic-lg-g7-test";

function payload(overrides:Record<string,unknown>={}){
  return {
    contractVersion:"lg-g7-handoff.v1",
    handoffId:"LGG7-client-accepted-syn-001",
    acceptedClientId:"ACQ-CLIENT-client-accepted-syn-001",
    acceptanceEventId:"client-accepted-syn-001",
    acceptedAt:"2026-10-05T19:30:00.000Z",
    acquisitionLeadId:"lead-syn-lg-g7-001",
    campaignId:"campaign-syn-lg-g7-001",
    source:"acquisition:synthetic-contract-test",
    permissionBasis:"TEST_SYNTHETIC",
    lifecycleState:"ACCEPTED_CLIENT",
    ...overrides,
  };
}

async function client(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  return c;
}

async function reset(){
  const c=await client();
  try{await c.query("TRUNCATE acquisition_handoff_receipt");}
  finally{await c.end();}
}

async function runWithKey(fn:()=>Promise<void>){
  const prior=process.env.MIQO_SYNTHETIC_HANDOFF_KEY;
  process.env.MIQO_SYNTHETIC_HANDOFF_KEY=key;
  try{await fn();}
  finally{
    if(prior===undefined)delete process.env.MIQO_SYNTHETIC_HANDOFF_KEY;
    else process.env.MIQO_SYNTHETIC_HANDOFF_KEY=prior;
  }
}

const headers=()=>({"x-miqo-synthetic-handoff":key,"idempotency-key":"LGG7-client-accepted-syn-001"});

test("LG-G7 receiver accepts once, replays identically, and creates no quotation profile state",async()=>{
  await reset();
  await runWithKey(async()=>{
    const c=await client();
    const before=(await c.query("SELECT (SELECT count(*) FROM profile)::int profiles,(SELECT count(*) FROM risk_profile_version)::int versions,(SELECT count(*) FROM canonical_field_value)::int facts")).rows[0];
    await c.end();

    const app=await buildApp();
    try{
      const first=await app.inject({method:"POST",url:"/acquisition/handoffs",headers:headers(),payload:payload()});
      assert.equal(first.statusCode,201,first.body);
      const accepted=first.json();
      assert.equal(accepted.contractVersion,"lg-g7-handoff-response.v1");
      assert.equal(accepted.handoffId,"LGG7-client-accepted-syn-001");
      assert.equal(accepted.outcome,"ACCEPTED");
      assert.match(accepted.receiverReference,/^MIQOS-RCV-SYN-/);
      assert.match(accepted.auditReference,/^MIQOS-AUD-SYN-/);

      const replay=await app.inject({method:"POST",url:"/acquisition/handoffs",headers:headers(),payload:payload()});
      assert.equal(replay.statusCode,200,replay.body);
      assert.deepEqual(replay.json(),accepted);

      const persisted=await client();
      try{
        const receipt=await persisted.query("SELECT request_fingerprint,permission_basis,synthetic,receiver_reference,audit_reference FROM acquisition_handoff_receipt WHERE handoff_id=$1",["LGG7-client-accepted-syn-001"]);
        assert.equal(receipt.rowCount,1);
        assert.match(receipt.rows[0].request_fingerprint,/^[0-9a-f]{64}$/);
        assert.equal(receipt.rows[0].permission_basis,"TEST_SYNTHETIC");
        assert.equal(receipt.rows[0].synthetic,true);
        assert.equal(receipt.rows[0].receiver_reference,accepted.receiverReference);
        assert.equal(receipt.rows[0].audit_reference,accepted.auditReference);
        const after=(await persisted.query("SELECT (SELECT count(*) FROM profile)::int profiles,(SELECT count(*) FROM risk_profile_version)::int versions,(SELECT count(*) FROM canonical_field_value)::int facts")).rows[0];
        assert.deepEqual(after,before);
      }finally{await persisted.end();}
    }finally{await app.close();}
  });
});

test("LG-G7 receiver rejects conflicting replay without rewriting the receipt",async()=>{
  await reset();
  await runWithKey(async()=>{
    const app=await buildApp();
    try{
      const first=await app.inject({method:"POST",url:"/acquisition/handoffs",headers:headers(),payload:payload()});
      assert.equal(first.statusCode,201,first.body);
      const conflict=await app.inject({method:"POST",url:"/acquisition/handoffs",headers:headers(),payload:payload({source:"changed:synthetic-source"})});
      assert.equal(conflict.statusCode,409,conflict.body);
      assert.equal(conflict.json().error,"HANDOFF_IDEMPOTENCY_CONFLICT");
    }finally{await app.close();}
  });
  const c=await client();
  try{assert.equal((await c.query("SELECT count(*)::int AS n FROM acquisition_handoff_receipt")).rows[0].n,1);}
  finally{await c.end();}
});

test("LG-G7 receiver keeps real-data permission bases closed",async()=>{
  await reset();
  await runWithKey(async()=>{
    const app=await buildApp();
    try{
      const response=await app.inject({method:"POST",url:"/acquisition/handoffs",headers:headers(),payload:payload({permissionBasis:"CONSENT"})});
      assert.equal(response.statusCode,409,response.body);
      assert.equal(response.json().error,"HANDOFF_REAL_DATA_GATE_CLOSED");
    }finally{await app.close();}
  });
  const c=await client();
  try{assert.equal((await c.query("SELECT count(*)::int AS n FROM acquisition_handoff_receipt")).rows[0].n,0);}
  finally{await c.end();}
});

test("LG-G7 receiver rejects undeclared fields before persistence",async()=>{
  await reset();
  await runWithKey(async()=>{
    const app=await buildApp();
    try{
      const response=await app.inject({method:"POST",url:"/acquisition/handoffs",headers:headers(),payload:payload({email:"synthetic@example.test"})});
      assert.equal(response.statusCode,422,response.body);
      assert.equal(response.json().error,"INVALID_LG_G7_HANDOFF");
    }finally{await app.close();}
  });
  const c=await client();
  try{assert.equal((await c.query("SELECT count(*)::int AS n FROM acquisition_handoff_receipt")).rows[0].n,0);}
  finally{await c.end();}
});


test("LG-G7 receiver fails closed when its dedicated handoff key is absent or wrong",async()=>{
  await reset();
  const prior=process.env.MIQO_SYNTHETIC_HANDOFF_KEY;
  delete process.env.MIQO_SYNTHETIC_HANDOFF_KEY;
  const app=await buildApp();
  try{
    const unavailable=await app.inject({method:"POST",url:"/acquisition/handoffs",payload:payload()});
    assert.equal(unavailable.statusCode,503,unavailable.body);
    assert.equal(unavailable.json().error,"synthetic_handoff_gate_unconfigured");
  }finally{
    await app.close();
    if(prior===undefined)delete process.env.MIQO_SYNTHETIC_HANDOFF_KEY;
    else process.env.MIQO_SYNTHETIC_HANDOFF_KEY=prior;
  }

  await runWithKey(async()=>{
    const protectedApp=await buildApp();
    try{
      const denied=await protectedApp.inject({
        method:"POST",
        url:"/acquisition/handoffs",
        headers:{"x-miqo-synthetic-handoff":"incorrect-test-value"},
        payload:payload(),
      });
      assert.equal(denied.statusCode,401,denied.body);
      assert.equal(denied.json().error,"synthetic_handoff_access_required");
    }finally{await protectedApp.close();}
  });

  const c=await client();
  try{assert.equal((await c.query("SELECT count(*)::int AS n FROM acquisition_handoff_receipt")).rows[0].n,0);}
  finally{await c.end();}
});


test("LG-G7 receiver requires an HTTP idempotency key matching handoffId",async()=>{
  await reset();
  await runWithKey(async()=>{
    const app=await buildApp();
    try{
      const missing=await app.inject({
        method:"POST",
        url:"/acquisition/handoffs",
        headers:{"x-miqo-synthetic-handoff":key},
        payload:payload(),
      });
      assert.equal(missing.statusCode,400,missing.body);
      assert.equal(missing.json().error,"handoff_idempotency_key_required");

      const mismatch=await app.inject({
        method:"POST",
        url:"/acquisition/handoffs",
        headers:{"x-miqo-synthetic-handoff":key,"idempotency-key":"LGG7-other"},
        payload:payload(),
      });
      assert.equal(mismatch.statusCode,409,mismatch.body);
      assert.equal(mismatch.json().error,"HANDOFF_IDEMPOTENCY_KEY_MISMATCH");
    }finally{await app.close();}
  });

  const c=await client();
  try{assert.equal((await c.query("SELECT count(*)::int AS n FROM acquisition_handoff_receipt")).rows[0].n,0);}
  finally{await c.end();}
});
