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


test("S4-G11 persists deterministic recommendation explainability with route and evidence provenance",async()=>{
  await reset();
  const app=await buildApp();
  const {profile,objective,exploration}=await prepare(app,"LOWEST_ANNUAL_PREMIUM");

  const response=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/recommendations",
  });
  assert.equal(response.statusCode,201);
  const recommendation=JSON.parse(response.body);

  const explanationResponse=await app.inject({
    method:"GET",
    url:"/recommendations/"+recommendation.recommendationSetId+"/explanation",
  });
  assert.equal(explanationResponse.statusCode,200);
  const explanation=JSON.parse(explanationResponse.body);

  assert.equal(explanation.recommendationSetId,recommendation.recommendationSetId);
  assert.equal(explanation.objectiveId,"LOWEST_ANNUAL_PREMIUM");
  assert.equal(explanation.objectiveVersion,recommendation.objectiveVersion);
  assert.equal(explanation.catalogueVersion,recommendation.catalogueVersion);
  assert.equal(explanation.policyFingerprint,recommendation.policyFingerprint);
  assert.equal(explanation.recommendationRuleVersion,"sp4-recommendation-v1");
  assert.equal(explanation.explanationRuleVersion,"sp4-explainability-v1");
  assert.equal(explanation.surfacedNormalisedQuoteId,recommendation.surfacedNormalisedQuoteId);
  assert.match(explanation.explanationFingerprint,/^[0-9a-f]{64}$/);
  assert.ok(Array.isArray(explanation.eligibleEvidence));
  assert.equal(explanation.eligibleEvidence.length,recommendation.eligible.length);
  assert.ok(Array.isArray(explanation.excludedEvidence));
  assert.ok(explanation.materialReasons.some((item:any)=>item.code==="CUSTOMER_OBJECTIVE_APPLIED"));
  assert.ok(explanation.materialReasons.some((item:any)=>item.code==="COMMERCIAL_INPUTS_EXCLUDED"));
  assert.ok(explanation.controls.length>0);
  assert.ok(explanation.controls.every((item:any)=>item.ruleVersion==="sp4-explainability-v1"));
  assert.ok(explanation.controls.every((item:any)=>item.source==="scenario_delta"));
  assert.ok(explanation.controls.every((item:any)=>item.customerCanChange===true));
  assert.ok(explanation.controls.every((item:any)=>item.providerChannelApplicability.marketRouteId===explanation.surfacedMarketRouteId));
  assert.ok(explanation.controls.every((item:any)=>Object.prototype.hasOwnProperty.call(item,"baselineValue")));
  assert.ok(explanation.controls.every((item:any)=>Object.prototype.hasOwnProperty.call(item,"scenarioValue")));

  const replay=await app.inject({
    method:"GET",
    url:"/recommendations/"+recommendation.recommendationSetId+"/explanation",
  });
  assert.equal(replay.statusCode,200);
  const replayExplanation=JSON.parse(replay.body);
  assert.equal(replayExplanation.explanationFingerprint,explanation.explanationFingerprint);
  assert.deepEqual(
    replayExplanation.controls.map((item:any)=>[item.fieldOrControl,item.explanationFingerprint]),
    explanation.controls.map((item:any)=>[item.fieldOrControl,item.explanationFingerprint]),
  );

  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  assert.equal(Number((await db.query(
    "SELECT count(*) AS count FROM audit_event WHERE event_type='sp4_recommendation_explanation_created' AND trace_id=$1",
    [profile.profileId],
  )).rows[0].count),1);
  await assert.rejects(
    ()=>db.query("UPDATE recommendation_explanation SET objective_id='LOWEST_FINANCE_COST' WHERE recommendation_set_id=$1",[recommendation.recommendationSetId]),
    /SP4_EXPLANATION_EVIDENCE_IMMUTABLE/,
  );
  const child=(await db.query(
    "SELECT explanation_id FROM optimisation_explanation WHERE recommendation_set_id=$1 LIMIT 1",
    [recommendation.recommendationSetId],
  )).rows[0];
  await assert.rejects(
    ()=>db.query("DELETE FROM optimisation_explanation WHERE explanation_id=$1",[child.explanation_id]),
    /SP4_EXPLANATION_EVIDENCE_IMMUTABLE/,
  );
  await db.end();
  await app.close();
});

