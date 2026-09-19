import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {OCCUPATION_TAXONOMY_VERSION} from "../../../packages/quote-orchestration/src/index.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE occupation_taxonomy_mapping, candidate_vehicle, sp4_quote_request_lineage, market_route, scenario_generation_rejection, sp4_scenario_lineage, customer_objective, audit_event, integrity_signal, prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function createLockedProfile(app:any,args:{
  driverId:string;
  occupation:string;
  vehicleMode:"CURRENT_VEHICLE"|"PRE_PURCHASE";
  vehicleId:string;
}){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [
    ["main_driver_id",args.driverId],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
    ["occupation",args.occupation],
    ["vehicle_mode",args.vehicleMode],
    ["vehicle_id",args.vehicleId],
  ] as const){
    assert.equal((await app.inject({
      method:"PUT",
      url:"/profile-versions/"+profile.versionId+"/facts/"+fieldId,
      payload:{value},
    })).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);
  return profile;
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

test("S4-G7 locked canonical occupation maps through versioned provider taxonomy without becoming an O-class experiment",async()=>{
  await reset();
  const app=await buildApp();
  const profile=await createLockedProfile(app,{
    driverId:"DRV-SP4-OCC",
    occupation:"SOFTWARE_ENGINEER",
    vehicleMode:"CURRENT_VEHICLE",
    vehicleId:"VEH-CURRENT-OCC",
  });

  const mappedResponse=await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/occupation-mappings",
  });
  assert.equal(mappedResponse.statusCode,201);
  const mapped=JSON.parse(mappedResponse.body);
  assert.equal(mapped.created,true);
  assert.equal(mapped.items.length,2);
  assert.ok(mapped.items.every((item:any)=>item.taxonomyVersion===OCCUPATION_TAXONOMY_VERSION));
  assert.ok(mapped.items.every((item:any)=>item.canonicalOccupation==="SOFTWARE_ENGINEER"));
  assert.deepEqual(
    mapped.items.map((item:any)=>item.providerOccupationCode).sort(),
    ["MOCK-OCC-SE-001","MOCK-PCW-OCC-SE-101"],
  );
  assert.equal(new Set(mapped.items.map((item:any)=>item.mappingFingerprint)).size,2);

  const replay=await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/occupation-mappings",
  });
  assert.equal(replay.statusCode,200);
  assert.equal(JSON.parse(replay.body).created,false);

  const objective=await createObjective(app,profile.versionId);
  const rejected=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{occupation:["TEACHER"]}},
  });
  assert.equal(rejected.statusCode,201);
  const rejectedBody=JSON.parse(rejected.body);
  assert.equal(rejectedBody.items.length,0);
  assert.ok(rejectedBody.rejections.some((item:any)=>
    item.ruleId==="CONTROL_NOT_IN_OPTIMISATION_CATALOGUE"
    && item.category==="POLICY_INELIGIBLE"
  ));

  const snapshot=JSON.parse((await app.inject({
    method:"GET",url:"/profiles/"+profile.profileId+"/snapshot",
  })).body);
  const locked=snapshot.versions.find((item:any)=>item.versionId===profile.versionId);
  assert.equal(locked.status,"LOCKED");
  assert.equal(locked.values.find((item:any)=>item.fieldId==="occupation").value,"SOFTWARE_ENGINEER");

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const facts=await c.query(
    "SELECT field_id,control_class,value_json FROM canonical_field_value WHERE risk_profile_version_id=$1 AND field_id IN ('occupation','annual_mileage') ORDER BY field_id",
    [profile.versionId],
  );
  assert.equal(facts.rows.find((row:any)=>row.field_id==="occupation").control_class,"F");
  assert.equal(facts.rows.find((row:any)=>row.field_id==="occupation").value_json,"SOFTWARE_ENGINEER");
  assert.equal(Number(facts.rows.find((row:any)=>row.field_id==="annual_mileage").value_json),8000);
  await assert.rejects(
    ()=>c.query("UPDATE occupation_taxonomy_mapping SET provider_occupation_code='TAMPERED' WHERE risk_profile_version_id=$1",[profile.versionId]),
    /SP4_PROFILE_OPTIMISATION_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});

