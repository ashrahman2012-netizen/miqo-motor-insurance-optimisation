import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildApp } from "../src/server.ts";
import {adminHeaders} from "./admin-auth-test-helper.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function createFullSprint2Chain(app:any){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);

  for(const [fieldId,value] of [
    ["main_driver_id","DRV-SYN-RESTART"],
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

  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);

  const preferencesResponse=await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/optimisation-preferences",
    payload:{
      voluntary_excess:500,
      payment_structure:"ANNUAL",
      policy_start_date:"2026-10-01",
      telematics_preference:true,
    },
  });
  assert.equal(preferencesResponse.statusCode,200);
  const preferences=JSON.parse(preferencesResponse.body);

  const generatedResponse=await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/scenarios/generate",
  });
  assert.equal(generatedResponse.statusCode,201);
  const generated=JSON.parse(generatedResponse.body);
  const scenario=generated.items[0];
  const frozenPreferences=JSON.parse((await app.inject({
    method:"GET",
    url:"/profile-versions/"+profile.versionId+"/optimisation-preferences",
  })).body);

  const preparedResponse=await app.inject({
    method:"POST",
    url:"/scenarios/"+scenario.scenarioId+"/quote-requests",
    payload:{providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"},
  });
  assert.equal(preparedResponse.statusCode,201);
  const prepared=JSON.parse(preparedResponse.body);

  const executedResponse=await app.inject({
    method:"POST",
    url:"/quote-requests/"+prepared.quoteRequestId+"/execute",
  });
  assert.equal(executedResponse.statusCode,201);
  const executed=JSON.parse(executedResponse.body);

  const normalisedResponse=await app.inject({
    method:"POST",
    url:"/raw-provider-responses/"+executed.item.rawProviderResponseId+"/normalise",
  });
  assert.equal(normalisedResponse.statusCode,201);
  const normalised=JSON.parse(normalisedResponse.body);

  return {profile,preferences:frozenPreferences,generated,scenario,prepared,executed,normalised};
}

