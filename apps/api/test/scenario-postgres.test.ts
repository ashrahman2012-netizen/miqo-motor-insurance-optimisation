import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildApp } from "../src/server.ts";
import { createDatabase, createPool } from "../../../packages/db/src/client.ts";
import { generateScenarios } from "../src/scenario-service.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function seedLocked(app:any){
  const created=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id","DRV-SYN-001"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const) {
    assert.equal((await app.inject({method:"PUT",url:`/profile-versions/${created.versionId}/facts/${fieldId}`,payload:{value}})).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:`/profiles/${created.profileId}/lock`})).statusCode,200);
  return created;
}

test("SP2 scenario generation is deterministic, idempotent, provenance-complete and freezes preferences",async()=>{
  await reset();
  const app=await buildApp();
  const p=await seedLocked(app);
  assert.equal((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{payment_structure:"ANNUAL",voluntary_excess:500}})).statusCode,200);

  const first=await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`});
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.items.length,1);
  assert.equal(one.items[0].riskProfileVersionId,p.versionId);
  assert.equal(one.items[0].generationVersion,"sp2-gen-v1");
  assert.equal(one.items[0].generationOrdinal,1);
  assert.equal(one.items[0].generationFingerprint,one.generationFingerprint);
  assert.deepEqual(one.items[0].preferenceSnapshot,{payment_structure:"ANNUAL",voluntary_excess:500});
  assert.deepEqual(one.items[0].deltas,[
    {fieldId:"payment_structure",controlClass:"O",value:"ANNUAL"},
    {fieldId:"voluntary_excess",controlClass:"O",value:500},
  ]);

  const second=await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`});
  assert.equal(second.statusCode,200);
  const two=JSON.parse(second.body);
  assert.equal(two.created,false);
  assert.equal(two.items[0].scenarioId,one.items[0].scenarioId);
  assert.equal(two.generationFingerprint,one.generationFingerprint);

  const preferences=JSON.parse((await app.inject({method:"GET",url:`/profile-versions/${p.versionId}/optimisation-preferences`})).body);
  assert.ok(preferences.items.every((item:any)=>item.frozenAt));
  const changed=await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{voluntary_excess:750}});
  assert.equal(changed.statusCode,409);
  assert.equal(JSON.parse(changed.body).error,"PREFERENCE_SET_FROZEN_BY_SCENARIO");
  await app.close();
});

test("SP2 generated scenarios and deltas are immutable and disguised factual O writes fail in PostgreSQL",async()=>{
  await reset();
  const app=await buildApp();
  const p=await seedLocked(app);
  await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{payment_structure:"ANNUAL"}});
  const generated=JSON.parse((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`})).body);
  const scenarioId=generated.items[0].scenarioId;

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await assert.rejects(()=>c.query("UPDATE scenario SET generation_version='tampered' WHERE scenario_id=$1",[scenarioId]),/GENERATED_SCENARIO_IMMUTABLE/);
  await assert.rejects(()=>c.query("UPDATE scenario_delta SET value_json='\"MONTHLY\"'::jsonb WHERE scenario_id=$1",[scenarioId]),/GENERATED_SCENARIO_IMMUTABLE/);
  await assert.rejects(()=>c.query("INSERT INTO scenario_delta(scenario_delta_id,scenario_id,field_id,control_class,value_json) VALUES('SCD-LATE',$1,'telematics_preference','O','true'::jsonb)",[scenarioId]),/GENERATED_SCENARIO_IMMUTABLE/);
  await assert.rejects(()=>c.query("UPDATE optimisation_preference SET value_json='\"MONTHLY\"'::jsonb WHERE risk_profile_version_id=$1",[p.versionId]),/PREFERENCE_SET_FROZEN_BY_SCENARIO/);
  await assert.rejects(()=>c.query("INSERT INTO optimisation_preference(optimisation_preference_id,risk_profile_version_id,preference_key,value_json) VALUES('OPT-LATE',$1,'telematics_preference','true'::jsonb)",[p.versionId]),/PREFERENCE_SET_FROZEN_BY_SCENARIO/);

  await c.query("INSERT INTO scenario(scenario_id,risk_profile_version_id,status) VALUES('SCN-DISGUISED',$1,'READY')",[p.versionId]);
  await assert.rejects(()=>c.query("INSERT INTO scenario_delta(scenario_delta_id,scenario_id,field_id,control_class,value_json) VALUES('SCD-DISGUISED','SCN-DISGUISED','annual_mileage','O','6000'::jsonb)"),/scenario_delta_approved_o_field/);
  await c.end();
  await app.close();
});

test("SP2 generation transaction rolls back scenario, deltas and preference freeze together",async()=>{
  await reset();
  const app=await buildApp();
  const p=await seedLocked(app);
  await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{voluntary_excess:250}});
  await app.close();

  const pool=createPool();
  const db=createDatabase(pool);
  await assert.rejects(()=>generateScenarios(db,{versionId:p.versionId,simulateFailureAfterScenario:true}),/SIMULATED_SCENARIO_GENERATION_FAILURE/);
  const scenarioCount=Number((await pool.query("SELECT count(*) AS count FROM scenario WHERE risk_profile_version_id=$1",[p.versionId])).rows[0].count);
  const deltaCount=Number((await pool.query("SELECT count(*) AS count FROM scenario_delta")).rows[0].count);
  const frozenCount=Number((await pool.query("SELECT count(*) AS count FROM optimisation_preference WHERE risk_profile_version_id=$1 AND frozen_at IS NOT NULL",[p.versionId])).rows[0].count);
  assert.equal(scenarioCount,0);
  assert.equal(deltaCount,0);
  assert.equal(frozenCount,0);
  await pool.end();
});

test("SP2 generator rejects DRAFT and SUPERSEDED profile versions",async()=>{
  await reset();
  const app=await buildApp();
  const draft=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  assert.equal((await app.inject({method:"POST",url:`/profile-versions/${draft.versionId}/scenarios/generate`})).statusCode,409);

  const p=await seedLocked(app);
  await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/optimisation-preferences`,payload:{voluntary_excess:250}});
  assert.equal((await app.inject({method:"POST",url:`/profiles/${p.profileId}/corrections`,payload:{fieldId:"annual_mileage",value:6000}})).statusCode,201);
  await app.inject({method:"POST",url:`/profiles/${p.profileId}/validate`});
  await app.inject({method:"POST",url:`/profiles/${p.profileId}/lock`});
  assert.equal((await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios/generate`})).statusCode,409);
  await app.close();
});

test("legacy scenario API rejects an approved-class label on a factual field",async()=>{
  await reset();
  const app=await buildApp();
  const p=await seedLocked(app);
  const response=await app.inject({method:"POST",url:`/profile-versions/${p.versionId}/scenarios`,payload:{deltas:[{fieldId:"annual_mileage",controlClass:"O",value:6000}]}});
  assert.equal(response.statusCode,422);
  assert.equal(JSON.parse(response.body).error,"INVALID_SCENARIO_DELTA");
  await app.close();
});
