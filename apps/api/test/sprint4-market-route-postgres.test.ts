import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE scenario_generation_rejection, sp4_quote_request_lineage, market_route, sp4_scenario_lineage, customer_objective, optimisation_catalogue_version, audit_event, integrity_signal, prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function seed(app:any){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [
    ["main_driver_id","DRV-SP4-ROUTE"],
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
    payload:{objectiveId:"LOWEST_ANNUAL_PREMIUM"},
  });
  assert.equal(objectiveResponse.statusCode,201);
  const objective=JSON.parse(objectiveResponse.body).item;

  const explorationResponse=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations",
    payload:{choices:{voluntary_excess:[250,500]}},
  });
  assert.equal(explorationResponse.statusCode,201);
  const exploration=JSON.parse(explorationResponse.body);
  assert.equal(exploration.items.length,2);
  return {profile,objective,exploration};
}

test("S4-G5 MarketRoute remains separate from facts and ScenarioDelta while preserving route metadata",async()=>{
  await reset();
  const app=await buildApp();
  const {profile,objective,exploration}=await seed(app);

  const routesResponse=await app.inject({method:"GET",url:"/market-routes/synthetic"});
  assert.equal(routesResponse.statusCode,200);
  const routes=JSON.parse(routesResponse.body).items;
  assert.equal(routes.length,2);
  assert.deepEqual(routes.map((route:any)=>route.channelKey).sort(),["DIRECT_SYNTHETIC","PCW_SYNTHETIC"]);
  assert.ok(routes.every((route:any)=>route.providerKey==="MOCK-PROVIDER-001"));
  assert.ok(routes.every((route:any)=>route.synthetic===true));
  assert.ok(routes.every((route:any)=>route.routeFingerprint.length===64));

  const quotedResponse=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/market-route-quotes",
  });
  assert.equal(quotedResponse.statusCode,201);
  const quoted=JSON.parse(quotedResponse.body);
  assert.equal(quoted.scenarioCount,2);
  assert.equal(quoted.marketRouteCount,2);
  assert.equal(quoted.quoteCount,4);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const forbiddenDeltas=Number((await c.query(
    "SELECT count(*) AS count FROM scenario_delta WHERE field_id IN ('provider','provider_key','distribution_channel','channel_key')"
  )).rows[0].count);
  assert.equal(forbiddenDeltas,0);

  const forbiddenFacts=Number((await c.query(
    "SELECT count(*) AS count FROM canonical_field_value WHERE risk_profile_version_id=$1 AND field_id IN ('provider','provider_key','distribution_channel','channel_key')",
    [profile.versionId],
  )).rows[0].count);
  assert.equal(forbiddenFacts,0);

  const mileage=(await c.query(
    "SELECT value_json FROM canonical_field_value WHERE risk_profile_version_id=$1 AND field_id='annual_mileage'",
    [profile.versionId],
  )).rows[0].value_json;
  assert.equal(Number(mileage),8000);

  await assert.rejects(
    ()=>c.query("UPDATE market_route SET mapping_version='tampered' WHERE market_route_id=$1",[routes[0].marketRouteId]),
    /SP4_ROUTE_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});

