\set ON_ERROR_STOP on

-- Requires Sprint 4 recommendation contract state:
-- REC-SP4-PG-001 / RQE-SP4-PG-DIRECT / SCN-SP4-ROUTE-PG / MR-SP4-PG-DIRECT.

INSERT INTO recommendation_explanation(
  recommendation_explanation_id,recommendation_set_id,objective_id,objective_version,
  catalogue_version,policy_fingerprint,recommendation_rule_version,explanation_rule_version,
  surfaced_scenario_id,surfaced_market_route_id,surfaced_normalised_quote_id,
  eligible_evidence_json,excluded_evidence_json,material_reasons_json,explanation_fingerprint
) VALUES(
  'REX-SP4-PG-001','REC-SP4-PG-001','LOWEST_ANNUAL_PREMIUM','sp4-objectives-v1',
  'sp4-catalogue-v2','cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'sp4-recommendation-v1','sp4-explainability-v1',
  'SCN-SP4-ROUTE-PG','MR-SP4-PG-DIRECT','NOR-SP4-ROUTE-DIRECT',
  '[{"normalisedQuoteId":"NOR-SP4-ROUTE-DIRECT","ordinal":1,"objectiveMetric":"annual_cash_premium_pence","objectiveMetricValuePence":70140}]'::jsonb,
  '[{"normalisedQuoteId":"NOR-SP4-ROUTE-ADJUSTED","exclusionReason":"COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE"}]'::jsonb,
  '[{"code":"CUSTOMER_OBJECTIVE_APPLIED"},{"code":"COMMERCIAL_INPUTS_EXCLUDED"}]'::jsonb,
  '1212121212121212121212121212121212121212121212121212121212121212'
);

INSERT INTO optimisation_explanation(
  explanation_id,recommendation_set_id,scenario_id,market_route_id,field_or_control,
  classification,source,customer_can_change,baseline_value,scenario_value,
  quoted_effect_if_observable,legitimacy_reason,provider_channel_applicability,
  rule_version,explanation_fingerprint
) VALUES(
  'OEX-SP4-PG-001','REC-SP4-PG-001','SCN-SP4-ROUTE-PG','MR-SP4-PG-DIRECT',
  'voluntary_excess','CONTROLLABLE','scenario_delta',true,
  '500'::jsonb,'500'::jsonb,
  '{"objectiveMetric":"annual_cash_premium_pence","baselineValuePence":70140,"scenarioValuePence":70140,"differencePence":0}'::jsonb,
  'Customer-selectable voluntary excess within the approved optimisation catalogue.',
  '{"marketRouteId":"MR-SP4-PG-DIRECT","routeKey":"MOCK-001-DIRECT","providerKey":"MOCK-PROVIDER-001","channelKey":"DIRECT_SYNTHETIC","adapterVersion":"mock-adapter-v1","mappingVersion":"mock-mapping-v1"}'::jsonb,
  'sp4-explainability-v1',
  '3434343434343434343434343434343434343434343434343434343434343434'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO recommendation_explanation(
      recommendation_explanation_id,recommendation_set_id,objective_id,objective_version,
      catalogue_version,policy_fingerprint,recommendation_rule_version,explanation_rule_version,
      surfaced_scenario_id,surfaced_market_route_id,surfaced_normalised_quote_id,
      eligible_evidence_json,excluded_evidence_json,material_reasons_json,explanation_fingerprint
    ) VALUES(
      'REX-SP4-PG-BAD','REC-SP4-PG-001','LOWEST_ANNUAL_PREMIUM','sp4-objectives-v1',
      'sp4-catalogue-v2','cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'sp4-recommendation-v1','sp4-explainability-v1',
      'SCN-SP4-ROUTE-PG','MR-SP4-PG-PCW','NOR-SP4-ROUTE-DIRECT',
      '[]'::jsonb,'[]'::jsonb,'[]'::jsonb,
      '5656565656565656565656565656565656565656565656565656565656565656'
    );
    RAISE EXCEPTION 'TEST_FAILURE_BAD_EXPLANATION_ROUTE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_BAD_EXPLANATION_ROUTE_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_EXPLANATION_SURFACED_EVIDENCE_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO optimisation_explanation(
      explanation_id,recommendation_set_id,scenario_id,market_route_id,field_or_control,
      classification,source,customer_can_change,baseline_value,scenario_value,
      quoted_effect_if_observable,legitimacy_reason,provider_channel_applicability,
      rule_version,explanation_fingerprint
    ) VALUES(
      'OEX-SP4-PG-BAD','REC-SP4-PG-001','SCN-SP4-PG-001','MR-SP4-PG-DIRECT',
      'voluntary_excess','CONTROLLABLE','scenario_delta',true,
      '250'::jsonb,'500'::jsonb,NULL,
      'Invalid cross-scenario explanation fixture.',
      '{}'::jsonb,'sp4-explainability-v1',
      '7878787878787878787878787878787878787878787878787878787878787878'
    );
    RAISE EXCEPTION 'TEST_FAILURE_BAD_OPTIMISATION_EXPLANATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_BAD_OPTIMISATION_EXPLANATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_OPTIMISATION_EXPLANATION_LINEAGE_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO synthetic_commercial_metadata(
  synthetic_commercial_metadata_id,market_route_id,commercial_version,
  provider_remuneration_pence,introducer_remuneration_pence,referral_revenue_pence,metadata_json
) VALUES
(
  'SCM-SP4-PG-A','MR-SP4-PG-DIRECT','commercial-a',
  999999,500000,250000,'{"test":"high-remuneration"}'::jsonb
),
(
  'SCM-SP4-PG-B','MR-SP4-PG-DIRECT','commercial-b',
  0,0,900000,'{"test":"different-remuneration"}'::jsonb
);

