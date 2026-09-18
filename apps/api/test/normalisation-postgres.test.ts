import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildApp } from "../src/server.ts";
import { executeMockProvider } from "../../../packages/mock-providers/src/index.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function prepareRaw(app:any,voluntaryExcess=500){
  const p=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-001"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    assert.equal((await app.inject({method:"PUT",url:`/profile-versions/${p.versionId}/facts/${fieldId}`,payload:{value}})).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:`/profiles/${p.profileId}/lock`})).statusCode,200);
  assert.equal((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{payment_structure:"ANNUAL",voluntary_excess:voluntaryExcess}})).statusCode,200);
  const generated=JSON.parse((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`})).body);
  const scenarioId=generated.items[0].scenarioId;
  const prepared=JSON.parse((await app.inject({
    method:"POST",
    url:`/scenarios/${scenarioId}/quote-requests`,
    payload:{providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"},
  })).body);
  const executed=JSON.parse((await app.inject({method:"POST",url:`/quote-requests/${prepared.quoteRequestId}/execute`})).body);
  return {...p,scenarioId,quoteRequestId:prepared.quoteRequestId,raw:executed.item};
}

test("SP2 normaliser creates idempotent DIRECTLY_COMPARABLE derived quote and preserves raw provider evidence",async()=>{
  await reset();
  const app=await buildApp();
  const p=await prepareRaw(app);
  const before={payloadText:p.raw.payloadText,payloadSha256:p.raw.payloadSha256};

  const first=await app.inject({method:"POST",url:`/raw-provider-responses/${p.raw.rawProviderResponseId}/normalise`});
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.item.comparisonState,"DIRECTLY_COMPARABLE");
  assert.equal(one.item.annualCashPremiumPence,70140);
  assert.equal(one.item.compulsoryExcessPence,35000);
  assert.equal(one.item.voluntaryExcessPence,50000);
  assert.equal((one.item as any).effectiveCostPence,undefined);

  const second=await app.inject({method:"POST",url:`/raw-provider-responses/${p.raw.rawProviderResponseId}/normalise`});
  assert.equal(second.statusCode,200);
  const two=JSON.parse(second.body);
  assert.equal(two.created,false);
  assert.equal(two.item.normalisedQuoteId,one.item.normalisedQuoteId);

  const rawAfter=JSON.parse((await app.inject({method:"GET",url:`/quote-requests/${p.quoteRequestId}/raw-response`})).body);
  assert.deepEqual({payloadText:rawAfter.payloadText,payloadSha256:rawAfter.payloadSha256},before);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM normalised_quote WHERE raw_provider_response_id=$1",[p.raw.rawProviderResponseId])).rows[0].count),1);
  await assert.rejects(()=>c.query("UPDATE normalised_quote SET comparison_reason='tampered' WHERE normalised_quote_id=$1",[one.item.normalisedQuoteId]),/NORMALISED_QUOTE_IMMUTABLE/);
  await assert.rejects(()=>c.query("DELETE FROM normalised_quote WHERE normalised_quote_id=$1",[one.item.normalisedQuoteId]),/NORMALISED_QUOTE_IMMUTABLE/);
  const rawStored=(await c.query("SELECT payload_text,payload_sha256 FROM raw_provider_response WHERE raw_provider_response_id=$1",[p.raw.rawProviderResponseId])).rows[0];
  assert.equal(rawStored.payload_text,before.payloadText);
  assert.equal(rawStored.payload_sha256,before.payloadSha256);
  await c.end();
  await app.close();
});

test("SP2 incomplete provider fixture normalises as NOT_COMPARABLE without fabricated dimensions",async()=>{
  await reset();
  const app=await buildApp();
  const p=await prepareRaw(app,250);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const second=await prepareSecondQuote(app);
  const fixture=executeMockProvider({
    requestFingerprint:second.requestFingerprint,
    scenarioId:second.scenarioId,
    deltas:[{fieldId:"voluntary_excess",value:250}],
    fixtureKey:"INCOMPLETE",
  });
  await c.query(
    "INSERT INTO raw_provider_response(raw_provider_response_id,quote_request_id,payload_json,payload_text,payload_sha256,provider_reference,provider_response_at) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7::timestamptz)",
    ["RAW-INCOMPLETE-001",second.quoteRequestId,fixture.payloadText,fixture.payloadText,fixture.payloadSha256,fixture.providerReference,fixture.responseTimestamp],
  );
  await c.end();

  const response=await app.inject({method:"POST",url:"/raw-provider-responses/RAW-INCOMPLETE-001/normalise"});
  assert.equal(response.statusCode,201);
  const item=JSON.parse(response.body).item;
  assert.equal(item.comparisonState,"NOT_COMPARABLE");
  assert.equal(item.annualCashPremiumPence,null);
  assert.equal(item.financeCostPence,null);
  assert.equal(item.compulsoryExcessPence,null);
  assert.equal(item.voluntaryExcessPence,null);
  assert.equal(item.comparisonReason,"MISSING_OR_UNSUPPORTED_REQUIRED_PROVIDER_FIELDS");
  await app.close();
});

test("SP2 database rejects ADJUSTED_COMPARABLE for an SP2 normaliser version",async()=>{
  await reset();
  const app=await buildApp();
  const p=await prepareRaw(app);
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await assert.rejects(()=>c.query(
    "INSERT INTO normalised_quote(normalised_quote_id,raw_provider_response_id,normalisation_version,annual_cash_premium_pence,finance_cost_pence,compulsory_excess_pence,voluntary_excess_pence,comparison_state,comparison_reason,normalisation_fingerprint) VALUES('NOR-ADJUSTED-BLOCK',$1,'sp2-normaliser-v99',1,0,1,1,'ADJUSTED_COMPARABLE','UNAPPROVED',$2)",
    [p.raw.rawProviderResponseId,"d".repeat(64)],
  ),/ADJUSTED_COMPARABLE_NOT_APPROVED/);
  await c.end();
  await app.close();
});

async function prepareSecondQuote(app:any){
  const p=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-002"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    await app.inject({method:"PUT",url:`/profile-versions/${p.versionId}/facts/${fieldId}`,payload:{value}});
  }
  await app.inject({method:"POST",url:`/profiles/${p.profileId}/lock`});
  await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{voluntary_excess:250}});
  const generated=JSON.parse((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`})).body);
  const scenarioId=generated.items[0].scenarioId;
  return JSON.parse((await app.inject({
    method:"POST",
    url:`/scenarios/${scenarioId}/quote-requests`,
    payload:{providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"},
  })).body);
}