test("S4-G6 multi-route synthetic quotation preserves exact scenario route request raw and normalised lineage",async()=>{
  await reset();
  const app=await buildApp();
  const {profile,objective,exploration}=await seed(app);

  const first=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/market-route-quotes",
  });
  assert.equal(first.statusCode,201);
  const one=JSON.parse(first.body);
  assert.equal(one.created,true);
  assert.equal(one.quoteCount,4);
  assert.equal(one.items.length,4);

  const scenarioIds=[...new Set(one.items.map((item:any)=>item.scenarioId))];
  const routeIds=[...new Set(one.items.map((item:any)=>item.marketRoute.marketRouteId))];
  assert.equal(scenarioIds.length,2);
  assert.equal(routeIds.length,2);
  for(const scenarioId of scenarioIds){
    const items=one.items.filter((item:any)=>item.scenarioId===scenarioId);
    assert.equal(items.length,2);
    assert.deepEqual(items.map((item:any)=>item.marketRoute.channelKey).sort(),["DIRECT_SYNTHETIC","PCW_SYNTHETIC"]);
  }

  assert.equal(new Set(one.items.map((item:any)=>item.quoteRequestId)).size,4);
  assert.equal(new Set(one.items.map((item:any)=>item.requestFingerprint)).size,4);
  assert.equal(new Set(one.items.map((item:any)=>item.rawProviderResponse.rawProviderResponseId)).size,4);
  assert.equal(new Set(one.items.map((item:any)=>item.rawProviderResponse.payloadSha256)).size,4);
  assert.equal(new Set(one.items.map((item:any)=>item.normalisedQuote.normalisedQuoteId)).size,4);
  assert.ok(one.items.every((item:any)=>item.riskProfileVersionId===profile.versionId));
  assert.ok(one.items.every((item:any)=>item.customerObjectiveId===objective.customerObjectiveId));
  assert.ok(one.items.every((item:any)=>item.normalisedQuote.comparisonState==="DIRECTLY_COMPARABLE"));
  assert.ok(one.items.every((item:any)=>item.normalisedQuote.normalisationVersion==="sp2-normaliser-v1"));

  const replay=await app.inject({
    method:"POST",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/market-route-quotes",
  });
  assert.equal(replay.statusCode,200);
  const two=JSON.parse(replay.body);
  assert.equal(two.created,false);
  assert.deepEqual(
    two.items.map((item:any)=>[
      item.scenarioId,item.marketRoute.marketRouteId,item.quoteRequestId,
      item.rawProviderResponse.rawProviderResponseId,item.normalisedQuote.normalisedQuoteId,
    ]),
    one.items.map((item:any)=>[
      item.scenarioId,item.marketRoute.marketRouteId,item.quoteRequestId,
      item.rawProviderResponse.rawProviderResponseId,item.normalisedQuote.normalisedQuoteId,
    ]),
  );

  const listed=await app.inject({
    method:"GET",
    url:"/customer-objectives/"+objective.customerObjectiveId+"/scenario-explorations/"+exploration.explorationFingerprint+"/market-route-quotes",
  });
  assert.equal(listed.statusCode,200);
  const listedBody=JSON.parse(listed.body);
  assert.deepEqual(
    listedBody.items.map((item:any)=>item.quoteRequestId).sort(),
    one.items.map((item:any)=>item.quoteRequestId).sort(),
  );

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const rows=(await c.query(
    "SELECT l.quote_request_id,l.scenario_id,l.risk_profile_version_id,l.customer_objective_id,l.route_fingerprint,r.market_route_id,r.provider_key,r.channel_key,r.adapter_version,r.mapping_version,q.provider_key AS q_provider,q.channel_key AS q_channel,q.adapter_version AS q_adapter,q.mapping_version AS q_mapping,raw.raw_provider_response_id,raw.payload_sha256,n.normalised_quote_id,n.normalisation_fingerprint,n.comparison_state FROM sp4_quote_request_lineage l JOIN market_route r ON r.market_route_id=l.market_route_id JOIN quote_request q ON q.quote_request_id=l.quote_request_id JOIN raw_provider_response raw ON raw.quote_request_id=q.quote_request_id JOIN normalised_quote n ON n.raw_provider_response_id=raw.raw_provider_response_id WHERE l.customer_objective_id=$1 ORDER BY l.scenario_id,r.route_key",
    [objective.customerObjectiveId],
  )).rows;
  assert.equal(rows.length,4);
  assert.ok(rows.every((row:any)=>row.risk_profile_version_id===profile.versionId));
  assert.ok(rows.every((row:any)=>row.provider_key===row.q_provider));
  assert.ok(rows.every((row:any)=>row.channel_key===row.q_channel));
  assert.ok(rows.every((row:any)=>row.adapter_version===row.q_adapter));
  assert.ok(rows.every((row:any)=>row.mapping_version===row.q_mapping));
  assert.ok(rows.every((row:any)=>row.comparison_state==="DIRECTLY_COMPARABLE"));

  const auditCount=Number((await c.query(
    "SELECT count(*) AS count FROM audit_event WHERE event_type='sp4_market_route_quote_linked' AND trace_id=$1",
    [profile.profileId],
  )).rows[0].count);
  assert.equal(auditCount,4);

  await assert.rejects(
    ()=>c.query("UPDATE sp4_quote_request_lineage SET orchestration_version='tampered' WHERE quote_request_id=$1",[rows[0].quote_request_id]),
    /SP4_ROUTE_EVIDENCE_IMMUTABLE/,
  );
  await c.end();
  await app.close();
});
