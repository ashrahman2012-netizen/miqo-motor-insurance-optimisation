import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";

const {Client}=pg;
const choices={voluntary_excess:[250,500],payment_structure:["ANNUAL","MONTHLY"]};

async function reset(){
  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  await db.query("TRUNCATE optimisation_explanation, recommendation_explanation, synthetic_commercial_metadata, recommendation_quote_evidence, recommendation_set, occupation_taxonomy_mapping, candidate_vehicle, sp4_quote_request_lineage, market_route, scenario_generation_rejection, sp4_scenario_lineage, customer_objective, audit_event, integrity_signal, prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await db.end();
}

async function rowCounts(){
  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  const tables=[
    "customer_objective","sp4_scenario_lineage","scenario_delta","market_route",
    "sp4_quote_request_lineage","quote_request","raw_provider_response","normalised_quote",
    "recommendation_set","recommendation_quote_evidence","recommendation_explanation","optimisation_explanation",
  ];
  const counts:Record<string,number>={};
  for(const table of tables){
    counts[table]=Number((await db.query(`SELECT count(*) AS count FROM ${table}`)).rows[0].count);
  }
  await db.end();
  return counts;
}

function canonicalSnapshot(args:{objective:any;catalogue:any;exploration:any;quotes:any;recommendation:any;explanation:any}){
  const {objective,catalogue,exploration,quotes,recommendation,explanation}=args;
  return {
    objective:{
      customerObjectiveId:objective.customerObjectiveId,
      riskProfileVersionId:objective.riskProfileVersionId,
      objectiveId:objective.objectiveId,
      objectiveVersion:objective.objectiveVersion,
      catalogueVersion:objective.catalogueVersion,
      policyFingerprint:objective.policyFingerprint,
    },
    catalogue:{
      catalogueVersion:catalogue.catalogueVersion,
      objectiveModelVersion:catalogue.objectiveModelVersion,
      policyFingerprint:catalogue.policyFingerprint,
      catalogue:catalogue.catalogue,
      objectiveModel:catalogue.objectiveModel,
    },
    exploration:{
      explorationFingerprint:exploration.explorationFingerprint,
      generationVersion:exploration.generationVersion,
      scenarios:exploration.items.map((item:any)=>({
        scenarioId:item.scenarioId,
        riskProfileVersionId:item.riskProfileVersionId,
        customerObjectiveId:item.customerObjectiveId,
        generationVersion:item.generationVersion,
        generationOrdinal:item.generationOrdinal,
        candidateFingerprint:item.candidateFingerprint,
        catalogueVersion:item.catalogueVersion,
        policyFingerprint:item.policyFingerprint,
        deltas:item.deltas,
      })),
      rejections:exploration.rejections,
    },
    quotes:quotes.items
      .map((item:any)=>({
        orchestrationVersion:item.orchestrationVersion,
        customerObjectiveId:item.customerObjectiveId,
        riskProfileVersionId:item.riskProfileVersionId,
        scenarioId:item.scenarioId,
        marketRoute:item.marketRoute,
        quoteRunId:item.quoteRunId,
        quoteRequestId:item.quoteRequestId,
        requestFingerprint:item.requestFingerprint,
        rawProviderResponse:item.rawProviderResponse,
        normalisedQuote:item.normalisedQuote,
      }))
      .sort((a:any,b:any)=>
        a.scenarioId.localeCompare(b.scenarioId)
        || a.marketRoute.routeKey.localeCompare(b.marketRoute.routeKey)
      ),
    recommendation:{
      recommendationSetId:recommendation.recommendationSetId,
      customerObjectiveId:recommendation.customerObjectiveId,
      riskProfileVersionId:recommendation.riskProfileVersionId,
      explorationFingerprint:recommendation.explorationFingerprint,
      objectiveId:recommendation.objectiveId,
      objectiveVersion:recommendation.objectiveVersion,
      catalogueVersion:recommendation.catalogueVersion,
      policyFingerprint:recommendation.policyFingerprint,
      recommendationRuleVersion:recommendation.recommendationRuleVersion,
      recommendationFingerprint:recommendation.recommendationFingerprint,
      surfacedNormalisedQuoteId:recommendation.surfacedNormalisedQuoteId,
      eligible:recommendation.eligible,
      excluded:recommendation.excluded,
    },
    explanation:{
      recommendationExplanationId:explanation.recommendationExplanationId,
      recommendationSetId:explanation.recommendationSetId,
      objectiveId:explanation.objectiveId,
      objectiveVersion:explanation.objectiveVersion,
      catalogueVersion:explanation.catalogueVersion,
      policyFingerprint:explanation.policyFingerprint,
      recommendationRuleVersion:explanation.recommendationRuleVersion,
      explanationRuleVersion:explanation.explanationRuleVersion,
      surfacedScenarioId:explanation.surfacedScenarioId,
      surfacedMarketRouteId:explanation.surfacedMarketRouteId,
      surfacedNormalisedQuoteId:explanation.surfacedNormalisedQuoteId,
      eligibleEvidence:explanation.eligibleEvidence,
      excludedEvidence:explanation.excludedEvidence,
      materialReasons:explanation.materialReasons,
      explanationFingerprint:explanation.explanationFingerprint,
      controls:explanation.controls,
    },
  };
}

test("S4-G13 preserves the exact Sprint 4 provenance lineage across a genuine application/database-client restart",async()=>{
  await reset();
  let app=await buildApp();

  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [
    ["main_driver_id","DRV-SP4-RESTART"],
    ["annual_mileage",8000],
    ["licence_held_since","2018-04-16"],
  ] as const){
    assert.equal((await app.inject({
      method:"PUT",url:`/profile-versions/${profile.versionId}/facts/${fieldId}`,payload:{value},
    })).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:`/profiles/${profile.profileId}/lock`})).statusCode,200);

  const objectiveResponse=await app.inject({
    method:"POST",url:`/profile-versions/${profile.versionId}/customer-objectives`,
    payload:{objectiveId:"LOWEST_ANNUAL_PREMIUM"},
  });
  assert.equal(objectiveResponse.statusCode,201);
  const objective=JSON.parse(objectiveResponse.body).item;
  const catalogueResponse=await app.inject({
    method:"GET",url:`/optimisation/catalogues/${objective.catalogueVersion}`,
  });
  assert.equal(catalogueResponse.statusCode,200);
  const catalogue=JSON.parse(catalogueResponse.body);

  const explorationResponse=await app.inject({
    method:"POST",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations`,payload:{choices},
  });
  assert.equal(explorationResponse.statusCode,201);
  const exploration=JSON.parse(explorationResponse.body);
  assert.equal(exploration.items.length,4);

  const quotesResponse=await app.inject({
    method:"POST",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations/${exploration.explorationFingerprint}/market-route-quotes`,
  });
  assert.equal(quotesResponse.statusCode,201);
  const quotes=JSON.parse(quotesResponse.body);
  assert.equal(quotes.items.length,8);

  const recommendationResponse=await app.inject({
    method:"POST",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations/${exploration.explorationFingerprint}/recommendations`,
  });
  assert.equal(recommendationResponse.statusCode,201);
  const recommendation=JSON.parse(recommendationResponse.body);

  const explanationResponse=await app.inject({
    method:"GET",url:`/recommendations/${recommendation.recommendationSetId}/explanation`,
  });
  assert.equal(explanationResponse.statusCode,200);
  const explanation=JSON.parse(explanationResponse.body);

  const before=canonicalSnapshot({objective,catalogue,exploration,quotes,recommendation,explanation});
  const countsBefore=await rowCounts();
  assert.deepEqual(countsBefore,{
    customer_objective:1,
    sp4_scenario_lineage:4,
    scenario_delta:8,
    market_route:2,
    sp4_quote_request_lineage:8,
    quote_request:8,
    raw_provider_response:8,
    normalised_quote:8,
    recommendation_set:1,
    recommendation_quote_evidence:8,
    recommendation_explanation:1,
    optimisation_explanation:2,
  });

  // Closing Fastify closes the application-owned PostgreSQL pool. Rebuilding it creates a new client.
  await app.close();
  app=await buildApp();

  const objectivesAfter=JSON.parse((await app.inject({
    method:"GET",url:`/profile-versions/${profile.versionId}/customer-objectives`,
  })).body);
  const objectiveAfter=objectivesAfter.items.find((item:any)=>item.customerObjectiveId===objective.customerObjectiveId);
  assert.ok(objectiveAfter);
  const catalogueAfter=JSON.parse((await app.inject({
    method:"GET",url:`/optimisation/catalogues/${objective.catalogueVersion}`,
  })).body);

  const explorationsAfter=JSON.parse((await app.inject({
    method:"GET",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations`,
  })).body);
  const explorationAfter=explorationsAfter.items.find((item:any)=>item.explorationFingerprint===exploration.explorationFingerprint);
  assert.ok(explorationAfter);

  const quotesAfter=JSON.parse((await app.inject({
    method:"GET",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations/${exploration.explorationFingerprint}/market-route-quotes`,
  })).body);
  const recommendationAfter=JSON.parse((await app.inject({
    method:"GET",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations/${exploration.explorationFingerprint}/recommendations`,
  })).body);
  const explanationAfter=JSON.parse((await app.inject({
    method:"GET",url:`/recommendations/${recommendation.recommendationSetId}/explanation`,
  })).body);

  assert.deepEqual(
    canonicalSnapshot({objective:objectiveAfter,catalogue:catalogueAfter,exploration:explorationAfter,quotes:quotesAfter,recommendation:recommendationAfter,explanation:explanationAfter}),
    before,
  );

  const replayExploration=await app.inject({
    method:"POST",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations`,payload:{choices},
  });
  const replayQuotes=await app.inject({
    method:"POST",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations/${exploration.explorationFingerprint}/market-route-quotes`,
  });
  const replayRecommendation=await app.inject({
    method:"POST",url:`/customer-objectives/${objective.customerObjectiveId}/scenario-explorations/${exploration.explorationFingerprint}/recommendations`,
  });
  assert.equal(replayExploration.statusCode,200);
  assert.equal(replayQuotes.statusCode,200);
  assert.equal(replayRecommendation.statusCode,200);
  assert.equal(JSON.parse(replayExploration.body).created,false);
  assert.equal(JSON.parse(replayQuotes.body).created,false);
  assert.equal(JSON.parse(replayRecommendation.body).created,false);

  const replayExplanation=JSON.parse((await app.inject({
    method:"GET",url:`/recommendations/${recommendation.recommendationSetId}/explanation`,
  })).body);
  assert.deepEqual(canonicalSnapshot({
    objective:objectiveAfter,
    catalogue:catalogueAfter,
    exploration:JSON.parse(replayExploration.body),
    quotes:JSON.parse(replayQuotes.body),
    recommendation:JSON.parse(replayRecommendation.body),
    explanation:replayExplanation,
  }),before);
  assert.deepEqual(await rowCounts(),countsBefore);

  await app.close();
});
