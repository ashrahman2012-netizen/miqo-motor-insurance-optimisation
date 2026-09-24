import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {buildApp} from "../src/server.ts";
import {createDatabase,createPool} from "../../../packages/db/src/client.ts";
import {selectShortlistedQuote} from "../src/selection-service.ts";

const {Client}=pg;\nconst ADMIN_HEADERS={"x-miqo-synthetic-admin":"DB-G10-SYNTHETIC-ADMIN"};\nprocess.env.MIQO_SYNTHETIC_ADMIN_KEY="DB-G10-SYNTHETIC-ADMIN";

async function reset(){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("TRUNCATE prototype_completion, final_integrity_result, selection, shortlist_entry, shortlist, audit_event, integrity_signal, normalised_quote, raw_provider_response, quote_request, quote_run, scenario_delta, scenario, optimisation_preference, discrepancy, canonical_field_value, risk_profile_version, profile, customer RESTART IDENTITY CASCADE");
  await c.end();
}

async function createQuotedJourney(app:any,driverId="DRV-SYN-SP3"){
  const profile=JSON.parse((await app.inject({method:"POST",url:"/profiles"})).body);
  for(const [fieldId,value] of [["main_driver_id",driverId],["annual_mileage",8000],["licence_held_since","2018-04-16"]] as const){
    assert.equal((await app.inject({
      method:"PUT",
      url:"/profile-versions/"+profile.versionId+"/facts/"+fieldId,
      payload:{value},
    })).statusCode,200);
  }
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/validate"})).statusCode,200);
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+profile.profileId+"/lock"})).statusCode,200);

  assert.equal((await app.inject({
    method:"POST",
    url:"/profile-versions/"+profile.versionId+"/optimisation-preferences",
    payload:{voluntary_excess:500,payment_structure:"ANNUAL"},
  })).statusCode,200);

  const generated=JSON.parse((await app.inject({
    method:"POST",url:"/profile-versions/"+profile.versionId+"/scenarios/generate",
  })).body);
  const scenarioId=generated.items[0].scenarioId;

  const preparedResponse=await app.inject({
    method:"POST",
    url:"/scenarios/"+scenarioId+"/quote-requests",
    payload:{providerKey:"MOCK-PROVIDER-001",channel:"DIRECT_SYNTHETIC"},
  });
  assert.equal(preparedResponse.statusCode,201);
  const prepared=JSON.parse(preparedResponse.body);

  const executedResponse=await app.inject({method:"POST",url:"/quote-requests/"+prepared.quoteRequestId+"/execute"});
  assert.equal(executedResponse.statusCode,201);
  const executed=JSON.parse(executedResponse.body);

  const normalisedResponse=await app.inject({
    method:"POST",
    url:"/raw-provider-responses/"+executed.item.rawProviderResponseId+"/normalise",
  });
  assert.equal(normalisedResponse.statusCode,201);
  const normalised=JSON.parse(normalisedResponse.body);

  return {profile,scenarioId,prepared,executed,normalised};
}

async function addNotComparableQuote(args:{versionId:string;scenarioId:string}){
  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  await c.query("INSERT INTO quote_run(quote_run_id,risk_profile_version_id) VALUES('QRUN-SP3-NC',$1)",[args.versionId]);
  await c.query(
    "INSERT INTO quote_request(quote_request_id,quote_run_id,scenario_id,provider_key,channel_key,adapter_version,mapping_version,request_fingerprint) VALUES('QREQ-SP3-NC','QRUN-SP3-NC',$1,'MOCK-PROVIDER-001','DIRECT_SYNTHETIC','mock-adapter-v1','mock-mapping-v1','sp3-not-comparable-request')",
    [args.scenarioId],
  );
  const text='{"provider":"MOCK-PROVIDER-001","providerVersion":"mock-provider-v1","providerReference":"MP001-SP3-NC","responseTimestamp":"2026-09-18T12:00:00.000Z","offer":{"premium":{"amountPence":68800},"paymentBasis":"ANNUAL"},"coverage":null}';
  await c.query(
    "INSERT INTO raw_provider_response(raw_provider_response_id,quote_request_id,payload_json,payload_text,payload_sha256,provider_reference,provider_response_at) VALUES('RAW-SP3-NC','QREQ-SP3-NC',$1::jsonb,$1,$2,'MP001-SP3-NC','2026-09-18T12:00:00Z'::timestamptz)",
    [text,"a".repeat(64)],
  );
  await c.query(
    "INSERT INTO normalised_quote(normalised_quote_id,raw_provider_response_id,normalisation_version,comparison_state,comparison_reason,normalisation_fingerprint) VALUES('NOR-SP3-NC','RAW-SP3-NC','sp2-normaliser-v1','NOT_COMPARABLE','MISSING_OR_UNSUPPORTED_REQUIRED_PROVIDER_FIELDS',$1)",
    ["b".repeat(64)],
  );
  await c.end();
}