test("S4-G8 candidate vehicle evidence is PRE_PURCHASE-only, O-class and never overwrites the factual vehicle",async()=>{
  await reset();
  const app=await buildApp();

  const current=await createLockedProfile(app,{
    driverId:"DRV-SP4-CURRENT",
    occupation:"TEACHER",
    vehicleMode:"CURRENT_VEHICLE",
    vehicleId:"VEH-CURRENT-1",
  });
  const blocked=await app.inject({
    method:"POST",
    url:"/profile-versions/"+current.versionId+"/candidate-vehicles",
    payload:{candidateVehicleId:"VEH-CAND-BLOCKED",vehicleSnapshot:{make:"Synthetic",model:"Blocked"}},
  });
  assert.equal(blocked.statusCode,409);
  assert.equal(JSON.parse(blocked.body).error,"CANDIDATE_VEHICLE_REQUIRES_PRE_PURCHASE");

  const pre=await createLockedProfile(app,{
    driverId:"DRV-SP4-PRE",
    occupation:"SOFTWARE_ENGINEER",
    vehicleMode:"PRE_PURCHASE",
    vehicleId:"VEH-CURRENT-2",
  });

  const currentAsCandidate=await app.inject({
    method:"POST",
    url:"/profile-versions/"+pre.versionId+"/candidate-vehicles",
    payload:{candidateVehicleId:"VEH-CURRENT-2",vehicleSnapshot:{make:"Synthetic",model:"Current"}},
  });
  assert.equal(currentAsCandidate.statusCode,409);
  assert.equal(JSON.parse(currentAsCandidate.body).error,"CURRENT_VEHICLE_CANNOT_BE_CANDIDATE");

  const registered=await app.inject({
    method:"POST",
    url:"/profile-versions/"+pre.versionId+"/candidate-vehicles",
    payload:{candidateVehicleId:"VEH-CAND-1",vehicleSnapshot:{make:"Synthetic",model:"Candidate One",group:12}},
  });
  assert.equal(registered.statusCode,201);
  const candidate=JSON.parse(registered.body);
  assert.equal(candidate.created,true);
  assert.equal(candidate.item.riskProfileVersionId,pre.versionId);
  assert.equal(candidate.item.candidateVehicleId,"VEH-CAND-1");
  assert.match(candidate.item.evidenceFingerprint,/^[0-9a-f]{64}$/);

  const replay=await app.inject({
    method:"POST",
    url:"/profile-versions/"+pre.versionId+"/candidate-vehicles",
    payload:{candidateVehicleId:"VEH-CAND-1",vehicleSnapshot:{group:12,model:"Candidate One",make:"Synthetic"}},
  });
  assert.equal(replay.statusCode,200);
  assert.equal(JSON.parse(replay.body).created,false);

  const objective=await createObjective(app,pre.versionId);
  const exploration=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{candidate_vehicle:["VEH-CAND-1"],voluntary_excess:[500]}},
  });
  assert.equal(exploration.statusCode,201);
  const body=JSON.parse(exploration.body);
  assert.equal(body.items.length,1);
  assert.equal(body.rejections.length,0);
  const candidateDelta=body.items[0].deltas.find((item:any)=>item.fieldId==="candidate_vehicle");
  assert.equal(candidateDelta.controlClass,"O");
  assert.equal(candidateDelta.value,"VEH-CAND-1");

  const unknown=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{candidate_vehicle:["VEH-UNKNOWN"]}},
  });
  assert.equal(unknown.statusCode,201);
  const unknownBody=JSON.parse(unknown.body);
  assert.equal(unknownBody.items.length,0);
  assert.ok(unknownBody.rejections.some((item:any)=>item.ruleId==="UNKNOWN_CANDIDATE_VEHICLE"));

  const snapshot=JSON.parse((await app.inject({
    method:"GET",url:"/profiles/"+pre.profileId+"/snapshot",
  })).body);
  const locked=snapshot.versions.find((item:any)=>item.versionId===pre.versionId);
  assert.equal(locked.status,"LOCKED");
  assert.equal(locked.values.find((item:any)=>item.fieldId==="vehicle_id").value,"VEH-CURRENT-2");
  assert.equal(locked.values.find((item:any)=>item.fieldId==="vehicle_mode").value,"PRE_PURCHASE");
  assert.equal(locked.values.some((item:any)=>item.fieldId==="candidate_vehicle"),false);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const persistedDelta=(await c.query(
    "SELECT control_class,value_json FROM scenario_delta WHERE scenario_id=$1 AND field_id='candidate_vehicle'",
    [body.items[0].scenarioId],
  )).rows[0];
  assert.equal(persistedDelta.control_class,"O");
  assert.equal(persistedDelta.value_json,"VEH-CAND-1");
  assert.equal((await c.query(
    "SELECT value_json FROM canonical_field_value WHERE risk_profile_version_id=$1 AND field_id='vehicle_id'",
    [pre.versionId],
  )).rows[0].value_json,"VEH-CURRENT-2");
  await assert.rejects(
    ()=>c.query("UPDATE candidate_vehicle SET candidate_vehicle_id='TAMPERED' WHERE risk_profile_version_id=$1",[pre.versionId]),
    /SP4_PROFILE_OPTIMISATION_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});
