import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import pg from "pg";
import {buildApp} from "../src/server.ts";

// C3: this file intentionally uses the repo's existing destructive DB-test pattern.
// Never use an archived or shared MIQOS database. CI supplies local synthetic Postgres.
const {Client}=pg;
function assertIsolatedSyntheticDatabase(){
  const value=process.env.DATABASE_URL;
  if(!value)throw new Error("SYN005_C3_REQUIRES_ISOLATED_DATABASE_URL");
  const url=new URL(value);
  if(!["localhost","127.0.0.1"].includes(url.hostname) ||
    !["miqo","miqo_test","sim005_test"].includes(decodeURIComponent(url.pathname.slice(1))) ||
    process.env.MIQO_DATA_CLASSIFICATION!=="SYNTHETIC" ||
    process.env.MIQO_LIVE_PROVIDERS_ENABLED!=="false"){
    throw new Error("SYN005_C3_REFUSES_NONLOCAL_NON_SYNTHETIC_DB");
  }
}
async function connect(){
  assertIsolatedSyntheticDatabase();
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  return c;
}
async function reset(){
  const c=await connect();
  try{
    await c.query("TRUNCATE occupation_taxonomy_mapping, candidate_vehicle, sp4_quote_request_lineage, market_route, scenario_generation_rejection, sp4_scenario_lineage, customer_objective, optimisation_catalogue_version, audit_event, integrity_signal, prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  }finally{await c.end();}
}
async function createProfile(app:any,mode:"CURRENT_VEHICLE"|"PRE_PURCHASE",driver:string,currentVehicle:string){
  const res=await app.inject({method:"POST",url:"/profiles"});
  assert.equal(res.statusCode,201);
  const profile=JSON.parse(res.body);
  for(const [fieldId,value] of [
    ["main_driver_id",driver],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
    ["occupation","SOFTWARE_ENGINEER"],
    ["vehicle_mode",mode],
    ["vehicle_id",currentVehicle],
  ] as const){
    const f=await app.inject({method:"PUT",url:`/profile-versions/${profile.versionId}/facts/${fieldId}`,payload:{value}});
    assert.equal(f.statusCode,200,`fact ${fieldId}: ${f.body}`);
  }
  const locked=await app.inject({method:"POST",url:`/profiles/${profile.profileId}/lock`});
  assert.equal(locked.statusCode,200);
  return profile;
}
async function registerCandidate(app:any,versionId:string,id:string,model:string){
  const resp=await app.inject({
    method:"POST",
    url:`/profile-versions/${versionId}/candidate-vehicles`,
    payload:{candidateVehicleId:id,vehicleSnapshot:{make:"Synthetic",model,group:12}},
  });
  assert.equal(resp.statusCode,201,resp.body);
  return JSON.parse(resp.body).item;
}
async function objective(app:any,versionId:string){
  const resp=await app.inject({
    method:"POST",
    url:`/profile-versions/${versionId}/customer-objectives`,
    payload:{objectiveId:"LOWEST_ANNUAL_PREMIUM"},
  });
  assert.equal(resp.statusCode,201,resp.body);
  return JSON.parse(resp.body).item;
}
async function explore(app:any,objectiveId:string,choices:Record<string,unknown[]>){
  const r=await app.inject({
    method:"POST",
    url:`/customer-objectives/${objectiveId}/scenario-explorations`,
    payload:{choices},
  });
  assert.equal(r.statusCode,201,r.body);
  return JSON.parse(r.body);
}

test("C3 positive: two registered candidates x 3 excess x 2 payment x 2 telematics produce 24 scenarios and 48 route quotes",async()=>{
  await reset();
  const app=await buildApp();
  try{
    const profile=await createProfile(app,"PRE_PURCHASE","DRV-SYN-005","VEH-SYN-005-NOT-PURCHASED");
    const ev=await registerCandidate(app,profile.versionId,"VEH-SYN-005-EV","Electric");
    const petrol=await registerCandidate(app,profile.versionId,"VEH-SYN-005-PETROL","Petrol");
    assert.notEqual(ev.evidenceFingerprint,petrol.evidenceFingerprint);
    const obj=await objective(app,profile.versionId);
    const choices={
      candidate_vehicle:["VEH-SYN-005-EV","VEH-SYN-005-PETROL"],
      voluntary_excess:[250,500,750],
      payment_structure:["ANNUAL","MONTHLY"],
      telematics_preference:[true,false],
    };
    const exploration=await explore(app,obj.customerObjectiveId,choices);
    assert.equal(exploration.items.length,24);
    assert.equal(exploration.rejections.length,0);
    assert.ok(exploration.items.every((item:any)=>
      item.deltas.some((d:any)=>d.fieldId==="candidate_vehicle" && d.controlClass==="O")));
    const quotePath=`/customer-objectives/${obj.customerObjectiveId}/scenario-explorations/${exploration.explorationFingerprint}/market-route-quotes`;
    const first=await app.inject({method:"POST",url:quotePath});
    assert.equal(first.statusCode,201,first.body);
    const result=JSON.parse(first.body);
    assert.equal(result.scenarioCount,24);
    assert.equal(result.marketRouteCount,2);
    assert.equal(result.quoteCount,48);
    assert.equal(result.items.length,48);
    assert.equal(new Set(result.items.map((item:any)=>item.quoteRequestId)).size,48);
    assert.ok(result.items.every((item:any)=>item.rawProviderResponse?.payloadSha256?.length===64));
    assert.ok(result.items.every((item:any)=>item.normalisedQuote?.comparisonState==="DIRECTLY_COMPARABLE"));
    for(const item of exploration.items){
      const channels=result.items.filter((q:any)=>q.scenarioId===item.scenarioId).map((q:any)=>q.marketRoute.channelKey).sort();
      assert.deepEqual(channels,["DIRECT_SYNTHETIC","PCW_SYNTHETIC"]);
    }
    const second=await app.inject({method:"POST",url:quotePath});
    assert.equal(second.statusCode,200,second.body);
    const replay=JSON.parse(second.body);
    assert.equal(replay.created,false);
    assert.deepEqual(
      replay.items.map((x:any)=>[x.scenarioId,x.quoteRequestId,x.rawProviderResponse.rawProviderResponseId]),
      result.items.map((x:any)=>[x.scenarioId,x.quoteRequestId,x.rawProviderResponse.rawProviderResponseId]),
    );
    const db=await connect();
    try{
      const rows=(await db.query("SELECT count(*)::int AS n FROM quote_request")).rows;
      assert.equal(rows[0].n,48);
      for(const table of ["sp4_quote_request_lineage","raw_provider_response","normalised_quote"]){
        const n=(await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
        assert.equal(n,48,`unexpected ${table} count`);
      }
      const facts=(await db.query(
        "SELECT field_id,value_json,control_class FROM canonical_field_value WHERE risk_profile_version_id=$1 AND field_id IN ('vehicle_id','vehicle_mode','annual_mileage')",
        [profile.versionId],
      )).rows;
      assert.equal(facts.find((x:any)=>x.field_id==="vehicle_id").value_json,"VEH-SYN-005-NOT-PURCHASED");
      assert.equal(facts.find((x:any)=>x.field_id==="vehicle_mode").value_json,"PRE_PURCHASE");
      assert.equal(Number(facts.find((x:any)=>x.field_id==="annual_mileage").value_json),8000);
      assert.ok(facts.every((x:any)=>x.control_class==="F"));
      const audits=(await db.query("SELECT count(*)::int AS n FROM audit_event WHERE event_type='sp4_market_route_quote_linked'")).rows[0].n;
      assert.equal(audits,48);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM integrity_signal")).rows[0].n,0);
      const functionDef=(await db.query(
        "SELECT pg_get_functiondef('miqo_guard_quote_request_lineage()'::regprocedure) AS definition",
      )).rows[0].definition;
      for(const fragment of ["candidate_vehicle","CANDIDATE_VEHICLE_NOT_ELIGIBLE","PRE_PURCHASE","sp4_scenario_lineage"]){
        assert.ok(functionDef.includes(fragment),`missing SQL predicate: ${fragment}`);
      }
      // Immutable CI log receipt: both hashes derive from the fixture used and
      // the *applied* PostgreSQL function, not merely the checked-in SQL file.
      console.log("SIM_G3_R1_SYN005_C4_RECEIPT "+JSON.stringify({
        classification:"SYNTHETIC_ISOLATED_POSTGRES",
        node:process.version,
        correctionHead:process.env.GITHUB_SHA??"LOCAL_UNPINNED",
        migration:"0014_sp4_prequote_candidate_alignment.sql",
        fixtureSha256:createHash("sha256").update(JSON.stringify(choices)).digest("hex"),
        appliedSqlFunctionSha256:createHash("sha256").update(functionDef).digest("hex"),
        generatedScenarios:exploration.items.length,
        quoteRequests:rows[0].n,
        rawResponses:48,
        normalisedQuotes:48,
        auditLinks:audits,
        inheritedBlockingSignals:0,
      }));
    }finally{await db.end();}
  }finally{await app.close();}
});

test("C3 negative: current-vehicle, unregistered, current-as-candidate and cross-profile choices never reach quote requests",async()=>{
  await reset();
  const app=await buildApp();
  try{
    const current=await createProfile(app,"CURRENT_VEHICLE","DRV-CURRENT","VEH-CURRENT");
    const currentObj=await objective(app,current.versionId);
    const currentAttempt=await explore(app,currentObj.customerObjectiveId,{candidate_vehicle:["VEH-NO"]});
    assert.equal(currentAttempt.items.length,0);
    assert.ok(currentAttempt.rejections.some((r:any)=>r.ruleId==="CONTROL_NOT_APPLICABLE"));
    const pre=await createProfile(app,"PRE_PURCHASE","DRV-PRE","VEH-PRE-CURRENT");
    await registerCandidate(app,pre.versionId,"VEH-REGISTERED","Electric");
    const preObj=await objective(app,pre.versionId);
    const unknown=await explore(app,preObj.customerObjectiveId,{candidate_vehicle:["VEH-UNKNOWN"]});
    assert.equal(unknown.items.length,0);
    assert.ok(unknown.rejections.some((r:any)=>r.ruleId==="UNKNOWN_CANDIDATE_VEHICLE"));
    const asCurrent=await explore(app,preObj.customerObjectiveId,{candidate_vehicle:["VEH-PRE-CURRENT"]});
    assert.equal(asCurrent.items.length,0);
    assert.ok(asCurrent.rejections.some((r:any)=>r.ruleId==="CURRENT_VEHICLE_CANNOT_BE_CANDIDATE"));
    const secondPre=await createProfile(app,"PRE_PURCHASE","DRV-PRE-2","VEH-PRE-2-CURRENT");
    const secondObj=await objective(app,secondPre.versionId);
    const cross=await explore(app,secondObj.customerObjectiveId,{candidate_vehicle:["VEH-REGISTERED"]});
    assert.equal(cross.items.length,0);
    assert.ok(cross.rejections.some((r:any)=>r.ruleId==="UNKNOWN_CANDIDATE_VEHICLE"));
    const db=await connect();
    try{
      assert.equal((await db.query("SELECT count(*)::int AS n FROM quote_request")).rows[0].n,0);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM raw_provider_response")).rows[0].n,0);
    }finally{await db.end();}
  }finally{await app.close();}
});

test("C3 negative: PostgreSQL still rejects forbidden factual deltas; candidate registry is immutable",async()=>{
  await reset();
  const app=await buildApp();
  try{
    const pre=await createProfile(app,"PRE_PURCHASE","DRV-NEG","VEH-CURRENT-NEG");
    await registerCandidate(app,pre.versionId,"VEH-VALID","Petrol");
    const obj=await objective(app,pre.versionId);
    const ex=await explore(app,obj.customerObjectiveId,{candidate_vehicle:["VEH-VALID"]});
    assert.equal(ex.items.length,1);
    const scenarioId=ex.items[0].scenarioId;
    const db=await connect();
    try{
      await db.query("BEGIN");
      try{
        await assert.rejects(
          ()=>db.query("INSERT INTO scenario_delta(scenario_delta_id,scenario_id,field_id,control_class,value_json) VALUES($1,$2,'annual_mileage','F','5000'::jsonb)",["SCD-NEG-FACT",scenarioId]),
          /scenario_delta_approved_o_field|scenario_delta.*control|CHECK constraint|violates check constraint|GENERATED_SCENARIO_IMMUTABLE/i,
        );
      }finally{await db.query("ROLLBACK");}
      await assert.rejects(
        ()=>db.query("UPDATE candidate_vehicle SET candidate_vehicle_id='TAMPERED' WHERE candidate_vehicle_id='VEH-VALID'"),
        /SP4_PROFILE_OPTIMISATION_EVIDENCE_IMMUTABLE/,
      );
      assert.equal((await db.query("SELECT count(*)::int AS n FROM quote_request")).rows[0].n,0);
    }finally{await db.end();}
  }finally{await app.close();}
});