test("SP3 comparison shortlist selection final integrity completion and trace are deterministic and immutable",async()=>{
  await reset();
  const app=await buildApp();
  const journey=await createQuotedJourney(app);
  await addNotComparableQuote({versionId:journey.profile.versionId,scenarioId:journey.scenarioId});

  const first=await app.inject({method:"POST",url:"/profile-versions/"+journey.profile.versionId+"/shortlists"});
  assert.equal(first.statusCode,201);
  const shortlist=JSON.parse(first.body);
  assert.equal(shortlist.created,true);
  assert.equal(shortlist.comparisonRuleVersion,"sp3-comparison-v1");
  assert.equal(shortlist.lowestDirectlyComparablePremiumId,journey.normalised.item.normalisedQuoteId);
  assert.deepEqual(shortlist.entries.map((item:any)=>item.normalisedQuoteId),[journey.normalised.item.normalisedQuoteId]);
  assert.ok(shortlist.notComparable.some((item:any)=>item.normalisedQuoteId==="NOR-SP3-NC"));
  assert.equal((shortlist as any).effectiveCostPence,undefined);

  const repeat=await app.inject({method:"POST",url:"/profile-versions/"+journey.profile.versionId+"/shortlists"});
  assert.equal(repeat.statusCode,200);
  const repeated=JSON.parse(repeat.body);
  assert.equal(repeated.shortlistId,shortlist.shortlistId);
  assert.equal(repeated.comparisonFingerprint,shortlist.comparisonFingerprint);

  const invalid=await app.inject({
    method:"POST",
    url:"/shortlists/"+shortlist.shortlistId+"/selections",
    payload:{normalisedQuoteId:"NOR-SP3-NC"},
  });
  assert.equal(invalid.statusCode,422);
  assert.equal(JSON.parse(invalid.body).error,"QUOTE_NOT_SHORTLISTED");

  const rawBefore=journey.executed.item.payloadSha256;
  const selectedResponse=await app.inject({
    method:"POST",
    url:"/shortlists/"+shortlist.shortlistId+"/selections",
    payload:{normalisedQuoteId:journey.normalised.item.normalisedQuoteId},
  });
  assert.equal(selectedResponse.statusCode,201);
  const selected=JSON.parse(selectedResponse.body);
  assert.equal(selected.outcome,"PASS");
  assert.equal(selected.status,"PROTOTYPE_JOURNEY_COMPLETE");

  const selection=JSON.parse((await app.inject({method:"GET",url:"/selections/"+selected.selectionId})).body);
  assert.equal(selection.status,"ACCEPTED");
  assert.equal(selection.normalisedQuoteId,journey.normalised.item.normalisedQuoteId);
  assert.equal(selection.scenarioId,journey.scenarioId);
  assert.equal(selection.quoteRequestId,journey.prepared.quoteRequestId);
  assert.equal(selection.riskProfileVersionId,journey.profile.versionId);
  assert.equal(selection.finalIntegrity.outcome,"PASS");
  assert.equal(selection.completion.status,"PROTOTYPE_JOURNEY_COMPLETE");
  assert.equal(selection.completion.dataClassification,"SYNTHETIC");
  assert.equal(selection.completion.liveProviderActivity,"DISABLED");

  const trace=JSON.parse((await app.inject({
    method:"GET",headers:ADMIN_HEADERS,url:"/admin/selections/"+selected.selectionId+"/trace",
  })).body);
  assert.equal(trace.riskProfileVersion.riskProfileVersionId,journey.profile.versionId);
  assert.equal(trace.scenario.scenarioId,journey.scenarioId);
  assert.equal(trace.quoteRequest.quoteRequestId,journey.prepared.quoteRequestId);
  assert.equal(trace.rawProviderResponse.rawProviderResponseId,journey.executed.item.rawProviderResponseId);
  assert.equal(trace.rawProviderResponse.payloadSha256,rawBefore);
  assert.equal(trace.normalisedQuote.normalisedQuoteId,journey.normalised.item.normalisedQuoteId);
  assert.equal(trace.shortlist.shortlistId,shortlist.shortlistId);
  assert.equal(trace.selection.selectionId,selected.selectionId);
  assert.equal(trace.finalIntegrity.outcome,"PASS");
  assert.equal(trace.completion.status,"PROTOTYPE_JOURNEY_COMPLETE");

  const auditTypes=trace.audit.map((event:any)=>event.eventType);
  for(const eventType of ["comparison_generated","shortlist_created","quote_selected","final_integrity_passed","prototype_completed"]){
    assert.ok(auditTypes.includes(eventType),eventType+" missing from trace audit");
  }

  const snapshot=JSON.parse((await app.inject({method:"GET",url:"/profiles/"+journey.profile.profileId+"/snapshot"})).body);
  const locked=snapshot.versions.find((version:any)=>version.versionId===journey.profile.versionId);
  assert.equal(locked.status,"LOCKED");
  assert.equal(locked.values.find((value:any)=>value.fieldId==="annual_mileage").value,8000);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  assert.equal((await c.query("SELECT payload_sha256 FROM raw_provider_response WHERE raw_provider_response_id=$1",[journey.executed.item.rawProviderResponseId])).rows[0].payload_sha256,rawBefore);
  await assert.rejects(()=>c.query("UPDATE selection SET status='BLOCKED' WHERE selection_id=$1",[selected.selectionId]),/SPRINT3_EVIDENCE_IMMUTABLE/);
  await assert.rejects(()=>c.query("DELETE FROM audit_event WHERE event_type='prototype_completed'"),/AUDIT_EVENT_IMMUTABLE/);
  await c.end();
  await app.close();
});

