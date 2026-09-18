import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildApp } from "../src/server.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function seedLocked(app:any){
  const created=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-001"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    assert.equal((await app.inject({method:"PUT",url:`/profile-versions/${created.versionId}/facts/${fieldId}`,payload:{value}})).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:`/profiles/${created.profileId}/lock`})).statusCode,200);
  return created;
}

async function seedGenerated(app:any){
  const p=await seedLocked(app);
  assert.equal((await app.inject({
    method:"POST",
    url:`/profile-versions/${p.versionId}/optimisation-preferences`,
    payload:{payment_structure:"ANNUAL",voluntary_excess:500},
  })).statusCode,200);
  const generated=JSON.parse((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`})).body);
  return {...p,scenarioId:generated.items[0].scenarioId};
}

const quotePayload={providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"};

test("SP2 pre-quote integrity prepares exact deterministic QuoteRequest lineage without provider execution",async()=>{
  await reset();
  const app=await buildApp();
  const p=await seedGenerated(app);

  const first=await app.inject({method:"POST",url:`/scenarios/${p.scenarioId}/quote-requests`,payload:quotePayload});
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.riskProfileVersionId,p.versionId);
  assert.equal(one.scenarioId,p.scenarioId);
  assert.equal(one.providerKey,"MOCK-PROVIDER-001");
  assert.equal(one.channel,"DIRECT_SYNTHETIC");

  const second=await app.inject({method:"POST",url:`/scenarios/${p.scenarioId}/quote-requests`,payload:quotePayload});
  assert.equal(second.statusCode,200);
  const two=JSON.parse(second.body);
  assert.equal(two.created,false);
  assert.equal(two.quoteRequestId,one.quoteRequestId);
  assert.equal(two.quoteRunId,one.quoteRunId);

  const fetched=await app.inject({method:"GET",url:`/quote-requests/${one.quoteRequestId}`});
  assert.equal(fetched.statusCode,200);
  assert.equal(JSON.parse(fetched.body).riskProfileVersionId,p.versionId);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const lineage=(await c.query(
    "SELECT qr.risk_profile_version_id,q.scenario_id,q.provider_key,q.channel_key FROM quote_request q JOIN quote_run qr ON qr.quote_run_id=q.quote_run_id WHERE q.quote_request_id=$1",
    [one.quoteRequestId],
  )).rows[0];
  assert.deepEqual(lineage,{
    risk_profile_version_id:p.versionId,
    scenario_id:p.scenarioId,
    provider_key:"MOCK-PROVIDER-001",
    channel_key:"DIRECT_SYNTHETIC",
  });
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM quote_request")).rows[0].count),1);
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM quote_run")).rows[0].count),1);
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM raw_provider_response")).rows[0].count),0);
  await assert.rejects(()=>c.query("UPDATE quote_request SET mapping_version='tampered' WHERE quote_request_id=$1",[one.quoteRequestId]),/QUOTE_REQUEST_IMMUTABLE/);
  await c.end();
  await app.close();
});

test("SP2 blocking discrepancy records integrity evidence and creates no downstream quote/provider state",async()=>{
  await reset();
  const app=await buildApp();
  const p=await seedGenerated(app);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query(
    "INSERT INTO discrepancy(discrepancy_id,risk_profile_version_id,field_id,declared_value_json,verified_value_json,state,blocking) VALUES($1,$2,'annual_mileage','8000'::jsonb,'7000'::jsonb,'BLOCKING',true)",
    ["DISC-PREQUOTE-001",p.versionId],
  );
  await c.end();

  const response=await app.inject({method:"POST",url:`/scenarios/${p.scenarioId}/quote-requests`,payload:quotePayload});
  assert.equal(response.statusCode,409);
  const body=JSON.parse(response.body);
  assert.equal(body.error,"PRE_QUOTE_INTEGRITY_BLOCKED");
  assert.ok(body.signals.some((signal:any)=>signal.ruleId==="UNRESOLVED_DISCREPANCY"));

  const signals=JSON.parse((await app.inject({method:"GET",url:`/scenarios/${p.scenarioId}/integrity-signals`})).body);
  assert.ok(signals.items.some((signal:any)=>signal.ruleId==="UNRESOLVED_DISCREPANCY" && signal.blocking===true));

  const check=new Client({connectionString:process.env.DATABASE_URL});
  await check.connect();
  assert.equal(Number((await check.query("SELECT count(*) AS count FROM quote_run")).rows[0].count),0);
  assert.equal(Number((await check.query("SELECT count(*) AS count FROM quote_request")).rows[0].count),0);
  assert.equal(Number((await check.query("SELECT count(*) AS count FROM raw_provider_response")).rows[0].count),0);
  await check.end();
  await app.close();
});

test("SP2 pre-quote integrity blocks a scenario whose source profile version becomes SUPERSEDED",async()=>{
  await reset();
  const app=await buildApp();
  const p=await seedGenerated(app);

  assert.equal((await app.inject({method:"POST",url:`/profiles/${p.profileId}/corrections`,payload:{fieldId:"annual_mileage",value:6000}})).statusCode,201);
  await app.inject({method:"POST",url:`/profiles/${p.profileId}/validate`});
  assert.equal((await app.inject({method:"POST",url:`/profiles/${p.profileId}/lock`})).statusCode,200);

  const response=await app.inject({method:"POST",url:`/scenarios/${p.scenarioId}/quote-requests`,payload:quotePayload});
  assert.equal(response.statusCode,409);
  const body=JSON.parse(response.body);
  assert.ok(body.signals.some((signal:any)=>signal.ruleId==="PROFILE_VERSION_SUPERSEDED"));

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM quote_request")).rows[0].count),0);
  await c.end();
  await app.close();
});

test("SP2 pre-quote integrity blocks non-generated and non-locked scenario input",async()=>{
  await reset();
  const app=await buildApp();
  const p=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("INSERT INTO scenario(scenario_id,risk_profile_version_id,status) VALUES('SCN-PREQUOTE-DRAFT',$1,'READY')",[p.versionId]);
  await c.end();

  const response=await app.inject({method:"POST",url:"/scenarios/SCN-PREQUOTE-DRAFT/quote-requests",payload:quotePayload});
  assert.equal(response.statusCode,409);
  const rules=JSON.parse(response.body).signals.map((signal:any)=>signal.ruleId);
  assert.ok(rules.includes("PROFILE_NOT_LOCKED"));
  assert.ok(rules.includes("MISSING_REQUIRED_QUOTE_INPUT"));
  await app.close();
});

test("SP2 PostgreSQL quote lineage guard rejects direct cross-profile QuoteRequest bypass",async()=>{
  await reset();
  const app=await buildApp();
  const first=await seedGenerated(app);
  const second=await seedLocked(app);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("INSERT INTO quote_run(quote_run_id,risk_profile_version_id) VALUES('QRUN-CROSS',$1)",[second.versionId]);
  await assert.rejects(()=>c.query(
    "INSERT INTO quote_request(quote_request_id,quote_run_id,scenario_id,provider_key,channel_key,adapter_version,mapping_version,request_fingerprint) VALUES('QREQ-CROSS','QRUN-CROSS',$1,'MOCK-PROVIDER-001','DIRECT_SYNTHETIC','mock-adapter-v1','mock-mapping-v1','cross-profile')",
    [first.scenarioId],
  ),/QUOTE_LINEAGE_MISMATCH/);
  await c.end();
  await app.close();
});
