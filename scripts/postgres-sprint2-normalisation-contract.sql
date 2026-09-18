\set ON_ERROR_STOP on

-- Runs after raw-provider contract. RAW-SP2-PG-001 contains a complete mock-provider response.
INSERT INTO normalised_quote(
  normalised_quote_id,raw_provider_response_id,normalisation_version,
  annual_cash_premium_pence,finance_cost_pence,compulsory_excess_pence,voluntary_excess_pence,
  comparison_state,comparison_reason,normalisation_fingerprint
) VALUES(
  'NOR-SP2-PG-001','RAW-SP2-PG-001','sp2-normaliser-v1',
  70140,0,35000,50000,
  'DIRECTLY_COMPARABLE','REQUIRED_FIELDS_PRESENT',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO normalised_quote(
      normalised_quote_id,raw_provider_response_id,normalisation_version,
      annual_cash_premium_pence,finance_cost_pence,compulsory_excess_pence,voluntary_excess_pence,
      comparison_state,comparison_reason,normalisation_fingerprint
    ) VALUES(
      'NOR-SP2-ADJUSTED','RAW-SP2-PG-001','sp2-normaliser-v2',
      70140,0,35000,50000,
      'ADJUSTED_COMPARABLE','UNAPPROVED',
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    );
    RAISE EXCEPTION 'TEST_FAILURE_ADJUSTED_COMPARABLE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_ADJUSTED_COMPARABLE_ALLOWED' THEN RAISE; END IF;
    IF position('ADJUSTED_COMPARABLE_NOT_APPROVED' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE normalised_quote SET comparison_reason='tampered'
    WHERE normalised_quote_id='NOR-SP2-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_NORMALISED_UPDATE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_NORMALISED_UPDATE_ALLOWED' THEN RAISE; END IF;
    IF position('NORMALISED_QUOTE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE raw_text_before text; raw_text_after text;
BEGIN
  SELECT payload_text INTO raw_text_before FROM raw_provider_response WHERE raw_provider_response_id='RAW-SP2-PG-001';
  SELECT payload_text INTO raw_text_after FROM raw_provider_response WHERE raw_provider_response_id='RAW-SP2-PG-001';
  IF raw_text_before IS DISTINCT FROM raw_text_after THEN
    RAISE EXCEPTION 'TEST_FAILURE_RAW_CHANGED_DURING_NORMALISATION';
  END IF;
END $$;

SELECT 'POSTGRES_SPRINT2_NORMALISATION_CONTRACT_PASS' AS result;
