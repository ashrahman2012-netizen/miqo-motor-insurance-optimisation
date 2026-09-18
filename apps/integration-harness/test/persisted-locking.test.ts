import test from "node:test";
import assert from "node:assert/strict";
import { migrate, openDatabase } from "../src/db.ts";
import {
  ConflictError, createCorrectionDraft, createPersistedScenario, createProfile,
  lockProfile, profileSnapshot, putFact, validateProfile
} from "../src/service.ts";

function seeded() {
  const db=openDatabase(":memory:"); migrate(db); const {profileId,versionId}=createProfile(db);
  putFact(db,{profileId,fieldId:"main_driver_id",value:"DRV-SYN-001"});
  putFact(db,{profileId,fieldId:"annual_mileage",value:8000});
  putFact(db,{profileId,fieldId:"licence_held_since",value:"2018-04-16"});
  return {db,profileId,versionId};
}

test("persisted Sprint 1 profile validates and locks",()=>{
  const {db,profileId,versionId}=seeded();
  assert.equal(validateProfile(db,profileId).valid,true);
  assert.equal(lockProfile(db,profileId).versionId,versionId);
  assert.equal(profileSnapshot(db,profileId)[0].status,"LOCKED");
  db.close();
});

test("customer/application service cannot mutate a locked factual field",()=>{
  const {db,profileId}=seeded(); lockProfile(db,profileId);
  assert.throws(()=>putFact(db,{profileId,fieldId:"annual_mileage",value:5000}), ConflictError);
  assert.equal(profileSnapshot(db,profileId)[0].values.find(x=>x.fieldId==="annual_mileage")?.value,8000);
  db.close();
});

test("scenario service rejects an F-class mutation",()=>{
  const {db,profileId,versionId}=seeded(); lockProfile(db,profileId);
  assert.throws(()=>createPersistedScenario(db,{versionId,deltas:[{fieldId:"annual_mileage",controlClass:"F",value:5000}]}),/only O is permitted/);
  assert.equal(profileSnapshot(db,profileId)[0].values.find(x=>x.fieldId==="annual_mileage")?.value,8000);
  db.close();
});

test("database trigger rejects direct SQL mutation after lock",()=>{
  const {db,profileId,versionId}=seeded(); lockProfile(db,profileId);
  assert.throws(()=>db.prepare("UPDATE canonical_field_value SET value_json='5000' WHERE risk_profile_version_id=? AND field_id='annual_mileage'").run(versionId),/LOCKED_PROFILE_IMMUTABLE/);
  assert.equal(profileSnapshot(db,profileId)[0].values.find(x=>x.fieldId==="annual_mileage")?.value,8000);
  db.close();
});

test("approved correction creates v2 while preserving v1",()=>{
  const {db,profileId}=seeded(); lockProfile(db,profileId);
  const correction=createCorrectionDraft(db,{profileId,fieldId:"annual_mileage",value:9000});
  assert.equal(correction.versionNo,2);
  assert.equal(validateProfile(db,profileId).valid,true);
  lockProfile(db,profileId);
  const versions=profileSnapshot(db,profileId);
  assert.equal(versions.length,2);
  assert.equal(versions[0].status,"SUPERSEDED");
  assert.equal(versions[0].values.find(x=>x.fieldId==="annual_mileage")?.value,8000);
  assert.equal(versions[1].status,"LOCKED");
  assert.equal(versions[1].values.find(x=>x.fieldId==="annual_mileage")?.value,9000);
  db.close();
});

test("incomplete persisted profile cannot lock",()=>{
  const db=openDatabase(":memory:"); migrate(db); const {profileId}=createProfile(db);
  putFact(db,{profileId,fieldId:"annual_mileage",value:8000});
  assert.throws(()=>lockProfile(db,profileId),/cannot be locked/);
  assert.equal(profileSnapshot(db,profileId)[0].status,"DRAFT");
  db.close();
});

test("profile lock and audit event are transactional",()=>{
  const {db,profileId}=seeded();
  db.exec(`CREATE TRIGGER fail_profile_lock_audit BEFORE INSERT ON audit_event
    WHEN NEW.event_type='profile_locked'
    BEGIN SELECT RAISE(ABORT,'SIMULATED_AUDIT_FAILURE'); END;`);
  assert.throws(()=>lockProfile(db,profileId),/SIMULATED_AUDIT_FAILURE/);
  assert.equal(profileSnapshot(db,profileId)[0].status,"DRAFT");
  db.close();
});