test("S4-G12 changing synthetic remuneration metadata cannot alter scenarios, eligibility, objective metrics or recommendation outcome",async()=>{
  await reset();
  const app=await buildApp();
  const {objective,exploration}=await prepare(app,"LOWEST_ANNUAL_PREMIUM");

  const first=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/recommendations",
  });
  assert.equal(first.statusCode,201);
  const before=JSON.parse(first.body);

  const scenarioReplayBefore=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{voluntary_excess:[250,500],payment_structure:["ANNUAL","MONTHLY"]}},
  });
  assert.equal(scenarioReplayBefore.statusCode,200);
  const scenariosBefore=JSON.parse(scenarioReplayBefore.body);

  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  const routes=(await db.query("SELECT market_route_id FROM market_route ORDER BY market_route_id")).rows;
  for(const [index,route] of routes.entries()){
    await db.query(
      "INSERT INTO synthetic_commercial_metadata(synthetic_commercial_metadata_id,market_route_id,commercial_version,provider_remuneration_pence,introducer_remuneration_pence,referral_revenue_pence,metadata_json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
      ["SCM-A-"+index,route.market_route_id,"commercial-a",999999-index*999999,500000,250000,JSON.stringify({label:"synthetic-a"})],
    );
    await db.query(
      "INSERT INTO synthetic_commercial_metadata(synthetic_commercial_metadata_id,market_route_id,commercial_version,provider_remuneration_pence,introducer_remuneration_pence,referral_revenue_pence,metadata_json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
      ["SCM-B-"+index,route.market_route_id,"commercial-b",index*999999,0,900000,JSON.stringify({label:"synthetic-b"})],
    );
  }

  const forbiddenColumns=(await db.query(`
    SELECT table_name,column_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name IN ('scenario','scenario_delta','normalised_quote','recommendation_set','recommendation_quote_evidence')
      AND (
        column_name ILIKE '%commission%'
        OR column_name ILIKE '%remuneration%'
        OR column_name ILIKE '%margin%'
        OR column_name ILIKE '%referral_revenue%'
      )
  `)).rows;
  assert.deepEqual(forbiddenColumns,[]);
  await db.end();

  const scenarioReplayAfter=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{voluntary_excess:[250,500],payment_structure:["ANNUAL","MONTHLY"]}},
  });
  assert.equal(scenarioReplayAfter.statusCode,200);
  const scenariosAfter=JSON.parse(scenarioReplayAfter.body);
  assert.equal(scenariosAfter.explorationFingerprint,scenariosBefore.explorationFingerprint);
  assert.deepEqual(
    scenariosAfter.items.map((item:any)=>[item.scenarioId,item.candidateFingerprint]),
    scenariosBefore.items.map((item:any)=>[item.scenarioId,item.candidateFingerprint]),
  );

  const afterResponse=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/recommendations",
  });
  assert.equal(afterResponse.statusCode,200);
  const after=JSON.parse(afterResponse.body);

  assert.equal(after.recommendationFingerprint,before.recommendationFingerprint);
  assert.equal(after.surfacedNormalisedQuoteId,before.surfacedNormalisedQuoteId);
  assert.deepEqual(
    after.eligible.map((item:any)=>[item.normalisedQuoteId,item.ordinal,item.objectiveMetric,item.objectiveMetricValuePence]),
    before.eligible.map((item:any)=>[item.normalisedQuoteId,item.ordinal,item.objectiveMetric,item.objectiveMetricValuePence]),
  );
  assert.deepEqual(
    after.excluded.map((item:any)=>[item.normalisedQuoteId,item.exclusionReason]),
    before.excluded.map((item:any)=>[item.normalisedQuoteId,item.exclusionReason]),
  );

  await app.close();
});
