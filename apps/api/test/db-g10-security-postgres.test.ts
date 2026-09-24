import test from "node:test";
import assert from "node:assert/strict";
import {buildApp,internalErrorPayload} from "../src/server.ts";

test("DB-G10.2 emits security headers and correlation id",async()=>{
  const app=await buildApp();
  const response=await app.inject({method:"GET",url:"/health"});
  assert.equal(response.statusCode,200);
  assert.ok(response.headers["x-request-id"]);
  assert.equal(response.headers["x-content-type-options"],"nosniff");
  assert.equal(response.headers["x-frame-options"],"DENY");
  assert.equal(response.headers["referrer-policy"],"no-referrer");
  assert.match(String(response.headers["content-security-policy"]),/default-src 'none'/);
  assert.equal(response.headers["cache-control"],"no-store");
  await app.close();
});

test("DB-G10.2 rejects hostile browser origins",async()=>{
  const app=await buildApp();
  const response=await app.inject({method:"GET",url:"/health",headers:{origin:"https://attacker.invalid"}});
  assert.equal(response.statusCode,403);
  assert.equal(JSON.parse(response.body).error,"origin_not_allowed");
  await app.close();
});

test("DB-G10.2 enforces the request body limit before route execution",async()=>{
  const app=await buildApp();
  const response=await app.inject({
    method:"POST",url:"/profiles",
    headers:{"content-type":"application/json"},
    payload:{padding:"x".repeat(140_000)}
  });
  assert.equal(response.statusCode,413);
  await app.close();
});

test("DB-G10.2 rate limits mutation bursts deterministically",async()=>{
  const previous=process.env.MIQO_RATE_LIMIT_MAX;
  process.env.MIQO_RATE_LIMIT_MAX="2";
  const app=await buildApp();
  assert.equal((await app.inject({method:"POST",url:"/profiles"})).statusCode,201);
  assert.equal((await app.inject({method:"POST",url:"/profiles"})).statusCode,201);
  const blocked=await app.inject({method:"POST",url:"/profiles"});
  assert.equal(blocked.statusCode,429);
  assert.equal(JSON.parse(blocked.body).error,"rate_limit_exceeded");
  await app.close();
  if(previous===undefined)delete process.env.MIQO_RATE_LIMIT_MAX; else process.env.MIQO_RATE_LIMIT_MAX=previous;
});

test("DB-G10.2 rejects unexpected properties on factual writes",async()=>{
  const app=await buildApp();
  const response=await app.inject({
    method:"PUT",url:"/profile-versions/DOES-NOT-MATTER/facts/annual_mileage",
    payload:{value:8000,unexpected:"blocked"}
  });
  assert.equal(response.statusCode,422);
  await app.close();
});

test("DB-G10.2 generic internal error payload cannot disclose exception text",()=>{
  const payload=internalErrorPayload("req-test");
  assert.deepEqual(payload,{error:"internal_error",requestId:"req-test"});
  assert.equal("message" in payload,false);
});


test("DB-G10.4 admin API gate fails closed when unconfigured",async()=>{
  const previous=process.env.MIQO_SYNTHETIC_ADMIN_KEY;
  delete process.env.MIQO_SYNTHETIC_ADMIN_KEY;
  const app=await buildApp();
  const response=await app.inject({method:"GET",url:"/admin/audit?profileId=NONE"});
  assert.equal(response.statusCode,503);
  assert.equal(JSON.parse(response.body).error,"synthetic_admin_gate_unconfigured");
  await app.close();
  if(previous!==undefined)process.env.MIQO_SYNTHETIC_ADMIN_KEY=previous;
});

test("DB-G10.4 admin API gate rejects missing marker and accepts configured synthetic marker",async()=>{
  const previous=process.env.MIQO_SYNTHETIC_ADMIN_KEY;
  process.env.MIQO_SYNTHETIC_ADMIN_KEY="DB-G10-SYNTHETIC-ADMIN";
  const app=await buildApp();
  const denied=await app.inject({method:"GET",url:"/admin/audit?profileId=NONE"});
  assert.equal(denied.statusCode,401);
  assert.equal(JSON.parse(denied.body).error,"synthetic_admin_access_required");
  const allowed=await app.inject({
    method:"GET",url:"/admin/audit?profileId=NONE",
    headers:{"x-miqo-synthetic-admin":"DB-G10-SYNTHETIC-ADMIN"}
  });
  assert.equal(allowed.statusCode,200);
  assert.deepEqual(JSON.parse(allowed.body).items,[]);
  await app.close();
  if(previous===undefined)delete process.env.MIQO_SYNTHETIC_ADMIN_KEY; else process.env.MIQO_SYNTHETIC_ADMIN_KEY=previous;
});
