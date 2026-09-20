\set ON_ERROR_STOP on

INSERT INTO sp6_provider_candidate_control(
  provider_candidate_id,provider_key,counterparty_reference,channel,target_environment,
  proposed_route_key,technical_documentation_reference,contractual_authority_status,
  permitted_test_data_class,evidence_class,candidate_status
) VALUES(
  'SP6-CAND-TEST-001','TEST-FIXTURE-PROVIDER','TEST-FIXTURE-COUNTERPARTY',
  'DIRECT_INSURER','CERTIFICATION','TEST-FIXTURE-ROUTE','TEST-FIXTURE-DOC',
  'PENDING','SYNTHETIC','TEST_FIXTURE','DRAFT'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO sp6_provider_candidate_control(
      provider_candidate_id,provider_key,counterparty_reference,channel,target_environment,
      proposed_route_key,technical_documentation_reference,contractual_authority_status,
      permitted_test_data_class,evidence_class,candidate_status
    ) VALUES(
      'SP6-CAND-TEST-BAD','TEST-FIXTURE-PROVIDER-2','TEST-FIXTURE-COUNTERPARTY-2',
      'DIRECT_INSURER','CERTIFICATION','TEST-FIXTURE-ROUTE-2','TEST-FIXTURE-DOC-2',
      'PENDING','SYNTHETIC','TEST_FIXTURE','APPROVED_FOR_CERTIFICATION'
    );
    RAISE EXCEPTION 'TEST_FAILURE_FIXTURE_PROMOTED_TO_PROVIDER_CANDIDATE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_FIXTURE_PROMOTED_TO_PROVIDER_CANDIDATE' THEN RAISE; END IF;
    IF position('SP6_PROVIDER_CANDIDATE_EXTERNAL_EVIDENCE_REQUIRED' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO sp6_provider_certification_contract(
  provider_certification_contract_id,provider_candidate_id,model_version,
  adapter_version,mapping_version,request_schema_version,response_schema_version,
  mapping_fingerprint,schema_fingerprint,contract_fingerprint,certification_state
) VALUES(
  'SP6-CERT-CONTRACT-TEST-001','SP6-CAND-TEST-001','sp6-provider-certification-v1',
  'adapter-test-v1','mapping-test-v1','request-test-v1','response-test-v1',
  repeat('a',64),repeat('b',64),repeat('c',64),'DRAFT'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO sp6_provider_certification_contract(
      provider_certification_contract_id,provider_candidate_id,model_version,
      adapter_version,mapping_version,request_schema_version,response_schema_version,
      mapping_fingerprint,schema_fingerprint,contract_fingerprint,certification_state
    ) VALUES(
      'SP6-CERT-CONTRACT-TEST-BAD','SP6-CAND-TEST-001','sp6-provider-certification-v1',
      'adapter-test-v1','mapping-test-v1','request-test-v1','response-test-v1',
      repeat('d',64),repeat('e',64),repeat('f',64),'READY_FOR_PROVIDER_CERTIFICATION'
    );
    RAISE EXCEPTION 'TEST_FAILURE_FIXTURE_CONTRACT_PROMOTED_TO_READY';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_FIXTURE_CONTRACT_PROMOTED_TO_READY' THEN RAISE; END IF;
    IF position('SP6_PROVIDER_CERTIFICATION_EXTERNAL_CANDIDATE_REQUIRED' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO sp6_provider_certification_evidence(
  provider_certification_evidence_id,provider_certification_contract_id,evidence_class,
  certification_request_id,provider_reference,raw_response_hash,
  normalisation_fingerprint,recommendation_fingerprint,evidence_fingerprint,raw_response_json
) VALUES(
  'SP6-CERT-EVIDENCE-TEST-001','SP6-CERT-CONTRACT-TEST-001','TEST_FIXTURE',
  'SP6-CERT-REQ-TEST-001','TEST-PROVIDER-REF',
  repeat('1',64),repeat('2',64),repeat('3',64),repeat('4',64),
  '{"fixture":true,"premiumPence":12345}'::jsonb
);

DO $$
BEGIN
  BEGIN
    UPDATE sp6_provider_certification_evidence
      SET provider_reference='TAMPERED'
    WHERE provider_certification_evidence_id='SP6-CERT-EVIDENCE-TEST-001';
    RAISE EXCEPTION 'TEST_FAILURE_SP6_CERT_EVIDENCE_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_SP6_CERT_EVIDENCE_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP6_PROVIDER_CERTIFICATION_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  candidate_count integer;
  contract_count integer;
  evidence_count integer;
BEGIN
  SELECT count(*) INTO candidate_count
  FROM sp6_provider_candidate_control
  WHERE evidence_class='TEST_FIXTURE' AND candidate_status='DRAFT';

  SELECT count(*) INTO contract_count
  FROM sp6_provider_certification_contract
  WHERE certification_state='DRAFT';

  SELECT count(*) INTO evidence_count
  FROM sp6_provider_certification_evidence
  WHERE evidence_class='TEST_FIXTURE';

  IF candidate_count <> 1 THEN RAISE EXCEPTION 'TEST_FAILURE_SP6_PROVIDER_CANDIDATE_COUNT'; END IF;
  IF contract_count <> 1 THEN RAISE EXCEPTION 'TEST_FAILURE_SP6_PROVIDER_CONTRACT_COUNT'; END IF;
  IF evidence_count <> 1 THEN RAISE EXCEPTION 'TEST_FAILURE_SP6_PROVIDER_EVIDENCE_COUNT'; END IF;
END $$;

SELECT 'POSTGRES_SPRINT6_PROVIDER_CERTIFICATION_FRAMEWORK_PASS' AS result;
