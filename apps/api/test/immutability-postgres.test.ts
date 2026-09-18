import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {createDatabase, createPool} from "../../../packages/db/src/client.ts";
import {createCorrectionDraft, createProfile, lockProfile, putFact, validateProfile} from "../src/profile-service.ts";
import {ConflictError} from "../src/errors.ts";
const {Client}=pg;

async function reset(){const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");await c.end();}
async function seedViaApi(app:any){const created=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);for(const [fieldId,value] of [["main_driver_id","DRV-SYN-001"],["annual_mileage",8000],["licence_held_since","2018-04-16"]]){const r=await app.inject({method:"PUT",url:`/profile-versions/${created.versionId}/facts/${fieldId}`,payload:{value}});assert.equal(r.statusCode,200)}return created;}

test("SP1-IMMUTABILITY-001 rejects mutation across API service scenario and SQL, then versions correction",async()=>{
 await reset(); const app=await buildApp(); const created=await seedViaApi(app); assert.equal((await app.inject({method:"POST",url:`/profiles/${created.profileId}/validate`})).statusCode,200); assert.equal((await app.inject({method:"POST",url:`/profiles/${created.profileId}/lock`})).statusCode,200);
 assert.equal((await app.inject({method:"PUT",url:`/profile-versions/${created.versionId}/facts/annual_mileage`,payload:{value:6000}})).statusCode,409);
 assert.equal((await app.inject({method:"POST",url:`/profile-versions/${created.versionId}/scenarios`,payload:{deltas:[{fieldId:"annual_mileage",controlClass:"F",value:6000}]}})).statusCode,422);
 const pool=createPool(); const db=createDatabase(pool); await assert.rejects(()=>putFact(db,{profileId:created.profileId,fieldId:"annual_mileage",value:6000}),ConflictError); await pool.end();
 const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
 for(const sql of [
  `UPDATE canonical_field_value SET value_json='6000'::jsonb WHERE risk_profile_version_id='${created.versionId}' AND field_id='annual_mileage'`,
  `DELETE FROM canonical_field_value WHERE risk_profile_version_id='${created.versionId}' AND field_id='annual_mileage'`,
  `INSERT INTO canonical_field_value(canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type) VALUES('BAD-INSERT','${created.versionId}','replacement_fact','F','1'::jsonb,'test')`
 ]) await assert.rejects(()=>c.query(sql),/LOCKED_PROFILE_IMMUTABLE/);
 await c.end();
 assert.equal((await app.inject({method:"POST",url:`/profiles/${created.profileId}/corrections`,payload:{fieldId:"annual_mileage",value:6000}})).statusCode,201); await app.inject({method:"POST",url:`/profiles/${created.profileId}/validate`}); const lock2=JSON.parse((await app.inject({method:"POST",url:`/profiles/${created.profileId}/lock`})).body); assert.equal(lock2.versionNo,2);
 const snap=JSON.parse((await app.inject({method:"GET",url:`/profiles/${created.profileId}/snapshot`})).body); const mileage=(v:any)=>v.values.find((x:any)=>x.fieldId==="annual_mileage").value; assert.equal(snap.versions[0].status,"SUPERSEDED");assert.equal(mileage(snap.versions[0]),8000);assert.equal(snap.versions[1].status,"LOCKED");assert.equal(mileage(snap.versions[1]),6000); await app.close();
});

test("PostgreSQL lock plus audit rollback is atomic",async()=>{await reset();const pool=createPool();const db=createDatabase(pool);const p=await createProfile(db);for(const [fieldId,value] of [["main_driver_id","DRV"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const)await putFact(db,{profileId:p.profileId,fieldId,value});await assert.rejects(()=>lockProfile(db,p.profileId,{simulateAuditFailure:true}),/SIMULATED_AUDIT_FAILURE/);const row=(await pool.query("SELECT status FROM risk_profile_version WHERE risk_profile_version_id=$1",[p.versionId])).rows[0];assert.equal(row.status,"DRAFT");await pool.end()});

test("PostgreSQL correction transaction rollback leaves original current version intact",async()=>{await reset();const pool=createPool();const db=createDatabase(pool);const p=await createProfile(db);for(const [fieldId,value] of [["main_driver_id","DRV"],["annual_mileage",8000],["licence_held_since","2018-04-16"]])await putFact(db,{profileId:p.profileId,fieldId,value});await validateProfile(db,p.profileId);await lockProfile(db,p.profileId);await assert.rejects(()=>createCorrectionDraft(db,{profileId:p.profileId,fieldId:"annual_mileage",value:6000,simulateAuditFailure:true}),/SIMULATED_CORRECTION_AUDIT_FAILURE/);const rows=(await pool.query("SELECT version_no,status FROM risk_profile_version WHERE profile_id=$1 ORDER BY version_no",[p.profileId])).rows;assert.deepEqual(rows.map((r:any)=>[r.version_no,r.status]),[[1,"LOCKED"]]);await pool.end()});

test("PostgreSQL state survives API restart",async()=>{await reset();let app=await buildApp();const p=await seedViaApi(app);await app.inject({method:"POST",url:`/profiles/${p.profileId}/lock`});await app.close();app=await buildApp();const snap=JSON.parse((await app.inject({method:"GET",url:`/profiles/${p.profileId}/snapshot`})).body);assert.equal(snap.versions[0].status,"LOCKED");assert.equal(snap.versions[0].values.find((x:any)=>x.fieldId==="annual_mileage").value,8000);assert.ok(snap.audit.some((x:any)=>x.eventType==="profile_locked"));await app.close()});
