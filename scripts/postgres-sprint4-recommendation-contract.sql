\set ON_ERROR_STOP on

-- Requires the existing Sprint 4 MarketRoute contract fixture:
-- OBJ-SP4-ROUTE-PG / exploration 777... / two DIRECTLY_COMPARABLE route quotes.

INSERT INTO recommendation_set(
  recommendation_set_id,customer_objective_id,risk_profile_version_id,
  exploration_fingerprint,objective_id,objective_version,catalogue_version,
  policy_fingerprint,recommendation_rule_version,recommendation_fingerprint,
  surfaced_normalised_quote_id
) VALUES(
  'REC-SP4-PG-001','OBJ-SP4-ROUTE-PG','RPV-SP4-ROUTE-PG',
  '7777777777777777777777777777777777777777777777777777777777777777',
  'LOWEST_ANNUAL_PREMIUM','sp4-objectives-v1','sp4-catalogue-v2',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'sp4-recommendation-v1',
  '9999999999999999999999999999999999999999999999999999999999999999',
  'NOR-SP4-ROUTE-DIRECT'
);

INSERT INTO recommendation_quote_evidence(
  recommendation_quote_evidence_id,recommendation_set_id,normalised_quote_id,
  quote_request_id,scenario_id,market_route_id,evidence_status,ordinal,
  objective_metric,objective_metric_value_pence,exclusion_reason,evidence_json,evidence_fingerprint
) VALUES(
  'RQE-SP4-PG-DIRECT','REC-SP4-PG-001','NOR-SP4-ROUTE-DIRECT',
  'QREQ-SP4-ROUTE-DIRECT','SCN-SP4-ROUTE-PG','MR-SP4-PG-DIRECT','ELIGIBLE',1,
  'annual_cash_premium_pence',70140,NULL,
  '{"comparisonState":"DIRECTLY_COMPARABLE"}'::jsonb,
  'abababababababababababababababababababababababababababababababab'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO recommendation_quote_evidence(
      recommendation_quote_evidence_id,recommendation_set_id,normalised_quote_id,
      quote_request_id,scenario_id,market_route_id,evidence_status,ordinal,
      objective_metric,objective_metric_value_pence,exclusion_reason,evidence_json,evidence_fingerprint
    ) VALUES(
      'RQE-SP4-PG-EFFECTIVE-BAD','REC-SP4-PG-001','NOR-SP4-ROUTE-PCW',
      'QREQ-SP4-ROUTE-PCW','SCN-SP4-ROUTE-PG','MR-SP4-PG-PCW','ELIGIBLE',2,
      'effective_cost_pence',155140,NULL,'{}'::jsonb,
      'bcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbc'
    );
    RAISE EXCEPTION 'TEST_FAILURE_EFFECTIVE_COST_METRIC_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_EFFECTIVE_COST_METRIC_ALLOWED' THEN RAISE; END IF;
    IF position('recommendation_quote_metric_allowed' in SQLERRM)=0
       AND position('SP4_RECOMMENDATION_OBJECTIVE_METRIC_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO recommendation_quote_evidence(
  recommendation_quote_evidence_id,recommendation_set_id,normalised_quote_id,
  quote_request_id,scenario_id,market_route_id,evidence_status,ordinal,
  objective_metric,objective_metric_value_pence,exclusion_reason,evidence_json,evidence_fingerprint
) VALUES(
  'RQE-SP4-PG-PCW','REC-SP4-PG-001','NOR-SP4-ROUTE-PCW',
  'QREQ-SP4-ROUTE-PCW','SCN-SP4-ROUTE-PG','MR-SP4-PG-PCW','ELIGIBLE',2,
  'annual_cash_premium_pence',70140,NULL,
  '{"comparisonState":"DIRECTLY_COMPARABLE"}'::jsonb,
  'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd'
);

INSERT INTO normalised_quote(
  normalised_quote_id,raw_provider_response_id,normalisation_version,
  annual_cash_premium_pence,finance_cost_pence,compulsory_excess_pence,voluntary_excess_pence,
  comparison_state,comparison_reason,normalisation_fingerprint
) VALUES(
  'NOR-SP4-ROUTE-ADJUSTED','RAW-SP4-ROUTE-PCW','sp4-adjusted-fixture-v1',
  1,0,1,1,'ADJUSTED_COMPARABLE','TEST_ONLY_ADJUSTED_FIXTURE',
  'dededededededededededededededededededededededededededededededede'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO recommendation_quote_evidence(
      recommendation_quote_evidence_id,recommendation_set_id,normalised_quote_id,
      quote_request_id,scenario_id,market_route_id,evidence_status,ordinal,
      objective_metric,objective_metric_value_pence,exclusion_reason,evidence_json,evidence_fingerprint
    ) VALUES(
      'RQE-SP4-PG-ADJ-BAD','REC-SP4-PG-001','NOR-SP4-ROUTE-ADJUSTED',
      'QREQ-SP4-ROUTE-PCW','SCN-SP4-ROUTE-PG','MR-SP4-PG-PCW','ELIGIBLE',3,
      'annual_cash_premium_pence',1,NULL,'{}'::jsonb,
      'efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef'
    );
    RAISE EXCEPTION 'TEST_FAILURE_ADJUSTED_COMPARABLE_RANKED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_ADJUSTED_COMPARABLE_RANKED' THEN RAISE; END IF;
    IF position('SP4_RECOMMENDATION_INELIGIBLE_COMPARISON_STATE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO recommendation_quote_evidence(
  recommendation_quote_evidence_id,recommendation_set_id,normalised_quote_id,
  quote_request_id,scenario_id,market_route_id,evidence_status,ordinal,
  objective_metric,objective_metric_value_pence,exclusion_reason,evidence_json,evidence_fingerprint
) VALUES(
  'RQE-SP4-PG-ADJ-EXCLUDED','REC-SP4-PG-001','NOR-SP4-ROUTE-ADJUSTED',
  'QREQ-SP4-ROUTE-PCW','SCN-SP4-ROUTE-PG','MR-SP4-PG-PCW','EXCLUDED',NULL,
  NULL,NULL,'COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE',
  '{"comparisonState":"ADJUSTED_COMPARABLE"}'::jsonb,
  'f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0'
);

DO $$
BEGIN
  BEGIN
    UPDATE recommendation_set
    SET recommendation_rule_version='tampered'
    WHERE recommendation_set_id='REC-SP4-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_RECOMMENDATION_SET_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_RECOMMENDATION_SET_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_RECOMMENDATION_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  eligible_count integer;
  excluded_count integer;
  adjusted_status text;
  bad_metric_count integer;
BEGIN
  SELECT count(*) INTO eligible_count
  FROM recommendation_quote_evidence
  WHERE recommendation_set_id='REC-SP4-PG-001' AND evidence_status='ELIGIBLE';

  SELECT count(*) INTO excluded_count
  FROM recommendation_quote_evidence
  WHERE recommendation_set_id='REC-SP4-PG-001' AND evidence_status='EXCLUDED';

  SELECT evidence_status INTO adjusted_status
  FROM recommendation_quote_evidence
  WHERE recommendation_quote_evidence_id='RQE-SP4-PG-ADJ-EXCLUDED';

  SELECT count(*) INTO bad_metric_count
  FROM recommendation_quote_evidence
  WHERE objective_metric='effective_cost_pence';

  IF eligible_count <> 2 THEN RAISE EXCEPTION 'TEST_FAILURE_RECOMMENDATION_ELIGIBLE_COUNT'; END IF;
  IF excluded_count <> 1 THEN RAISE EXCEPTION 'TEST_FAILURE_RECOMMENDATION_EXCLUDED_COUNT'; END IF;
  IF adjusted_status <> 'EXCLUDED' THEN RAISE EXCEPTION 'TEST_FAILURE_ADJUSTED_NOT_EXCLUDED'; END IF;
  IF bad_metric_count <> 0 THEN RAISE EXCEPTION 'TEST_FAILURE_EFFECTIVE_COST_PERSISTED'; END IF;
END $$;

SELECT 'POSTGRES_SPRINT4_RECOMMENDATION_CONTRACT_PASS' AS result;
