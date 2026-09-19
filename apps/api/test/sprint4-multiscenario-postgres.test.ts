import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {createDatabase,createPool} from "../../../packages/db/src/client.ts";
import {generateSprint4Scenarios} from "../src/sprint4-scenario-service.ts";
import {OPTIMISATION_CATALOGUE_VERSION} from "../../../packages/optimisation/src/index.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE scenario_generation_rejection, sp4_scenario_lineage, customer_objective, audit_event, integrity_signal, prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function seedLocked(app:any){
  const created=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [
    ["main_driver_id","DRV-MAIN"],
    ["named_driver_id_1","DRV-2"],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
  ] as const){
    assert.equal((await app.inject({
      method:"PUT",
      url:"/profile-versions/"+created.versionId+"/facts/"+fieldId,
      payload:{value},
    })).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+created.profileId+"/lock"})).statusCode,200);
  return created;
}

async function createObjective(app:any,versionId:string){
  const response=await app.inject({
    method:"POST",
    url:"/profile-versions/"+versionId+"/customer-objectives",
    payload:{objectiveId:"LOWEST_ANNUAL_PREMIUM"},
  });
  assert.equal(response.statusCode,201);
  return JSON.parse(response.body).item;
}

test("S4-G3 deterministic multi-scenario generation preserves exact locked-profile/catalogue lineage",async()=>{
  await reset();
  const app=await buildApp();
  const profile=await seedLocked(app);
  const objective=await createObjective(app,profile.versionId);

  const first=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{
      voluntary_excess:[500,250],
      payment_structure:["MONTHLY","ANNUAL"],
    }},
  });
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.items.length,4);
  assert.equal(one.rejections.length,0);
  assert.ok(one.items.every((item:any)=>item.riskProfileVersionId===profile.versionId));
  assert.ok(one.items.every((item:any)=>item.catalogueVersion===OPTIMISATION_CATALOGUE_VERSION));
  assert.ok(one.items.every((item:any)=>item.deltas.every((delta:any)=>delta.controlClass==="O")));
  assert.deepEqual(one.items.map((item:any)=>item.generationOrdinal),[1,2,3,4]);

  const replay=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{
      payment_structure:["ANNUAL","MONTHLY"],
      voluntary_excess:[250,500],
    }},
  });
  assert.equal(replay.statusCode,200);
  const two=JSON.parse(replay.body);
  assert.equal(two.created,false);
  assert.equal(two.explorationFingerprint,one.explorationFingerprint);
  assert.deepEqual(two.items.map((item:any)=>item.scenarioId),one.items.map((item:any)=>item.scenarioId));

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const rows=(await c.query(
    "SELECT s.scenario_id,s.risk_profile_version_id,l.customer_objective_id,l.catalogue_version,l.policy_fingerprint FROM scenario s JOIN sp4_scenario_lineage l ON l.scenario_id=s.scenario_id WHERE l.customer_objective_id=$1 ORDER BY s.generation_ordinal",
    [objective.customerObjectiveId],
  )).rows;
  assert.equal(rows.length,4);
  assert.ok(rows.every((row:any)=>row.risk_profile_version_id===profile.versionId));
  assert.ok(rows.every((row:any)=>row.customer_objective_id===objective.customerObjectiveId));
  assert.ok(rows.every((row:any)=>row.catalogue_version===objective.catalogueVersion));
  assert.ok(rows.every((row:any)=>row.policy_fingerprint===objective.policyFingerprint));
  await assert.rejects(
    ()=>c.query("UPDATE sp4_scenario_lineage SET catalogue_version='tampered' WHERE scenario_id=$1",[rows[0].scenario_id]),
    /SP4_GENERATION_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});

test("S4-G4 invalid, contradictory and policy-ineligible candidates persist deterministic rejection reasons without changing facts",async()=>{
  await reset();
  const app=await buildApp();
  const profile=await seedLocked(app);
  const objective=await createObjective(app,profile.versionId);

  const cases=[
    {
      choices:{annual_mileage:[6000]},
      ruleId:"CONTROL_NOT_IN_OPTIMISATION_CATALOGUE",
      category:"POLICY_INELIGIBLE",
    },
    {
      choices:{voluntary_excess:[999]},
      ruleId:"VALUE_OUTSIDE_CATALOGUE",
      category:"IMPOSSIBLE",
    },
    {
      choices:{genuine_named_driver_inclusion:[["DRV-MAIN","DRV-2"]]},
      ruleId:"MAIN_DRIVER_CANNOT_BE_NAMED_DRIVER_DELTA",
      category:"CONTRADICTORY",
    },
    {
      choices:{candidate_vehicle:["VEH-CAND-1"]},
      ruleId:"CONTROL_NOT_APPLICABLE",
      category:"POLICY_INELIGIBLE",
    },
  ];

  for(const item of cases){
    const response=await app.inject({
      method:"POST",
      url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
      payload:{choices:item.choices},
    });
    assert.equal(response.statusCode,201);
    const body=JSON.parse(response.body);
    assert.equal(body.items.length,0);
    assert.ok(body.rejections.some((rejection:any)=>
      rejection.ruleId===item.ruleId && rejection.category===item.category
    ));

    const replay=await app.inject({
      method:"POST",
      url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
      payload:{choices:item.choices},
    });
    assert.equal(replay.statusCode,200);
    const replayBody=JSON.parse(replay.body);
    assert.equal(replayBody.created,false);
    assert.deepEqual(
      replayBody.rejections.map((rejection:any)=>[rejection.rejectionId,rejection.ruleId]),
      body.rejections.map((rejection:any)=>[rejection.rejectionId,rejection.ruleId]),
    );
  }

  const snapshot=JSON.parse((await app.inject({
    method:"GET",url:"/profiles/"+profile.profileId+"/snapshot",
  })).body);
  const locked=snapshot.versions.find((version:any)=>version.versionId===profile.versionId);
  assert.equal(locked.status,"LOCKED");
  assert.equal(locked.values.find((value:any)=>value.fieldId==="annual_mileage").value,8000);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const rejection=(await c.query("SELECT scenario_generation_rejection_id FROM scenario_generation_rejection LIMIT 1")).rows[0];
  await assert.rejects(
    ()=>c.query("UPDATE scenario_generation_rejection SET reason='tampered' WHERE scenario_generation_rejection_id=$1",[rejection.scenario_generation_rejection_id]),
    /SP4_GENERATION_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});

test("Sprint 4 exploration transaction rolls back scenario, lineage and deltas together",async()=>{
  await reset();
  const app=await buildApp();
  const profile=await seedLocked(app);
  const objective=await createObjective(app,profile.versionId);
  await app.close();

  const pool=createPool();
  const db=createDatabase(pool);
  await assert.rejects(()=>generateSprint4Scenarios(db,{
    customerObjectiveId:objective.customerObjectiveId,
    choiceSets:{voluntary_excess:[250,500]},
    simulateFailureAfterFirstScenario:true,
  }),/SIMULATED_SP4_SCENARIO_GENERATION_FAILURE/);

  const scenarioCount=Number((await pool.query("SELECT count(*) AS count FROM scenario WHERE generation_version='sp4-gen-v1'")).rows[0].count);
  const lineageCount=Number((await pool.query("SELECT count(*) AS count FROM sp4_scenario_lineage")).rows[0].count);
  const rejectionCount=Number((await pool.query("SELECT count(*) AS count FROM scenario_generation_rejection")).rows[0].count);
  assert.equal(scenarioCount,0);
  assert.equal(lineageCount,0);
  assert.equal(rejectionCount,0);
  await pool.end();
});
