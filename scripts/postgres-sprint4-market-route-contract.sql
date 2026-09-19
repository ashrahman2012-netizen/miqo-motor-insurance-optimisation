\set ON_ERROR_STOP on

-- Requires Sprint 4 multi-scenario contract state:
-- OBJ-SP4-PG-001 / SCN-SP4-PG-001 / RPV-PG-001-V2.

INSERT INTO market_route(
  market_route_id,route_key,route_catalogue_version,provider_key,channel_key,
  adapter_version,mapping_version,route_fingerprint,synthetic
) VALUES
(
  'MR-SP4-PG-DIRECT','MOCK-001-DIRECT','sp4-market-routes-v1',
  'MOCK-PROVIDER-001','DIRECT_SYNTHETIC','mock-adapter-v1','mock-mapping-v1',
  '1111111111111111111111111111111111111111111111111111111111111111',true
),
(
  'MR-SP4-PG-PCW','MOCK-001-PCW','sp4-market-routes-v1',
  'MOCK-PROVIDER-001','PCW_SYNTHETIC','mock-adapter-v1','mock-mapping-pcw-v1',
  '2222222222222222222222222222222222222222222222222222222222222222',true
);

DO $$
BEGIN
  BEGIN
    INSERT INTO scenario_delta(
      scenario_delta_id,scenario_id,field_id,control_class,value_json
    ) VALUES(
      'SCD-SP4-PG-ROUTE-BAD','SCN-SP4-PG-001','provider','O','"MOCK-PROVIDER-001"'::jsonb
    );
    RAISE EXCEPTION 'TEST_FAILURE_MARKET_ROUTE_FORCED_INTO_SCENARIO_DELTA';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_MARKET_ROUTE_FORCED_INTO_SCENARIO_DELTA' THEN RAISE; END IF;
    IF position('scenario_delta_approved_o_field' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO quote_run(quote_run_id,risk_profile_version_id)
VALUES
  ('QRUN-SP4-ROUTE-DIRECT','RPV-PG-001-V2'),
  ('QRUN-SP4-ROUTE-PCW','RPV-PG-001-V2');

INSERT INTO quote_request(
  quote_request_id,quote_run_id,scenario_id,provider_key,channel_key,
  adapter_version,mapping_version,request_fingerprint
) VALUES
(
  'QREQ-SP4-ROUTE-DIRECT','QRUN-SP4-ROUTE-DIRECT','SCN-SP4-PG-001',
  'MOCK-PROVIDER-001','DIRECT_SYNTHETIC','mock-adapter-v1','mock-mapping-v1',
  'sp4-route-direct-request'
),
(
  'QREQ-SP4-ROUTE-PCW','QRUN-SP4-ROUTE-PCW','SCN-SP4-PG-001',
  'MOCK-PROVIDER-001','PCW_SYNTHETIC','mock-adapter-v1','mock-mapping-pcw-v1',
  'sp4-route-pcw-request'
);

INSERT INTO sp4_quote_request_lineage(
  quote_request_id,market_route_id,customer_objective_id,scenario_id,
  risk_profile_version_id,route_fingerprint,orchestration_version
) VALUES
(
  'QREQ-SP4-ROUTE-DIRECT','MR-SP4-PG-DIRECT','OBJ-SP4-PG-001','SCN-SP4-PG-001',
  'RPV-PG-001-V2',
  '1111111111111111111111111111111111111111111111111111111111111111',
  'sp4-route-orchestrator-v1'
),
(
  'QREQ-SP4-ROUTE-PCW','MR-SP4-PG-PCW','OBJ-SP4-PG-001','SCN-SP4-PG-001',
  'RPV-PG-001-V2',
  '2222222222222222222222222222222222222222222222222222222222222222',
  'sp4-route-orchestrator-v1'
);

INSERT INTO raw_provider_response(
  raw_provider_response_id,quote_request_id,payload_json,payload_text,payload_sha256,
  provider_reference,provider_response_at
) VALUES
(
  'RAW-SP4-ROUTE-DIRECT','QREQ-SP4-ROUTE-DIRECT',
  '{"provider":"MOCK-PROVIDER-001","quote":{"annualPremiumPence":70140,"baseExcessPence":35000,"voluntaryExcessPence":50000,"paymentBasis":"ANNUAL","coverageMarkers":["COMPREHENSIVE"]}}'::jsonb,
  '{"provider":"MOCK-PROVIDER-001","quote":{"annualPremiumPence":70140,"baseExcessPence":35000,"voluntaryExcessPence":50000,"paymentBasis":"ANNUAL","coverageMarkers":["COMPREHENSIVE"]}}',
  '3333333333333333333333333333333333333333333333333333333333333333',
  'MP001-SP4-DIRECT','2026-09-18T12:00:00Z'
),
(
  'RAW-SP4-ROUTE-PCW','QREQ-SP4-ROUTE-PCW',
  '{"provider":"MOCK-PROVIDER-001","quote":{"annualPremiumPence":70140,"baseExcessPence":35000,"voluntaryExcessPence":50000,"paymentBasis":"ANNUAL","coverageMarkers":["COMPREHENSIVE"]}}'::jsonb,
  '{"provider":"MOCK-PROVIDER-001","quote":{"annualPremiumPence":70140,"baseExcessPence":35000,"voluntaryExcessPence":50000,"paymentBasis":"ANNUAL","coverageMarkers":["COMPREHENSIVE"]}}',
  '4444444444444444444444444444444444444444444444444444444444444444',
  'MP001-SP4-PCW','2026-09-18T12:00:00Z'
);

INSERT INTO normalised_quote(
  normalised_quote_id,raw_provider_response_id,normalisation_version,
  annual_cash_premium_pence,finance_cost_pence,compulsory_excess_pence,voluntary_excess_pence,
  comparison_state,comparison_reason,normalisation_fingerprint
) VALUES
(
  'NOR-SP4-ROUTE-DIRECT','RAW-SP4-ROUTE-DIRECT','sp2-normaliser-v1',
  70140,0,35000,50000,'DIRECTLY_COMPARABLE','REQUIRED_FIELDS_PRESENT',
  '5555555555555555555555555555555555555555555555555555555555555555'
),
(
  'NOR-SP4-ROUTE-PCW','RAW-SP4-ROUTE-PCW','sp2-normaliser-v1',
  70140,0,35000,50000,'DIRECTLY_COMPARABLE','REQUIRED_FIELDS_PRESENT',
  '6666666666666666666666666666666666666666666666666666666666666666'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO quote_run(quote_run_id,risk_profile_version_id)
    VALUES('QRUN-SP4-ROUTE-BAD','RPV-PG-001-V2');

    INSERT INTO quote_request(
      quote_request_id,quote_run_id,scenario_id,provider_key,channel_key,
      adapter_version,mapping_version,request_fingerprint
    ) VALUES(
      'QREQ-SP4-ROUTE-BAD','QRUN-SP4-ROUTE-BAD','SCN-SP4-PG-001',
      'MOCK-PROVIDER-001','DIRECT_SYNTHETIC','mock-adapter-v1','mock-mapping-v1',
      'sp4-route-bad-request'
    );

    INSERT INTO sp4_quote_request_lineage(
      quote_request_id,market_route_id,customer_objective_id,scenario_id,
      risk_profile_version_id,route_fingerprint,orchestration_version
    ) VALUES(
      'QREQ-SP4-ROUTE-BAD','MR-SP4-PG-PCW','OBJ-SP4-PG-001','SCN-SP4-PG-001',
      'RPV-PG-001-V2',
      '2222222222222222222222222222222222222222222222222222222222222222',
      'sp4-route-orchestrator-v1'
    );
    RAISE EXCEPTION 'TEST_FAILURE_ROUTE_METADATA_MISMATCH_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_ROUTE_METADATA_MISMATCH_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_MARKET_ROUTE_METADATA_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE market_route
    SET mapping_version='tampered'
    WHERE market_route_id='MR-SP4-PG-DIRECT';
    RAISE EXCEPTION 'TEST_FAILURE_MARKET_ROUTE_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_MARKET_ROUTE_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_ROUTE_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  route_count integer;
  lineage_count integer;
  raw_count integer;
  normalised_count integer;
  mismatch_count integer;
BEGIN
  SELECT count(*) INTO route_count FROM market_route;
  SELECT count(*) INTO lineage_count
  FROM sp4_quote_request_lineage
  WHERE scenario_id='SCN-SP4-PG-001';
  SELECT count(*) INTO raw_count
  FROM raw_provider_response
  WHERE quote_request_id IN ('QREQ-SP4-ROUTE-DIRECT','QREQ-SP4-ROUTE-PCW');
  SELECT count(*) INTO normalised_count
  FROM normalised_quote
  WHERE raw_provider_response_id IN ('RAW-SP4-ROUTE-DIRECT','RAW-SP4-ROUTE-PCW');

  SELECT count(*) INTO mismatch_count
  FROM sp4_quote_request_lineage l
  JOIN market_route r ON r.market_route_id=l.market_route_id
  JOIN quote_request q ON q.quote_request_id=l.quote_request_id
  WHERE q.provider_key IS DISTINCT FROM r.provider_key
     OR q.channel_key IS DISTINCT FROM r.channel_key
     OR q.adapter_version IS DISTINCT FROM r.adapter_version
     OR q.mapping_version IS DISTINCT FROM r.mapping_version
     OR l.route_fingerprint IS DISTINCT FROM r.route_fingerprint;

  IF route_count <> 2 THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_ROUTE_COUNT'; END IF;
  IF lineage_count <> 2 THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_ROUTE_LINEAGE_COUNT'; END IF;
  IF raw_count <> 2 THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_ROUTE_RAW_COUNT'; END IF;
  IF normalised_count <> 2 THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_ROUTE_NORMALISED_COUNT'; END IF;
  IF mismatch_count <> 0 THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_ROUTE_LINEAGE_MISMATCH'; END IF;
END $$;

SELECT 'POSTGRES_SPRINT4_MARKET_ROUTE_CONTRACT_PASS' AS result;
