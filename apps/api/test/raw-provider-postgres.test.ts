import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import pg from "pg";
import { buildApp } from "../src/server.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function prepare(app:any){
  const p=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-001"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    assert.equal((await app.inject({method:"PUT",url:`/profile-versions/${p.versionId}/facts/${fieldId}`,payload:{value}})).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:`/profiles/${p.profileId}/lock`})).statusCode,200);
  assert.equal((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{payment_structure:"ANNUAL",voluntary_excess:500}})).statusCode,200);
  const generated=JSON.parse((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`})).body);
  const scenarioId=generated.items[0].scenarioId;
  const prepared=JSON.parse((await app.inject({
    method:"POST",
    url:`/scenarios/${scenarioId}/quote-requests`,
    payload:{providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"},
  })).body);
  return {...p,scenarioId,quoteRequestId:prepared.quoteRequestId};
}

test("SP2 mock provider execution is deterministic, idempotent and captures exact immutable raw payload",async()=>{
  await reset();
  const app=await buildApp();
  const p=await prepare(app);

  const first=await app.inject({method:"POST",url:`/quote-requests/${p.quoteRequestId}/execute`});
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.item.quoteRequestId,p.quoteRequestId);
  assert.equal(one.item.providerReference.startsWith("MP001-"),true);
  assert.equal(one.item.payload.quote.annualPremiumPence,70140);
  assert.equal(one.item.payload.quote.voluntaryExcessPence,50000);
  assert.equal(one.item.payloadText,JSON.stringify(one.item.payload));
  assert.equal(createHash("sha256").update(one.item.payloadText,"utf8").digest("hex"),one.item.payloadSha256);

  const second=await app.inject({method:"POST",url:`/quote-requests/${p.quoteRequestId}/execute`});
  assert.equal(second.statusCode,200);
  const two=JSON.parse(second.body);
  assert.equal(two.created,false);
  assert.equal(two.item.rawProviderResponseId,one.item.rawProviderResponseId);
  assert.equal(two.item.payloadText,one.item.payloadText);
  assert.equal(two.item.payloadSha256,one.item.payloadSha256);

  const fetched=await app.inject({method:"GET",url:`/quote-requests/${p.quoteRequestId}/raw-response`});
  assert.equal(fetched.statusCode,200);
  assert.equal(JSON.parse(fetched.body).payloadText,one.item.payloadText);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM raw_provider_response WHERE quote_request_id=$1",[p.quoteRequestId])).rows[0].count),1);
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM normalised_quote")).rows[0].count),0);
  const stored=(await c.query("SELECT payload_text,payload_sha256,provider_reference FROM raw_provider_response WHERE quote_request_id=$1",[p.quoteRequestId])).rows[0];
  assert.equal(stored.payload_text,one.item.payloadText);
  assert.equal(stored.payload_sha256,one.item.payloadSha256);
  assert.equal(stored.provider_reference,one.item.providerReference);
  await assert.rejects(()=>c.query("UPDATE raw_provider_response SET payload_text='tampered' WHERE quote_request_id=$1",[p.quoteRequestId]),/RAW_PROVIDER_RESPONSE_IMMUTABLE/);
  await assert.rejects(()=>c.query("DELETE FROM raw_provider_response WHERE quote_request_id=$1",[p.quoteRequestId]),/RAW_PROVIDER_RESPONSE_IMMUTABLE/);
  await c.end();
  await app.close();
});

test("SP2 mock provider cannot execute when pre-quote integrity blocked QuoteRequest creation",async()=>{
  await reset();
  const app=await buildApp();
  const p=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-001"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    await app.inject({method:"PUT",url:`/profile-versions/${p.versionId}/facts/${fieldId}`,payload:{value}});
  }
  await app.inject({method:"POST",url:`/profiles/${p.profileId}/lock`});
  await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{voluntary_excess:250}});
  const generated=JSON.parse((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`})).body);
  const scenarioId=generated.items[0].scenarioId;

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("INSERT INTO discrepancy(discrepancy_id,risk_profile_version_id,field_id,state,blocking) VALUES('DISC-RAW-BLOCK',$1,'annual_mileage','BLOCKING',true)",[p.versionId]);
  await c.end();

  const blocked=await app.inject({
    method:"POST",
    url:`/scenarios/${scenarioId}/quote-requests`,
    payload:{providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"},
  });
  assert.equal(blocked.statusCode,409);

  const execution=await app.inject({method:"POST",url:"/quote-requests/QREQ-NOT-CREATED/execute"});
  assert.equal(execution.statusCode,422);
  assert.equal(JSON.parse(execution.body).error,"QUOTE_REQUEST_NOT_FOUND");

  const check=new Client({connectionString:process.env.DATABASE_URL});
  await check.connect();
  assert.equal(Number((await check.query("SELECT count(*) AS count FROM quote_request")).rows[0].count),0);
  assert.equal(Number((await check.query("SELECT count(*) AS count FROM raw_provider_response")).rows[0].count),0);
  await check.end();
  await app.close();
});
