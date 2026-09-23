import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {adminHeaders} from "./admin-auth-test-helper.ts";

const {Client}=pg;

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function createCompletedSprint3Journey(app:any){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);

  for(const [fieldId,value] of [
    ["main_driver_id","DRV-SYN-SP3-RESTART"],
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

  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/validate"})).statusCode,200);
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);

  assert.equal((await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/optimisation-preferences",
    payload:{
      voluntary_excess:500,
      payment_structure:"ANNUAL",
      policy_start_date:"2026-10-01",
      telematics_preference:true,
    },
  })).statusCode,200);

  const generatedResponse=await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/scenarios/generate",
  });
  assert.equal(generatedResponse.statusCode,201);
  const generated=JSON.parse(generatedResponse.body);
  const scenario=generated.items[0];

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

  const shortlistResponse=await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/shortlists",
  });
  assert.equal(shortlistResponse.statusCode,201);
  const shortlist=JSON.parse(shortlistResponse.body);

  const selectionResponse=await app.inject({
    method:"POST",
    url:"/shortlists/"+shortlist.shortlistId+"/selections",
    payload:{normalisedQuoteId:normalised.item.normalisedQuoteId},
  });
  assert.equal(selectionResponse.statusCode,201);
  const selected=JSON.parse(selectionResponse.body);
  assert.equal(selected.outcome,"PASS");
  assert.equal(selected.status,"PROTOTYPE_JOURNEY_COMPLETE");

  const selection=JSON.parse((await app.inject({
    method:"GET",
    url:"/selections/"+selected.selectionId,
  })).body);
  const trace=JSON.parse((await app.inject({
    method:"GET",
    url:"/desktop-admin/selections/"+selected.selectionId+"/trace",
    headers:await adminHeaders(),
  })).body);
  const audit=JSON.parse((await app.inject({
    method:"GET",
    url:"/desktop-admin/audit?profileId="+encodeURIComponent(profile.profileId),
    headers:await adminHeaders(),
  })).body);

  return {profile,generated,scenario,prepared,executed,normalised,shortlist,selected,selection,trace,audit};
}

function stableAudit(items:any[]){
  return items.map(item=>({
    auditEventId:item.auditEventId,
    eventType:item.eventType,
    entityType:item.entityType,
    entityId:item.entityId,
    traceId:item.traceId,
    metadataJson:item.metadataJson,
    occurredAt:item.occurredAt,
  }));
}

function assertOrderedLifecycle(items:any[]){
  const types=items.map(item=>item.eventType);
  const expected=[
    "profile_created",
    "fact_saved",
    "profile_validated",
    "profile_locked",
    "optimisation_preferences_saved",
    "scenario_generated",
    "pre_quote_integrity_passed",
    "quote_request_prepared",
    "raw_provider_response_captured",
    "provider_response_normalised",
    "comparison_generated",
    "shortlist_created",
    "quote_selected",
    "final_integrity_passed",
    "prototype_completed",
  ];
  let cursor=-1;
  for(const eventType of expected){
    const next=types.indexOf(eventType,cursor+1);
    assert.ok(next>cursor,eventType+" missing or out of order");
    cursor=next;
  }
}