test("SYN-007 stale selected quote is blocked by final integrity and cannot complete",async()=>{
  await reset();
  const app=await buildApp();
  const journey=await createQuotedJourney(app,"DRV-SYN-007");

  const shortlist=JSON.parse((await app.inject({
    method:"POST",url:"/profile-versions/"+journey.profile.versionId+"/shortlists",
  })).body);

  const correction=await app.inject({
    method:"POST",
    url:"/profiles/"+journey.profile.profileId+"/corrections",
    payload:{fieldId:"annual_mileage",value:6000},
  });
  assert.equal(correction.statusCode,201);
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+journey.profile.profileId+"/validate"})).statusCode,200);
  assert.equal((await app.inject({method:"POST",url:"/profiles/"+journey.profile.profileId+"/lock"})).statusCode,200);

  const blocked=await app.inject({
    method:"POST",
    url:"/shortlists/"+shortlist.shortlistId+"/selections",
    payload:{normalisedQuoteId:journey.normalised.item.normalisedQuoteId},
  });
  assert.equal(blocked.statusCode,409);
  const body=JSON.parse(blocked.body);
  assert.equal(body.error,"FINAL_INTEGRITY_BLOCKED");
  assert.ok(body.signals.some((signal:any)=>signal.ruleId==="FINAL_PROFILE_VERSION_NOT_CURRENT_LOCKED"));

  const selection=JSON.parse((await app.inject({method:"GET",url:"/selections/"+body.selectionId})).body);
  assert.equal(selection.status,"BLOCKED");
  assert.equal(selection.finalIntegrity.outcome,"BLOCKED");
  assert.equal(selection.completion,null);

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const signal=(await c.query("SELECT rule_id,state,blocking FROM integrity_signal WHERE stage='FINAL_SELECTION' AND normalised_quote_id=$1",[journey.normalised.item.normalisedQuoteId])).rows[0];
  assert.equal(signal.rule_id,"FINAL_PROFILE_VERSION_NOT_CURRENT_LOCKED");
  assert.equal(signal.state,"BLOCKING");
  assert.equal(signal.blocking,true);
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM prototype_completion")).rows[0].count),0);
  const oldVersion=(await c.query("SELECT status FROM risk_profile_version WHERE risk_profile_version_id=$1",[journey.profile.versionId])).rows[0];
  assert.equal(oldVersion.status,"SUPERSEDED");
  const oldMileage=(await c.query("SELECT value_json FROM canonical_field_value WHERE risk_profile_version_id=$1 AND field_id='annual_mileage'",[journey.profile.versionId])).rows[0];
  assert.equal(Number(oldMileage.value_json),8000);
  assert.equal((await c.query("SELECT payload_sha256 FROM raw_provider_response WHERE raw_provider_response_id=$1",[journey.executed.item.rawProviderResponseId])).rows[0].payload_sha256,journey.executed.item.payloadSha256);
  assert.ok(Number((await c.query("SELECT count(*) AS count FROM audit_event WHERE event_type='final_integrity_blocked'")).rows[0].count)>=1);
  await c.end();
  await app.close();
});

test("SP3 selection transaction rolls back selection integrity and completion together",async()=>{
  await reset();
  const app=await buildApp();
  const journey=await createQuotedJourney(app);
  const shortlist=JSON.parse((await app.inject({
    method:"POST",url:"/profile-versions/"+journey.profile.versionId+"/shortlists",
  })).body);

  const pool=createPool();
  const db=createDatabase(pool);
  await assert.rejects(
    ()=>selectShortlistedQuote(db,{
      shortlistId:shortlist.shortlistId,
      normalisedQuoteId:journey.normalised.item.normalisedQuoteId,
      simulateFailureAfterSelection:true,
    }),
    /SIMULATED_SELECTION_TRANSACTION_FAILURE/,
  );
  await pool.end();

  const c=new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM selection")).rows[0].count),0);
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM final_integrity_result")).rows[0].count),0);
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM prototype_completion")).rows[0].count),0);
  assert.equal(Number((await c.query("SELECT count(*) AS count FROM audit_event WHERE event_type IN ('quote_selected','final_integrity_passed','prototype_completed')")).rows[0].count),0);
  await c.end();
  await app.close();
});