DO $$
BEGIN
  BEGIN
    UPDATE recommendation_explanation
    SET objective_id='LOWEST_FINANCE_COST'
    WHERE recommendation_explanation_id='REX-SP4-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_EXPLANATION_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_EXPLANATION_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_EXPLANATION_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  rec_fingerprint text;
  rec_surfaced text;
  forbidden_count integer;
  explanation_count integer;
  control_count integer;
  commercial_versions integer;
BEGIN
  SELECT recommendation_fingerprint,surfaced_normalised_quote_id
    INTO rec_fingerprint,rec_surfaced
  FROM recommendation_set
  WHERE recommendation_set_id='REC-SP4-PG-001';

  SELECT count(*) INTO forbidden_count
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name IN (
      'scenario','scenario_delta','normalised_quote',
      'recommendation_set','recommendation_quote_evidence',
      'recommendation_explanation','optimisation_explanation'
    )
    AND (
      column_name ILIKE '%commission%'
      OR column_name ILIKE '%remuneration%'
      OR column_name ILIKE '%margin%'
      OR column_name ILIKE '%referral_revenue%'
    );

  SELECT count(*) INTO explanation_count
  FROM recommendation_explanation
  WHERE recommendation_set_id='REC-SP4-PG-001'
    AND explanation_rule_version='sp4-explainability-v1';

  SELECT count(*) INTO control_count
  FROM optimisation_explanation
  WHERE recommendation_set_id='REC-SP4-PG-001'
    AND field_or_control='voluntary_excess'
    AND classification='CONTROLLABLE';

  SELECT count(*) INTO commercial_versions
  FROM synthetic_commercial_metadata
  WHERE market_route_id='MR-SP4-PG-DIRECT';

  IF rec_fingerprint <> '9999999999999999999999999999999999999999999999999999999999999999'
    THEN RAISE EXCEPTION 'TEST_FAILURE_COMMERCIAL_METADATA_CHANGED_RECOMMENDATION_FINGERPRINT'; END IF;
  IF rec_surfaced <> 'NOR-SP4-ROUTE-DIRECT'
    THEN RAISE EXCEPTION 'TEST_FAILURE_COMMERCIAL_METADATA_CHANGED_SURFACED_QUOTE'; END IF;
  IF forbidden_count <> 0
    THEN RAISE EXCEPTION 'TEST_FAILURE_COMMERCIAL_FIELDS_ENTERED_CORE_SCHEMA'; END IF;
  IF explanation_count <> 1
    THEN RAISE EXCEPTION 'TEST_FAILURE_RECOMMENDATION_EXPLANATION_COUNT'; END IF;
  IF control_count <> 1
    THEN RAISE EXCEPTION 'TEST_FAILURE_OPTIMISATION_EXPLANATION_COUNT'; END IF;
  IF commercial_versions <> 2
    THEN RAISE EXCEPTION 'TEST_FAILURE_COMMERCIAL_METADATA_VERSION_COUNT'; END IF;
END $$;

SELECT 'POSTGRES_SPRINT4_EXPLAINABILITY_COMMERCIAL_INDEPENDENCE_CONTRACT_PASS' AS result;
