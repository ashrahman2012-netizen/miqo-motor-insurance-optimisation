import test from "node:test";
import assert from "node:assert/strict";
import {buildApp} from "../src/server.ts";

async function prepare(app:any,objectiveId="LOWEST_ANNUAL_PREMIUM"){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id","DRV-001E"],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    assert.equal((await app.inject({method:"PUT",url:"/profile-versions/"+profile.versionId+"/facts/"+fieldId,payload:{value}})).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);
  const objective=JSON.parse((await app.inject({
    method:"POST",url:"/profile-versions/"+profile.versionId+"/customer-objectives",payload:{objectiveId},
  })).body).item;
  const exploration=JSON.parse((await app.inject({
    method:"POST",url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{voluntary_excess:[250,500],payment_structure:["ANNUAL","MONTHLY"]}},
  })).body);
  return {profile,objective,exploration};
}

test("BUILD-001E comparison is read-only until route evidence exists and does not create a RecommendationSet",async()=>{
  const app=await buildApp();
  const {objective,exploration}=await prepare(app);
  const base="/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint;

  const empty=await app.inject({method:"GET",url:base+"/quote-comparison"});
  assert.equal(empty.statusCode,200);
  const emptyBody=JSON.parse(empty.body);
  assert.equal(emptyBody.quoteCount,0);
  assert.equal(emptyBody.eligible.length,0);
  assert.equal(emptyBody.excluded.length,0);

  const routes=await app.inject({method:"POST",url:base+"/market-route-quotes"});
  assert.equal(routes.statusCode,201);

  const response=await app.inject({method:"GET",url:base+"/quote-comparison"});
  assert.equal(response.statusCode,200);
  const body=JSON.parse(response.body);
  assert.equal(body.comparisonRuleVersion,"sp4-objective-comparison-v1");
  assert.equal(body.objective.objectiveId,"LOWEST_ANNUAL_PREMIUM");
  assert.equal(body.eligible.length,8);
  assert.equal(body.excluded.length,0);
  assert.deepEqual(body.eligible.map((item:any)=>item.ordinal),[1,2,3,4,5,6,7,8]);
  assert.equal((body as any).surfacedNormalisedQuoteId,undefined);

  const recommendation=await app.inject({method:"GET",url:base+"/recommendations"});
  assert.equal(recommendation.statusCode,422);
  assert.equal(JSON.parse(recommendation.body).error,"SP4_RECOMMENDATION_SET_NOT_FOUND");
  await app.close();
});

test("BUILD-001E monthly comparison excludes annual scenarios explicitly",async()=>{
  const app=await buildApp();
  const {objective,exploration}=await prepare(app,"LOWEST_MONTHLY_COMMITMENT");
  const base="/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint;
  assert.equal((await app.inject({method:"POST",url:base+"/market-route-quotes"})).statusCode,201);
  const response=await app.inject({method:"GET",url:base+"/quote-comparison"});
  assert.equal(response.statusCode,200);
  const body=JSON.parse(response.body);
  assert.equal(body.eligible.length,4);
  assert.equal(body.excluded.length,4);
  assert.ok(body.eligible.every((item:any)=>item.objectiveMetric==="monthly_commitment_pence"));
  assert.ok(body.excluded.every((item:any)=>item.exclusionReason==="PAYMENT_STRUCTURE_NOT_MONTHLY"));
  await app.close();
});
