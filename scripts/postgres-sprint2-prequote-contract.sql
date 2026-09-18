\set ON_ERROR_STOP on

-- Runs after the Sprint 2 scenario contract. SCN-SP2-PG-001 references locked RPV-PG-001-V2.
INSERT INTO quote_run(quote_run_id,risk_profile_version_id)
VALUES('QRUN-SP2-PG-001','RPV-PG-001-V2');

INSERT INTO quote_request(
  quote_request_id,quote_run_id,scenario_id,provider_key,channel_key,
  adapter_version,mapping_version,request_fingerprint
) VALUES(
  'QREQ-SP2-PG-001','QRUN-SP2-PG-001','SCN-SP2-PG-001','MOCK-PROVIDER-001','DIRECT_SYNTHETIC',
  'mock-adapter-v1','mock-mapping-v1','prequote-contract-fingerprint'
);

DO $$
DECLARE
  lineage_version text;
  lineage_scenario text;
  lineage_provider text;
  lineage_channel text;
  raw_count integer;
BEGIN
  SELECT qr.risk_profile_version_id,q.scenario_id,q.provider_key,q.channel_key
    INTO lineage_version,lineage_scenario,lineage_provider,lineage_channel
  FROM quote_request q
  JOIN quote_run qr ON qr.quote_run_id=q.quote_run_id
  WHERE q.quote_request_id='QREQ-SP2-PG-001';

  SELECT count(*) INTO raw_count
  FROM raw_provider_response
  WHERE quote_request_id='QREQ-SP2-PG-001';

  IF lineage_version <> 'RPV-PG-001-V2' THEN RAISE EXCEPTION 'TEST_FAILURE_QUOTE_VERSION_LINEAGE'; END IF;
  IF lineage_scenario <> 'SCN-SP2-PG-001' THEN RAISE EXCEPTION 'TEST_FAILURE_QUOTE_SCENARIO_LINEAGE'; END IF;
  IF lineage_provider <> 'MOCK-PROVIDER-001' THEN RAISE EXCEPTION 'TEST_FAILURE_QUOTE_PROVIDER_LINEAGE'; END IF;
  IF lineage_channel <> 'DIRECT_SYNTHETIC' THEN RAISE EXCEPTION 'TEST_FAILURE_QUOTE_CHANNEL_LINEAGE'; END IF;
  IF raw_count <> 0 THEN RAISE EXCEPTION 'TEST_FAILURE_PROVIDER_INVOKED_DURING_PREQUOTE'; END IF;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE quote_request
    SET mapping_version='tampered'
    WHERE quote_request_id='QREQ-SP2-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_QUOTE_REQUEST_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_QUOTE_REQUEST_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('QUOTE_REQUEST_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO discrepancy(
  discrepancy_id,risk_profile_version_id,field_id,declared_value_json,
  verified_value_json,state,blocking
) VALUES(
  'DISC-SP2-PREQUOTE','RPV-PG-001-V2','annual_mileage','8000'::jsonb,'7000'::jsonb,'BLOCKING',true
);

INSERT INTO quote_run(quote_run_id,risk_profile_version_id)
VALUES('QRUN-SP2-PG-BLOCKED','RPV-PG-001-V2');

DO $$
BEGIN
  BEGIN
    INSERT INTO quote_request(
      quote_request_id,quote_run_id,scenario_id,provider_key,channel_key,
      adapter_version,mapping_version,request_fingerprint
    ) VALUES(
      'QREQ-SP2-PG-BLOCKED','QRUN-SP2-PG-BLOCKED','SCN-SP2-PG-001','MOCK-PROVIDER-001','DIRECT_SYNTHETIC',
      'mock-adapter-v1','mock-mapping-v1','prequote-blocked-fingerprint'
    );
    RAISE EXCEPTION 'TEST_FAILURE_BLOCKING_DISCREPANCY_QUOTE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_BLOCKING_DISCREPANCY_QUOTE_ALLOWED' THEN RAISE; END IF;
    IF position('UNRESOLVED_DISCREPANCY' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO quote_run(quote_run_id,risk_profile_version_id)
    VALUES('QRUN-SP2-PG-SUPERSEDED','RPV-PG-001-V1');
    RAISE EXCEPTION 'TEST_FAILURE_SUPERSEDED_QUOTE_RUN_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_SUPERSEDED_QUOTE_RUN_ALLOWED' THEN RAISE; END IF;
    IF position('QUOTE_RUN_REQUIRES_LOCKED_PROFILE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

SELECT 'POSTGRES_SPRINT2_PREQUOTE_CONTRACT_PASS' AS result;
