\set ON_ERROR_STOP on

-- Runs after Sprint 2 normalisation contract.
-- NOR-SP2-PG-001 is DIRECTLY_COMPARABLE and traces to RPV-PG-001-V2 / SCN-SP2-PG-001 / QREQ-SP2-PG-001.

INSERT INTO shortlist(
  shortlist_id,risk_profile_version_id,comparison_rule_version,comparison_fingerprint
) VALUES(
  'SL-SP3-PG-001','RPV-PG-001-V2','sp3-comparison-v1',
  'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
);

INSERT INTO shortlist_entry(
  shortlist_entry_id,shortlist_id,normalised_quote_id,ordinal
) VALUES(
  'SLE-SP3-PG-001','SL-SP3-PG-001','NOR-SP2-PG-001',1
);

INSERT INTO normalised_quote(
  normalised_quote_id,raw_provider_response_id,normalisation_version,
  annual_cash_premium_pence,finance_cost_pence,compulsory_excess_pence,voluntary_excess_pence,
  comparison_state,comparison_reason,normalisation_fingerprint
) VALUES(
  'NOR-SP3-PG-NOT-COMPARABLE','RAW-SP2-PG-001','sp3-contract-non-comparable',
  NULL,NULL,NULL,NULL,
  'NOT_COMPARABLE','CONTRACT_FIXTURE',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO shortlist_entry(
      shortlist_entry_id,shortlist_id,normalised_quote_id,ordinal
    ) VALUES(
      'SLE-SP3-PG-BAD','SL-SP3-PG-001','NOR-SP3-PG-NOT-COMPARABLE',2
    );
    RAISE EXCEPTION 'TEST_FAILURE_NON_COMPARABLE_SHORTLISTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_NON_COMPARABLE_SHORTLISTED' THEN RAISE; END IF;
    IF position('SHORTLIST_REQUIRES_DIRECTLY_COMPARABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO selection(
      selection_id,shortlist_id,normalised_quote_id,scenario_id,quote_request_id,risk_profile_version_id,status
    ) VALUES(
      'SEL-SP3-PG-BAD-LINEAGE','SL-SP3-PG-001','NOR-SP2-PG-001',
      'SCN-SP2-PG-001','QREQ-PG-001','RPV-PG-001-V2','ACCEPTED'
    );
    RAISE EXCEPTION 'TEST_FAILURE_SELECTION_LINEAGE_BYPASS_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_SELECTION_LINEAGE_BYPASS_ALLOWED' THEN RAISE; END IF;
    IF position('SELECTION_LINEAGE_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO selection(
  selection_id,shortlist_id,normalised_quote_id,scenario_id,quote_request_id,risk_profile_version_id,status
) VALUES(
  'SEL-SP3-PG-001','SL-SP3-PG-001','NOR-SP2-PG-001',
  'SCN-SP2-PG-001','QREQ-SP2-PG-001','RPV-PG-001-V2','ACCEPTED'
);

INSERT INTO final_integrity_result(
  final_integrity_result_id,selection_id,integrity_rule_version,outcome,evidence_json
) VALUES(
  'FIR-SP3-PG-001','SEL-SP3-PG-001','sp3-final-integrity-v1','PASS',
  '{"contract":"selection-lineage-pass"}'::jsonb
);

INSERT INTO prototype_completion(
  prototype_completion_id,selection_id,profile_id,status,data_classification,live_provider_activity
) VALUES(
  'COMP-SP3-PG-001','SEL-SP3-PG-001','PRO-PG-001',
  'PROTOTYPE_JOURNEY_COMPLETE','SYNTHETIC','DISABLED'
);

DO $$
DECLARE
  selected_quote text;
  selected_scenario text;
  selected_request text;
  selected_version text;
  completion_state text;
BEGIN
  SELECT normalised_quote_id,scenario_id,quote_request_id,risk_profile_version_id
    INTO selected_quote,selected_scenario,selected_request,selected_version
  FROM selection WHERE selection_id='SEL-SP3-PG-001';

  SELECT status INTO completion_state
  FROM prototype_completion WHERE selection_id='SEL-SP3-PG-001';

  IF selected_quote <> 'NOR-SP2-PG-001' THEN RAISE EXCEPTION 'TEST_FAILURE_SELECTION_QUOTE_LINEAGE'; END IF;
  IF selected_scenario <> 'SCN-SP2-PG-001' THEN RAISE EXCEPTION 'TEST_FAILURE_SELECTION_SCENARIO_LINEAGE'; END IF;
  IF selected_request <> 'QREQ-SP2-PG-001' THEN RAISE EXCEPTION 'TEST_FAILURE_SELECTION_REQUEST_LINEAGE'; END IF;
  IF selected_version <> 'RPV-PG-001-V2' THEN RAISE EXCEPTION 'TEST_FAILURE_SELECTION_PROFILE_LINEAGE'; END IF;
  IF completion_state <> 'PROTOTYPE_JOURNEY_COMPLETE' THEN RAISE EXCEPTION 'TEST_FAILURE_COMPLETION_STATE'; END IF;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE selection SET status='BLOCKED' WHERE selection_id='SEL-SP3-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_SELECTION_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_SELECTION_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SPRINT3_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    DELETE FROM final_integrity_result WHERE selection_id='SEL-SP3-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_FINAL_INTEGRITY_DELETE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_FINAL_INTEGRITY_DELETE_ALLOWED' THEN RAISE; END IF;
    IF position('SPRINT3_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE audit_event SET event_type='tampered'
    WHERE audit_event_id=(SELECT audit_event_id FROM audit_event LIMIT 1);
    RAISE EXCEPTION 'TEST_FAILURE_AUDIT_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_AUDIT_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('AUDIT_EVENT_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

SELECT 'POSTGRES_SPRINT3_SELECTION_CONTRACT_PASS' AS result;
