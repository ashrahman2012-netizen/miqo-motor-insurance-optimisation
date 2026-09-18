\set ON_ERROR_STOP on

-- Runs after the pre-quote contract. QREQ-SP2-PG-001 is a permitted synthetic request.
DO $$
BEGIN
  BEGIN
    INSERT INTO raw_provider_response(
      raw_provider_response_id,quote_request_id,payload_json
    ) VALUES(
      'RAW-SP2-INCOMPLETE','QREQ-SP2-PG-001','{"provider":"MOCK-PROVIDER-001"}'::jsonb
    );
    RAISE EXCEPTION 'TEST_FAILURE_INCOMPLETE_RAW_CAPTURE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_INCOMPLETE_RAW_CAPTURE_ALLOWED' THEN RAISE; END IF;
    IF position('RAW_PROVIDER_CAPTURE_INCOMPLETE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO raw_provider_response(
  raw_provider_response_id,quote_request_id,payload_json,payload_text,payload_sha256,
  provider_reference,provider_response_at
) VALUES(
  'RAW-SP2-PG-001',
  'QREQ-SP2-PG-001',
  '{"provider":"MOCK-PROVIDER-001","providerVersion":"mock-provider-v1","providerReference":"MP001-PG-CONTRACT","responseTimestamp":"2026-09-18T12:00:00.000Z","quote":{"annualPremiumPence":70140,"baseExcessPence":35000,"voluntaryExcessPence":50000,"totalExcessPence":85000,"paymentBasis":"ANNUAL","coverageMarkers":["COMPREHENSIVE"]}}'::jsonb,
  '{"provider":"MOCK-PROVIDER-001","providerVersion":"mock-provider-v1","providerReference":"MP001-PG-CONTRACT","responseTimestamp":"2026-09-18T12:00:00.000Z","quote":{"annualPremiumPence":70140,"baseExcessPence":35000,"voluntaryExcessPence":50000,"totalExcessPence":85000,"paymentBasis":"ANNUAL","coverageMarkers":["COMPREHENSIVE"]}}',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'MP001-PG-CONTRACT',
  '2026-09-18T12:00:00.000Z'::timestamptz
);

DO $$
DECLARE
  captured_text text;
  captured_reference text;
  normalised_count integer;
BEGIN
  SELECT payload_text,provider_reference
    INTO captured_text,captured_reference
  FROM raw_provider_response
  WHERE raw_provider_response_id='RAW-SP2-PG-001';

  SELECT count(*) INTO normalised_count
  FROM normalised_quote
  WHERE raw_provider_response_id='RAW-SP2-PG-001';

  IF captured_text IS NULL OR position('"annualPremiumPence":70140' in captured_text)=0
    THEN RAISE EXCEPTION 'TEST_FAILURE_RAW_TEXT_NOT_PRESERVED'; END IF;
  IF captured_reference <> 'MP001-PG-CONTRACT'
    THEN RAISE EXCEPTION 'TEST_FAILURE_PROVIDER_REFERENCE_NOT_PRESERVED'; END IF;
  IF normalised_count <> 0
    THEN RAISE EXCEPTION 'TEST_FAILURE_NORMALISATION_ENTERED_EXEC005'; END IF;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE raw_provider_response
    SET payload_text='tampered'
    WHERE raw_provider_response_id='RAW-SP2-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_RAW_UPDATE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_RAW_UPDATE_ALLOWED' THEN RAISE; END IF;
    IF position('RAW_PROVIDER_RESPONSE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    DELETE FROM raw_provider_response
    WHERE raw_provider_response_id='RAW-SP2-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_RAW_DELETE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_RAW_DELETE_ALLOWED' THEN RAISE; END IF;
    IF position('RAW_PROVIDER_RESPONSE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

SELECT 'POSTGRES_SPRINT2_RAW_PROVIDER_CONTRACT_PASS' AS result;
