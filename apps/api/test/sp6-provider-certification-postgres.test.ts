import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

const {Client}=pg;

test("S6-G6 provider-neutral certification evidence persists across reconnect and remains immutable",async()=>{
  let db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  await db.query("TRUNCATE sp6_provider_certification_evidence, sp6_provider_certification_contract, sp6_provider_candidate_control");

  await db.query(`
    INSERT INTO sp6_provider_candidate_control(
      provider_candidate_id,provider_key,counterparty_reference,channel,target_environment,
      proposed_route_key,technical_documentation_reference,contractual_authority_status,
      permitted_test_data_class,evidence_class,candidate_status
    ) VALUES(
      'SP6-API-CAND-TEST','TEST-FIXTURE-PROVIDER','TEST-FIXTURE-COUNTERPARTY',
      'DIRECT_INSURER','CERTIFICATION','TEST-FIXTURE-API-ROUTE','TEST-FIXTURE-DOC',
      'PENDING','SYNTHETIC','TEST_FIXTURE','DRAFT'
    )
  `);

  await assert.rejects(
    ()=>db.query(`
      INSERT INTO sp6_provider_certification_contract(
        provider_certification_contract_id,provider_candidate_id,model_version,
        adapter_version,mapping_version,request_schema_version,response_schema_version,
        mapping_fingerprint,schema_fingerprint,contract_fingerprint,certification_state
      ) VALUES(
        'SP6-API-CONTRACT-READY-BAD','SP6-API-CAND-TEST','sp6-provider-certification-v1',
        'adapter-v1','mapping-v1','request-v1','response-v1',
        repeat('a',64),repeat('b',64),repeat('c',64),'READY_FOR_PROVIDER_CERTIFICATION'
      )
    `),
    /SP6_PROVIDER_CERTIFICATION_EXTERNAL_CANDIDATE_REQUIRED/,
  );

  await db.query(`
    INSERT INTO sp6_provider_certification_contract(
      provider_certification_contract_id,provider_candidate_id,model_version,
      adapter_version,mapping_version,request_schema_version,response_schema_version,
      mapping_fingerprint,schema_fingerprint,contract_fingerprint,certification_state
    ) VALUES(
      'SP6-API-CONTRACT-TEST','SP6-API-CAND-TEST','sp6-provider-certification-v1',
      'adapter-v1','mapping-v1','request-v1','response-v1',
      repeat('d',64),repeat('e',64),repeat('f',64),'DRAFT'
    )
  `);

  await db.query(`
    INSERT INTO sp6_provider_certification_evidence(
      provider_certification_evidence_id,provider_certification_contract_id,evidence_class,
      certification_request_id,provider_reference,raw_response_hash,
      normalisation_fingerprint,recommendation_fingerprint,evidence_fingerprint,raw_response_json
    ) VALUES(
      'SP6-API-EVIDENCE-TEST','SP6-API-CONTRACT-TEST','TEST_FIXTURE',
      'SP6-API-CERT-REQ-1','TEST-REF',
      repeat('1',64),repeat('2',64),repeat('3',64),repeat('4',64),
      '{"fixture":true,"premiumPence":12345}'::jsonb
    )
  `);

  await db.end();

  db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  const row=(await db.query(`
    SELECT e.provider_certification_evidence_id,e.certification_request_id,e.provider_reference,
           e.raw_response_hash,e.normalisation_fingerprint,e.recommendation_fingerprint,
           e.evidence_fingerprint,e.raw_response_json,c.certification_state,p.evidence_class,p.candidate_status
    FROM sp6_provider_certification_evidence e
    JOIN sp6_provider_certification_contract c
      ON c.provider_certification_contract_id=e.provider_certification_contract_id
    JOIN sp6_provider_candidate_control p
      ON p.provider_candidate_id=c.provider_candidate_id
    WHERE e.provider_certification_evidence_id='SP6-API-EVIDENCE-TEST'
  `)).rows[0];

  assert.equal(row.provider_certification_evidence_id,"SP6-API-EVIDENCE-TEST");
  assert.equal(row.certification_request_id,"SP6-API-CERT-REQ-1");
  assert.equal(row.provider_reference,"TEST-REF");
  assert.equal(row.certification_state,"DRAFT");
  assert.equal(row.evidence_class,"TEST_FIXTURE");
  assert.equal(row.candidate_status,"DRAFT");
  assert.equal(row.raw_response_json.fixture,true);

  await assert.rejects(
    ()=>db.query("UPDATE sp6_provider_certification_evidence SET provider_reference='TAMPERED' WHERE provider_certification_evidence_id='SP6-API-EVIDENCE-TEST'"),
    /SP6_PROVIDER_CERTIFICATION_EVIDENCE_IMMUTABLE/,
  );
  await assert.rejects(
    ()=>db.query("DELETE FROM sp6_provider_certification_contract WHERE provider_certification_contract_id='SP6-API-CONTRACT-TEST'"),
    /SP6_PROVIDER_CERTIFICATION_EVIDENCE_IMMUTABLE/,
  );

  await db.end();
});