test("SP2 full persisted chain survives API restart with identical lineage, hashes and values",async()=>{
  await reset();

  let app=await buildApp();
  const before=await createFullSprint2Chain(app);

  const beforeFacts=JSON.parse((await app.inject({
    method:"GET",
    url:"/profiles/"+before.profile.profileId+"/snapshot",
  })).body);

  await app.close();

  app=await buildApp();

  const afterPreferences=JSON.parse((await app.inject({
    method:"GET",
    url:"/profile-versions/"+before.profile.versionId+"/optimisation-preferences",
  })).body);

  const afterScenarios=JSON.parse((await app.inject({
    method:"GET",
    url:"/profile-versions/"+before.profile.versionId+"/scenarios/generated",
  })).body);

  const afterQuoteRequest=JSON.parse((await app.inject({
    method:"GET",
    url:"/quote-requests/"+before.prepared.quoteRequestId,
  })).body);

  const afterRaw=JSON.parse((await app.inject({
    method:"GET",
    url:"/desktop-admin/quote-requests/"+before.prepared.quoteRequestId+"/raw-response",
    headers:await adminHeaders(),
  })).body);

  const afterNormalised=JSON.parse((await app.inject({
    method:"GET",
    url:"/raw-provider-responses/"+before.executed.item.rawProviderResponseId+"/normalised-quotes",
  })).body);

  const afterFacts=JSON.parse((await app.inject({
    method:"GET",
    url:"/profiles/"+before.profile.profileId+"/snapshot",
  })).body);

  assert.equal(afterPreferences.riskProfileVersionId,before.profile.versionId);
  assert.deepEqual(
    afterPreferences.items.map((item:any)=>({
      preferenceId:item.preferenceId,
      key:item.key,
      value:item.value,
      frozenAt:item.frozenAt,
    })),
    before.preferences.items.map((item:any)=>({
      preferenceId:item.preferenceId,
      key:item.key,
      value:item.value,
      frozenAt:item.frozenAt,
    })),
  );
  assert.ok(afterPreferences.items.every((item:any)=>Boolean(item.frozenAt)));

  assert.equal(afterScenarios.items.length,1);
  const restartedScenario=afterScenarios.items[0];
  assert.equal(restartedScenario.scenarioId,before.scenario.scenarioId);
  assert.equal(restartedScenario.riskProfileVersionId,before.profile.versionId);
  assert.equal(restartedScenario.generationVersion,before.scenario.generationVersion);
  assert.equal(restartedScenario.generationFingerprint,before.generated.generationFingerprint);
  assert.equal(restartedScenario.generationOrdinal,before.scenario.generationOrdinal);
  assert.deepEqual(restartedScenario.preferenceSnapshot,before.scenario.preferenceSnapshot);
  assert.deepEqual(restartedScenario.deltas,before.scenario.deltas);

  assert.equal(afterQuoteRequest.quoteRunId,before.prepared.quoteRunId);
  assert.equal(afterQuoteRequest.quoteRequestId,before.prepared.quoteRequestId);
  assert.equal(afterQuoteRequest.riskProfileVersionId,before.profile.versionId);
  assert.equal(afterQuoteRequest.scenarioId,before.scenario.scenarioId);
  assert.equal(afterQuoteRequest.providerKey,"MOCK-PROVIDER-001");
  assert.equal(afterQuoteRequest.channel,"DIRECT_SYNTHETIC");
  assert.equal(afterQuoteRequest.adapterVersion,before.prepared.adapterVersion);
  assert.equal(afterQuoteRequest.mappingVersion,before.prepared.mappingVersion);
  assert.equal(afterQuoteRequest.requestFingerprint,before.prepared.requestFingerprint);

  assert.equal(afterRaw.rawProviderResponseId,before.executed.item.rawProviderResponseId);
  assert.equal(afterRaw.quoteRequestId,before.prepared.quoteRequestId);
  assert.equal(afterRaw.providerReference,before.executed.item.providerReference);
  assert.equal(afterRaw.payloadText,before.executed.item.payloadText);
  assert.equal(afterRaw.payloadSha256,before.executed.item.payloadSha256);
  assert.deepEqual(afterRaw.payload,before.executed.item.payload);

  assert.equal(afterNormalised.items.length,1);
  const restartedNormalised=afterNormalised.items[0];
  assert.equal(restartedNormalised.normalisedQuoteId,before.normalised.item.normalisedQuoteId);
  assert.equal(restartedNormalised.rawProviderResponseId,before.executed.item.rawProviderResponseId);
  assert.equal(restartedNormalised.normalisationVersion,before.normalised.item.normalisationVersion);
  assert.equal(restartedNormalised.normalisationFingerprint,before.normalised.item.normalisationFingerprint);
  assert.equal(restartedNormalised.comparisonState,"DIRECTLY_COMPARABLE");
  assert.equal(restartedNormalised.comparisonReason,before.normalised.item.comparisonReason);
  assert.equal(restartedNormalised.annualCashPremiumPence,70140);
  assert.equal(restartedNormalised.compulsoryExcessPence,35000);
  assert.equal(restartedNormalised.voluntaryExcessPence,50000);

  const lockedBefore=beforeFacts.versions.find((version:any)=>version.versionId===before.profile.versionId);
  const lockedAfter=afterFacts.versions.find((version:any)=>version.versionId===before.profile.versionId);
  assert.equal(lockedBefore.status,"LOCKED");
  assert.equal(lockedAfter.status,"LOCKED");
  assert.equal(lockedBefore.values.find((value:any)=>value.fieldId==="annual_mileage").value,8000);
  assert.equal(lockedAfter.values.find((value:any)=>value.fieldId==="annual_mileage").value,8000);

  const replayScenario=JSON.parse((await app.inject({
    method:"POST",
    url:"/profile-versions/"+before.profile.versionId+"/scenarios/generate",
  })).body);
  assert.equal(replayScenario.created,false);
  assert.equal(replayScenario.items[0].scenarioId,before.scenario.scenarioId);

  const replayQuote=JSON.parse((await app.inject({
    method:"POST",
    url:"/scenarios/"+before.scenario.scenarioId+"/quote-requests",
    payload:{providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"},
  })).body);
  assert.equal(replayQuote.created,false);
  assert.equal(replayQuote.quoteRunId,before.prepared.quoteRunId);
  assert.equal(replayQuote.quoteRequestId,before.prepared.quoteRequestId);

  const replayProvider=JSON.parse((await app.inject({
    method:"POST",
    url:"/quote-requests/"+before.prepared.quoteRequestId+"/execute",
  })).body);
  assert.equal(replayProvider.created,false);
  assert.equal(replayProvider.item.rawProviderResponseId,before.executed.item.rawProviderResponseId);
  assert.equal(replayProvider.item.payloadSha256,before.executed.item.payloadSha256);

  const replayNormalisation=JSON.parse((await app.inject({
    method:"POST",
    url:"/raw-provider-responses/"+before.executed.item.rawProviderResponseId+"/normalise",
  })).body);
  assert.equal(replayNormalisation.created,false);
  assert.equal(replayNormalisation.item.normalisedQuoteId,before.normalised.item.normalisedQuoteId);
  assert.equal(replayNormalisation.item.normalisationFingerprint,before.normalised.item.normalisationFingerprint);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const counts=(await c.query(
    "SELECT (SELECT count(*) FROM optimisation_preference) AS preferences, (SELECT count(*) FROM scenario) AS scenarios, (SELECT count(*) FROM quote_run) AS quote_runs, (SELECT count(*) FROM quote_request) AS quote_requests, (SELECT count(*) FROM raw_provider_response) AS raw_responses, (SELECT count(*) FROM normalised_quote) AS normalised_quotes"
  )).rows[0];
  assert.deepEqual(
    Object.fromEntries(Object.entries(counts).map(([key,value])=>[key,Number(value)])),
    {preferences:4,scenarios:1,quote_runs:1,quote_requests:1,raw_responses:1,normalised_quotes:1},
  );
  await c.end();
  await app.close();
});
