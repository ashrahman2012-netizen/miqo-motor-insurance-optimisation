import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {adminHeaders} from "./admin-auth-test-helper.ts";

const {Client}=pg;

async function reset(){
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  await client.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await client.end();
}

test("DB-G7-R1 removes legacy Admin evidence aliases and fails closed on protected routes",async()=>{
  await reset();
  const app=await buildApp();

  const legacyAliases=[
    "/admin/profiles/PRO-SYN-NOT-USED",
    "/admin/profile-versions/RPV-SYN-NOT-USED",
    "/admin/audit?profileId=PRO-SYN-NOT-USED",
    "/admin/selections/SEL-SYN-NOT-USED/trace",
    "/admin/selections/SEL-SYN-NOT-USED/sp4-trace",
    "/quote-requests/QREQ-SYN-NOT-USED/raw-response",
  ];
  for(const url of legacyAliases){
    const response=await app.inject({method:"GET",url});
    assert.equal(response.statusCode,404,url+" must not expose a legacy Admin evidence alias");
  }

  const protectedRoutes=[
    "/desktop-admin/session",
    "/desktop-admin/profiles/PRO-SYN-NOT-USED",
    "/desktop-admin/profile-versions/RPV-SYN-NOT-USED",
    "/desktop-admin/audit?profileId=PRO-SYN-NOT-USED",
    "/desktop-admin/profiles/PRO-SYN-NOT-USED/discrepancies",
    "/desktop-admin/selections/SEL-SYN-NOT-USED/trace",
    "/desktop-admin/selections/SEL-SYN-NOT-USED/sp4-trace",
    "/desktop-admin/quote-requests/QREQ-SYN-NOT-USED/raw-response",
  ];
  for(const url of protectedRoutes){
    const response=await app.inject({method:"GET",url});
    assert.equal(response.statusCode,401,url+" must reject anonymous access");
  }

  const limited=await adminHeaders("limited");
  assert.equal((await app.inject({
    method:"GET",url:"/desktop-admin/audit?profileId=PRO-SYN-NOT-USED",headers:limited,
  })).statusCode,403);
  assert.equal((await app.inject({
    method:"GET",url:"/desktop-admin/selections/SEL-SYN-NOT-USED/sp4-trace",headers:limited,
  })).statusCode,403);
  assert.equal((await app.inject({
    method:"GET",url:"/desktop-admin/quote-requests/QREQ-SYN-NOT-USED/raw-response",headers:limited,
  })).statusCode,403);

  const session=await app.inject({method:"GET",url:"/desktop-admin/session",headers:await adminHeaders()});
  assert.equal(session.statusCode,200);
  const descriptor=JSON.parse(session.body);
  assert.equal(descriptor.environment,"SYNTHETIC");
  assert.ok(descriptor.permissions.includes("miqos.admin.audit.read"));
  assert.ok(descriptor.permissions.includes("miqos.admin.raw-evidence.read"));

  await app.close();
});

test("DB-G7-R1 keeps the customer discrepancy contract narrower than Admin evidence",async()=>{
  await reset();
  const app=await buildApp();
  const created=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);

  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  await client.query(
    "INSERT INTO discrepancy(discrepancy_id,risk_profile_version_id,field_id,declared_value_json,verified_value_json,state,blocking) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)",
    ["DISC-R1-001",created.versionId,"annual_mileage","8000","9000","OPEN",true],
  );
  await client.end();

  const customer=await app.inject({
    method:"GET",url:"/profiles/"+created.profileId+"/discrepancies",
  });
  assert.equal(customer.statusCode,200);
  const customerItem=JSON.parse(customer.body).items[0];
  assert.deepEqual(
    Object.keys(customerItem).sort(),
    ["blocking","declaredValueJson","discrepancyId","fieldId","state","verifiedValueJson"].sort(),
  );
  assert.equal("riskProfileVersionId" in customerItem,false);
  assert.equal("createdAt" in customerItem,false);

  const admin=await app.inject({
    method:"GET",
    url:"/desktop-admin/profiles/"+created.profileId+"/discrepancies",
    headers:await adminHeaders(),
  });
  assert.equal(admin.statusCode,200);
  const adminItem=JSON.parse(admin.body).items[0];
  assert.equal(adminItem.riskProfileVersionId,created.versionId);
  assert.equal(typeof adminItem.createdAt,"string");

  await app.close();
});