test("SP3 completed journey survives API restart with exact selection integrity completion trace and audit",async()=>{
  await reset();

  let app=await buildApp();
  const before=await createCompletedSprint3Journey(app);

  assert.equal(before.selection.status,"ACCEPTED");
  assert.equal(before.selection.finalIntegrity.outcome,"PASS");
  assert.equal(before.selection.completion.status,"PROTOTYPE_JOURNEY_COMPLETE");
  assert.equal(before.selection.completion.dataClassification,"SYNTHETIC");
  assert.equal(before.selection.completion.liveProviderActivity,"DISABLED");
  assertOrderedLifecycle(before.audit.items);

  await app.close();
  app=await buildApp();

  const afterShortlist=JSON.parse((await app.inject({
    method:"GET",
    url:"/shortlists/"+before.shortlist.shortlistId,
  })).body);
  const afterSelection=JSON.parse((await app.inject({
    method:"GET",
    url:"/selections/"+before.selected.selectionId,
  })).body);
  const afterTrace=JSON.parse((await app.inject({
    method:"GET",
    url:"/desktop-admin/selections/"+before.selected.selectionId+"/trace",
    headers:await adminHeaders(),
  })).body);
  const afterAudit=JSON.parse((await app.inject({
    method:"GET",
    url:"/desktop-admin/audit?profileId="+encodeURIComponent(before.profile.profileId),
    headers:await adminHeaders(),
  })).body);

  assert.equal(afterShortlist.shortlistId,before.shortlist.shortlistId);
  assert.equal(afterShortlist.riskProfileVersionId,before.profile.versionId);
  assert.equal(afterShortlist.comparisonRuleVersion,before.shortlist.comparisonRuleVersion);
  assert.equal(afterShortlist.comparisonFingerprint,before.shortlist.comparisonFingerprint);
  assert.deepEqual(afterShortlist.entries,before.shortlist.entries);
  assert.equal(afterShortlist.lowestDirectlyComparablePremiumId,before.normalised.item.normalisedQuoteId);

  assert.equal(afterSelection.selectionId,before.selected.selectionId);
  assert.equal(afterSelection.shortlistId,before.shortlist.shortlistId);
  assert.equal(afterSelection.normalisedQuoteId,before.normalised.item.normalisedQuoteId);
  assert.equal(afterSelection.scenarioId,before.scenario.scenarioId);
  assert.equal(afterSelection.quoteRequestId,before.prepared.quoteRequestId);
  assert.equal(afterSelection.riskProfileVersionId,before.profile.versionId);
  assert.equal(afterSelection.status,"ACCEPTED");
  assert.equal(afterSelection.finalIntegrity.finalIntegrityResultId,before.selection.finalIntegrity.finalIntegrityResultId);
  assert.equal(afterSelection.finalIntegrity.ruleVersion,before.selection.finalIntegrity.ruleVersion);
  assert.equal(afterSelection.finalIntegrity.outcome,"PASS");
  assert.deepEqual(afterSelection.finalIntegrity.evidence,before.selection.finalIntegrity.evidence);
  assert.equal(afterSelection.completion.prototypeCompletionId,before.selection.completion.prototypeCompletionId);
  assert.equal(afterSelection.completion.status,"PROTOTYPE_JOURNEY_COMPLETE");
  assert.equal(afterSelection.completion.dataClassification,"SYNTHETIC");
  assert.equal(afterSelection.completion.liveProviderActivity,"DISABLED");

  assert.equal(afterTrace.profile.profileId,before.profile.profileId);
  assert.equal(afterTrace.riskProfileVersion.riskProfileVersionId,before.profile.versionId);
  assert.equal(afterTrace.riskProfileVersion.status,"LOCKED");
  assert.equal(afterTrace.scenario.scenarioId,before.scenario.scenarioId);
  assert.equal(afterTrace.scenario.generationFingerprint,before.generated.generationFingerprint);
  assert.deepEqual(afterTrace.scenario.deltas,before.trace.scenario.deltas);
  assert.equal(afterTrace.quoteRequest.quoteRunId,before.prepared.quoteRunId);
  assert.equal(afterTrace.quoteRequest.quoteRequestId,before.prepared.quoteRequestId);
  assert.equal(afterTrace.quoteRequest.requestFingerprint,before.prepared.requestFingerprint);
  assert.equal(afterTrace.rawProviderResponse.rawProviderResponseId,before.executed.item.rawProviderResponseId);
  assert.equal(afterTrace.rawProviderResponse.payloadSha256,before.executed.item.payloadSha256);
  assert.equal(afterTrace.normalisedQuote.normalisedQuoteId,before.normalised.item.normalisedQuoteId);
  assert.equal(afterTrace.normalisedQuote.normalisationVersion,before.normalised.item.normalisationVersion);
  assert.equal(afterTrace.normalisedQuote.normalisationFingerprint,before.normalised.item.normalisationFingerprint);
  assert.equal(afterTrace.normalisedQuote.comparisonState,"DIRECTLY_COMPARABLE");
  assert.equal(afterTrace.shortlist.shortlistId,before.shortlist.shortlistId);
  assert.equal(afterTrace.shortlist.comparisonFingerprint,before.shortlist.comparisonFingerprint);
  assert.equal(afterTrace.selection.selectionId,before.selected.selectionId);
  assert.equal(afterTrace.finalIntegrity.finalIntegrityResultId,before.selection.finalIntegrity.finalIntegrityResultId);
  assert.equal(afterTrace.finalIntegrity.outcome,"PASS");
  assert.equal(afterTrace.completion.prototypeCompletionId,before.selection.completion.prototypeCompletionId);
  assert.equal(afterTrace.completion.status,"PROTOTYPE_JOURNEY_COMPLETE");

  assert.deepEqual(afterTrace.optimisationPreferences,before.trace.optimisationPreferences);
  assert.deepEqual(stableAudit(afterTrace.audit),stableAudit(before.trace.audit));
  assert.deepEqual(stableAudit(afterAudit.items),stableAudit(before.audit.items));
  assertOrderedLifecycle(afterAudit.items);

  const replayShortlist=JSON.parse((await app.inject({
    method:"POST",
    url:"/profile-versions/"+before.profile.versionId+"/shortlists",
  })).body);
  assert.equal(replayShortlist.created,false);
  assert.equal(replayShortlist.shortlistId,before.shortlist.shortlistId);
  assert.equal(replayShortlist.comparisonFingerprint,before.shortlist.comparisonFingerprint);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const counts=(await c.query(
    "SELECT (SELECT count(*) FROM shortlist) AS shortlists, (SELECT count(*) FROM shortlist_entry) AS shortlist_entries, (SELECT count(*) FROM selection) AS selections, (SELECT count(*) FROM final_integrity_result) AS final_integrity_results, (SELECT count(*) FROM prototype_completion) AS completions"
  )).rows[0];
  assert.deepEqual(
    Object.fromEntries(Object.entries(counts).map(([key,value])=>[key,Number(value)])),
    {shortlists:1,shortlist_entries:1,selections:1,final_integrity_results:1,completions:1},
  );
  assert.equal(
    (await c.query("SELECT payload_sha256 FROM raw_provider_response WHERE raw_provider_response_id=$1",[before.executed.item.rawProviderResponseId])).rows[0].payload_sha256,
    before.executed.item.payloadSha256,
  );
  await c.end();

  await app.close();
});
