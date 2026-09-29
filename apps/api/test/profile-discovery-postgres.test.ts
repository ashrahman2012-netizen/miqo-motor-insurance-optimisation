import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";

const {Client}=pg;

async function reset(){
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  await client.query("TRUNCATE audit_event, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await client.end();
}

async function counts(){
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  const row=(await client.query(
    "SELECT (SELECT count(*) FROM profile) AS profiles, (SELECT count(*) FROM risk_profile_version) AS versions, (SELECT count(*) FROM canonical_field_value) AS facts, (SELECT count(*) FROM audit_event) AS audit"
  )).rows[0];
  await client.end();
  return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,Number(value)]));
}

async function seedFacts(app:any,profile:{profileId:string;versionId:string},driver:string){
  for(const [fieldId,value] of [
    ["main_driver_id",driver],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
  ] as const){
    const response=await app.inject({
      method:"PUT",
      url:"/profile-versions/"+profile.versionId+"/facts/"+fieldId,
      payload:{value},
    });
    assert.equal(response.statusCode,200);
  }
}

test("R2-PROFILE-DISCOVERY-001 returns an empty read-only list",async()=>{
  await reset();
  const app=await buildApp();
  const response=await app.inject({method:"GET",url:"/profiles"});
  assert.equal(response.statusCode,200);
  assert.deepEqual(JSON.parse(response.body),{items:[]});
  await app.close();
});

test("R2-PROFILE-DISCOVERY-002 returns deterministic newest-first summaries with the exact latest version",async()=>{
  await reset();
  const app=await buildApp();

  const older=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  const newer=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);

  await seedFacts(app,older,"DRV-SYN-R2-OLDER");
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+older.profileId+"/lock"})).statusCode,200);
  const correction=JSON.parse((await app.inject({
    method:"POST",
    url:"/profiles/"+older.profileId+"/corrections",
    payload:{fieldId:"annual_mileage",value:6000},
  })).body);

  await seedFacts(app,newer,"DRV-SYN-R2-NEWER");
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+newer.profileId+"/lock"})).statusCode,200);

  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  await client.query("UPDATE profile SET created_at=$1 WHERE profile_id=$2",["2026-01-01T00:00:00.000Z",older.profileId]);
  await client.query("UPDATE profile SET created_at=$1 WHERE profile_id=$2",["2026-02-01T00:00:00.000Z",newer.profileId]);
  await client.end();

  const response=await app.inject({method:"GET",url:"/profiles"});
  assert.equal(response.statusCode,200);
  const body=JSON.parse(response.body);

  assert.deepEqual(body.items.map((item:any)=>item.profileId),[newer.profileId,older.profileId]);

  assert.deepEqual(body.items[0],{
    profileId:newer.profileId,
    createdAt:"2026-02-01T00:00:00.000Z",
    currentVersion:{
      versionId:newer.versionId,
      versionNo:1,
      status:"LOCKED",
      lockedAt:body.items[0].currentVersion.lockedAt,
    },
  });
  assert.ok(body.items[0].currentVersion.lockedAt);

  assert.deepEqual(body.items[1],{
    profileId:older.profileId,
    createdAt:"2026-01-01T00:00:00.000Z",
    currentVersion:{
      versionId:correction.versionId,
      versionNo:2,
      status:"DRAFT",
      lockedAt:null,
    },
  });

  for(const item of body.items){
    assert.equal("values" in item,false);
    assert.equal("values" in item.currentVersion,false);
  }

  await app.close();
});

test("R2-PROFILE-DISCOVERY-003 performs no profile, version, factual or audit mutation",async()=>{
  await reset();
  const app=await buildApp();
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  await seedFacts(app,profile,"DRV-SYN-R2-READONLY");
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);

  const before=await counts();
  const first=await app.inject({method:"GET",url:"/profiles"});
  const second=await app.inject({method:"GET",url:"/profiles"});
  const after=await counts();

  assert.equal(first.statusCode,200);
  assert.equal(second.statusCode,200);
  assert.deepEqual(JSON.parse(second.body),JSON.parse(first.body));
  assert.deepEqual(after,before);

  await app.close();
});

test("R2-PROFILE-DISCOVERY-004 survives API restart with the same retained profile summary",async()=>{
  await reset();
  let app=await buildApp();
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  await seedFacts(app,profile,"DRV-SYN-R2-RESTART");
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);

  const before=JSON.parse((await app.inject({method:"GET",url:"/profiles"})).body);
  await app.close();

  app=await buildApp();
  const after=JSON.parse((await app.inject({method:"GET",url:"/profiles"})).body);
  assert.deepEqual(after,before);
  assert.equal(after.items[0].profileId,profile.profileId);
  assert.equal(after.items[0].currentVersion.versionId,profile.versionId);
  assert.equal(after.items[0].currentVersion.status,"LOCKED");

  await app.close();
});

test("R2-PROFILE-DISCOVERY-005 fails closed if a profile has no version",async()=>{
  await reset();
  const client=new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  await client.query("INSERT INTO customer(customer_id,synthetic) VALUES($1,true)",["CUS-SYN-R2-CORRUPT"]);
  await client.query("INSERT INTO profile(profile_id,customer_id) VALUES($1,$2)",["PRO-SYN-R2-CORRUPT","CUS-SYN-R2-CORRUPT"]);
  await client.end();

  const app=await buildApp();
  const response=await app.inject({method:"GET",url:"/profiles"});
  assert.equal(response.statusCode,422);
  assert.equal(JSON.parse(response.body).error,"Profile version not found");
  await app.close();
});

test("R2-PROFILE-DISCOVERY-006 remains protected by the local runtime capability",async()=>{
  await reset();
  const previous=process.env.MIQO_LOCAL_RUNTIME_CAPABILITY;
  process.env.MIQO_LOCAL_RUNTIME_CAPABILITY="r2-test-capability";

  try{
    const app=await buildApp();

    const denied=await app.inject({
      method:"GET",
      url:"/profiles",
      headers:{origin:"http://127.0.0.1:3000"},
    });
    assert.equal(denied.statusCode,401);
    assert.equal(JSON.parse(denied.body).error,"local_runtime_capability_required");

    const allowed=await app.inject({
      method:"GET",
      url:"/profiles",
      headers:{
        origin:"http://127.0.0.1:3000",
        cookie:"miqo_runtime_capability=r2-test-capability",
      },
    });
    assert.equal(allowed.statusCode,200);
    assert.deepEqual(JSON.parse(allowed.body),{items:[]});

    await app.close();
  }finally{
    if(previous===undefined) delete process.env.MIQO_LOCAL_RUNTIME_CAPABILITY;
    else process.env.MIQO_LOCAL_RUNTIME_CAPABILITY=previous;
  }
});
