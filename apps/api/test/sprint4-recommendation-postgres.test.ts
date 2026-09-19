import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE recommendation_quote_evidence, recommendation_set, occupation_taxonomy_mapping, candidate_vehicle, sp4_quote_request_lineage, market_route, scenario_generation_rejection, sp4_scenario_lineage, customer_objective, audit_event, integrity_signal, prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function prepare(app:any,objectiveId:string){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [
    ["main_driver_id","DRV-SP4-REC"],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
  ] as const){
    assert.equal((await app.inject({
      method:"PUT",
      url:"/profile-versions/"+profile.versionId+"/facts/"+fieldId,
      payload:{value},
    })).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);

  const objectiveResponse=await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/customer-objectives",
    payload:{objectiveId},
  });
  assert.equal(objectiveResponse.statusCode,201);
  const objective=JSON.parse(objectiveResponse.body).item;

  const explorationResponse=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{voluntary_excess:[250,500],payment_structure:["ANNUAL","MONTHLY"]}},
  });
  assert.equal(explorationResponse.statusCode,201);
  const exploration=JSON.parse(explorationResponse.body);
  assert.equal(exploration.items.length,4);

  const routes=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/market-route-quotes",
  });
  assert.equal(routes.statusCode,201);
  assert.equal(JSON.parse(routes.body).quoteCount,8);

  return {profile,objective,exploration};
}

test("S4-G9 persists deterministic versioned RecommendationSet with reproducible eligible evidence",async()=>{
  await reset();
  const app=await buildApp();
  const {profile,objective,exploration}=await prepare(app,"LOWEST_ANNUAL_PREMIUM");

  const first=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/recommendations",
  });
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.objectiveId,"LOWEST_ANNUAL_PREMIUM");
  assert.equal(one.recommendationRuleVersion,"sp4-recommendation-v1");
  assert.match(one.recommendationFingerprint,/^[0-9a-f]{64}$/);
  assert.equal(one.eligible.length,8);
  assert.equal(one.excluded.length,0);
  assert.equal(one.eligible[0].objectiveMetric,"annual_cash_premium_pence");
  assert.equal(one.eligible[0].objectiveMetricValuePence,70140);
  assert.equal(one.surfacedNormalisedQuoteId,one.eligible[0].normalisedQuoteId);
  assert.equal((one as any).effectiveCostPence,undefined);
  assert.ok(one.eligible.every((item:any)=>(item.evidence as any).effectiveCostPence===undefined));

  const replay=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/recommendations",
  });
  assert.equal(replay.statusCode,200);
  const two=JSON.parse(replay.body);
  assert.equal(two.created,false);
  assert.equal(two.recommendationSetId,one.recommendationSetId);
  assert.equal(two.recommendationFingerprint,one.recommendationFingerprint);
  assert.deepEqual(
    two.eligible.map((item:any)=>[item.normalisedQuoteId,item.ordinal,item.objectiveMetricValuePence]),
    one.eligible.map((item:any)=>[item.normalisedQuoteId,item.ordinal,item.objectiveMetricValuePence]),
  );

  const listed=await app.inject({
    method:"GET",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/recommendations",
  });
  assert.equal(listed.statusCode,200);
  assert.equal(JSON.parse(listed.body).recommendationSetId,one.recommendationSetId);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  assert.equal(Number((await c.query(
    "SELECT count(*) AS count FROM recommendation_quote_evidence WHERE recommendation_set_id=$1 AND evidence_status='ELIGIBLE'",
    [one.recommendationSetId],
  )).rows[0].count),8);
  assert.equal(Number((await c.query(
    "SELECT count(*) AS count FROM audit_event WHERE event_type='sp4_recommendation_set_created' AND trace_id=$1",
    [profile.profileId],
  )).rows[0].count),1);
  await assert.rejects(
    ()=>c.query("UPDATE recommendation_set SET objective_id='LOWEST_FINANCE_COST' WHERE recommendation_set_id=$1",[one.recommendationSetId]),
    /SP4_RECOMMENDATION_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});

test("S4-G9 monthly objective persists eligible monthly quotes and explicit annual exclusions",async()=>{
  await reset();
  const app=await buildApp();
  const {objective,exploration}=await prepare(app,"LOWEST_MONTHLY_COMMITMENT");

  const response=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/recommendations",
  });
  assert.equal(response.statusCode,201);
  const recommendation=JSON.parse(response.body);
  assert.equal(recommendation.eligible.length,4);
  assert.equal(recommendation.excluded.length,4);
  assert.ok(recommendation.eligible.every((item:any)=>item.objectiveMetric==="monthly_commitment_pence"));
  assert.ok(recommendation.excluded.every((item:any)=>item.exclusionReason==="PAYMENT_STRUCTURE_NOT_MONTHLY"));
  assert.equal(recommendation.eligible[0].objectiveMetricValuePence,5845);
  assert.ok(recommendation.eligible.every((item:any)=>item.evidence.paymentStructure==="MONTHLY"));
  assert.ok(recommendation.excluded.every((item:any)=>item.evidence.paymentStructure==="ANNUAL"));
  assert.ok(recommendation.eligible.every((item:any)=>(item.evidence as any).effectiveCostPence===undefined));

  await app.close();
});
