import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {ADMIN_PERMISSIONS,createAdminSecurity} from "../src/admin-security.ts";
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
    method:"GET",url:"/desktop-admin/profiles/PRO-SYN-NOT-USED",headers:limited,
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

test("DB-G7-R1 records sensitive raw-evidence access in the security audit",async()=>{
  const token=(await adminHeaders()).authorization;
  const logs:any[]=[];
  const request:any={
    headers:{authorization:token},
    method:"GET",
    routeOptions:{url:"/desktop-admin/quote-requests/:quoteRequestId/raw-response"},
    url:"/desktop-admin/quote-requests/QREQ-SYN-AUDIT/raw-response",
    miqoTraceId:"1234567890abcdef1234567890abcdef",
    log:{info:(event:any)=>logs.push(event)},
  };
  const reply:any={
    statusCode:200,
    code(status:number){this.statusCode=status;return this;},
    send(_body:any){return this;},
    header(_name:string,_value:string){return this;},
  };
  const security=createAdminSecurity({dataClassification:"SYNTHETIC"});
  const principal=await security.requirePermissions(
    request,reply,[ADMIN_PERMISSIONS.rawEvidenceRead],
    "raw-provider-response","QREQ-SYN-AUDIT",true,
  );
  assert.ok(principal);
  assert.equal(reply.statusCode,200);
  assert.ok(logs.some(event=>
    event.eventCode==="SECURITY_ACCESS"
      && event.permission===ADMIN_PERMISSIONS.rawEvidenceRead
      && event.outcome==="ALLOW"
      && event.reasonCode==="ADMIN_PERMISSION_ALLOWED"
      && event.sensitiveRead===true
      && event.resourceType==="raw-provider-response"
      && event.resourceId==="QREQ-SYN-AUDIT"
  ));
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
