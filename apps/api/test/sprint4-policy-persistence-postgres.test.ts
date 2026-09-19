import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {
  CUSTOMER_OBJECTIVE_MODEL_VERSION,
  OPTIMISATION_CATALOGUE_VERSION,
  optimisationPolicyFingerprint,
} from "../../../packages/optimisation/src/index.ts";

const {Client}=pg;

async function resetProfileData(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE customer_objective, optimisation_catalogue_version, audit_event, integrity_signal, prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function createLockedProfile(app:any){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [
    ["main_driver_id","DRV-SYN-SP4-OBJ"],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
  ] as const){
    assert.equal((await app.inject({
      method:"PUT",
      url:"/profile-versions/"+profile.versionId+"/facts/"+fieldId,
      payload:{value},
    })).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/validate"})).statusCode,200);
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);
  return profile;
}

test("SP4 catalogue and customer objectives persist exact versioned policy lineage with append-only audit",async()=>{
  await resetProfileData();
  const app=await buildApp();

  const draft=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  const draftAttempt=await app.inject({
    method:"POST",url:"/profile-versions/"+draft.versionId+"/customer-objectives",
    payload:{objectiveId:"LOWEST_ANNUAL_PREMIUM"},
  });
  assert.equal(draftAttempt.statusCode,409);
  assert.equal(JSON.parse(draftAttempt.body).error,"CUSTOMER_OBJECTIVE_REQUIRES_LOCKED_PROFILE");

  const profile=await createLockedProfile(app);

  const dormant=await app.inject({
    method:"POST",url:"/profile-versions/"+profile.versionId+"/customer-objectives",
    payload:{objectiveId:"BALANCED_COST_AND_EXPOSURE"},
  });
  assert.equal(dormant.statusCode,422);
  assert.equal(JSON.parse(dormant.body).error,"CUSTOMER_OBJECTIVE_DORMANT:BALANCED_COST_AND_EXPOSURE");

  const first=await app.inject({
    method:"POST",url:"/profile-versions/"+profile.versionId+"/customer-objectives",
    payload:{objectiveId:"LOWEST_ANNUAL_PREMIUM"},
  });
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.item.riskProfileVersionId,profile.versionId);
  assert.equal(one.item.objectiveId,"LOWEST_ANNUAL_PREMIUM");
  assert.equal(one.item.objectiveVersion,CUSTOMER_OBJECTIVE_MODEL_VERSION);
  assert.equal(one.item.catalogueVersion,OPTIMISATION_CATALOGUE_VERSION);
  assert.equal(one.item.policyFingerprint,optimisationPolicyFingerprint());

  const replay=await app.inject({
    method:"POST",url:"/profile-versions/"+profile.versionId+"/customer-objectives",
    payload:{objectiveId:"LOWEST_ANNUAL_PREMIUM"},
  });
  assert.equal(replay.statusCode,200);
  const same=JSON.parse(replay.body);
  assert.equal(same.created,false);
  assert.equal(same.item.customerObjectiveId,one.item.customerObjectiveId);

  const second=await app.inject({
    method:"POST",url:"/profile-versions/"+profile.versionId+"/customer-objectives",
    payload:{objectiveId:"LOWEST_FINANCE_COST"},
  });
  assert.equal(second.statusCode,201);
  const two=JSON.parse(second.body);
  assert.notEqual(two.item.customerObjectiveId,one.item.customerObjectiveId);
  assert.equal(two.item.policyFingerprint,one.item.policyFingerprint);

  const list=JSON.parse((await app.inject({
    method:"GET",url:"/profile-versions/"+profile.versionId+"/customer-objectives",
  })).body);
  assert.equal(list.items.length,2);
  assert.deepEqual(list.items.map((item:any)=>item.objectiveId),["LOWEST_ANNUAL_PREMIUM","LOWEST_FINANCE_COST"]);

  const catalogue=JSON.parse((await app.inject({
    method:"GET",url:"/optimisation/catalogues/"+OPTIMISATION_CATALOGUE_VERSION,
  })).body);
  assert.equal(catalogue.catalogueVersion,OPTIMISATION_CATALOGUE_VERSION);
  assert.equal(catalogue.objectiveModelVersion,CUSTOMER_OBJECTIVE_MODEL_VERSION);
  assert.equal(catalogue.policyFingerprint,optimisationPolicyFingerprint());
  assert.ok(catalogue.catalogue.controls.every((control:any)=>control.controlClass==="O"));
  assert.equal(catalogue.objectiveModel.objectives.find((objective:any)=>objective.objectiveId==="BALANCED_COST_AND_EXPOSURE").executable,false);

  const snapshot=JSON.parse((await app.inject({
    method:"GET",url:"/profiles/"+profile.profileId+"/snapshot",
  })).body);
  const locked=snapshot.versions.find((version:any)=>version.versionId===profile.versionId);
  assert.equal(locked.status,"LOCKED");
  assert.equal(locked.values.find((value:any)=>value.fieldId==="annual_mileage").value,8000);

  const auditTypes=snapshot.audit.map((event:any)=>event.eventType);
  assert.ok(auditTypes.includes("optimisation_catalogue_registered"));
  assert.equal(auditTypes.filter((eventType:string)=>eventType==="customer_objective_selected").length,2);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const persisted=(await c.query(
    "SELECT objective_id,objective_version,catalogue_version,policy_fingerprint FROM customer_objective WHERE customer_objective_id=$1",
    [one.item.customerObjectiveId],
  )).rows[0];
  assert.equal(persisted.objective_id,"LOWEST_ANNUAL_PREMIUM");
  assert.equal(persisted.objective_version,CUSTOMER_OBJECTIVE_MODEL_VERSION);
  assert.equal(persisted.catalogue_version,OPTIMISATION_CATALOGUE_VERSION);
  assert.equal(persisted.policy_fingerprint,optimisationPolicyFingerprint());

  await assert.rejects(
    ()=>c.query("UPDATE customer_objective SET objective_id='LOWEST_MONTHLY_COMMITMENT' WHERE customer_objective_id=$1",[one.item.customerObjectiveId]),
    /SP4_POLICY_EVIDENCE_IMMUTABLE/,
  );
  await assert.rejects(
    ()=>c.query("DELETE FROM optimisation_catalogue_version WHERE catalogue_version=$1",[OPTIMISATION_CATALOGUE_VERSION]),
    /SP4_POLICY_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});
