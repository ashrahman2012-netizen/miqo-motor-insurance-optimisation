import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";

const {Client}=pg;

async function reset(){
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  await client.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await client.end();
}

test("DB-G7-R1 removes legacy Admin evidence aliases and rejects anonymous protected reads",async()=>{
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

  await app.inject({method:"POST",url:"/profiles/"+created.profileId+"/validate"});
  const customerSnapshot=await app.inject({
    method:"GET",url:"/profiles/"+created.profileId+"/snapshot",
  });
  assert.equal(customerSnapshot.statusCode,200);
  const customerAudit=JSON.parse(customerSnapshot.body).audit;
  assert.equal(customerAudit.length,1);
  assert.equal(customerAudit[0].eventType,"profile_validated");
  assert.deepEqual(
    Object.keys(customerAudit[0]).sort(),
    ["entityId","eventType","metadataJson","occurredAt"].sort(),
  );
  assert.equal("auditEventId" in customerAudit[0],false);
  assert.equal("traceId" in customerAudit[0],false);
  assert.equal("entityType" in customerAudit[0],false);

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

  const storedClient=new Client({connectionString:process.env.DATABASE_URL});
  await storedClient.connect();
  const stored=(await storedClient.query(
    "SELECT risk_profile_version_id,created_at FROM discrepancy WHERE discrepancy_id=$1",
    ["DISC-R1-001"],
  )).rows[0];
  assert.equal(stored.risk_profile_version_id,created.versionId);
  assert.ok(stored.created_at);
  await storedClient.end();

  await app.close();
});
