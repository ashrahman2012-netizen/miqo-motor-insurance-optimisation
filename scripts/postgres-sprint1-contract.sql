\set ON_ERROR_STOP on

-- This contract runs after 0001_walking_skeleton.sql on an empty PostgreSQL database.
INSERT INTO customer (customer_id,synthetic) VALUES ('CUS-PG-001',true);
INSERT INTO profile (profile_id,customer_id) VALUES ('PRO-PG-001','CUS-PG-001');
INSERT INTO risk_profile_version (risk_profile_version_id,profile_id,version_no,status)
VALUES ('RPV-PG-001-V1','PRO-PG-001',1,'DRAFT');

INSERT INTO canonical_field_value
(canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type)
VALUES
('CFV-PG-001-A','RPV-PG-001-V1','main_driver_id','F','"DRV-PG-001"'::jsonb,'customer_declared'),
('CFV-PG-001-B','RPV-PG-001-V1','annual_mileage','F','8000'::jsonb,'customer_declared'),
('CFV-PG-001-C','RPV-PG-001-V1','licence_held_since','F','"2018-04-16"'::jsonb,'customer_declared');

BEGIN;
UPDATE risk_profile_version
SET status='LOCKED', locked_at=now()
WHERE risk_profile_version_id='RPV-PG-001-V1';
INSERT INTO audit_event
(audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json)
VALUES ('AUD-PG-LOCK-001','profile_locked','risk_profile_version','RPV-PG-001-V1','PRO-PG-001','{"versionNo":1}'::jsonb);
COMMIT;

DO $$
BEGIN
  BEGIN
    UPDATE canonical_field_value
    SET value_json='5000'::jsonb
    WHERE risk_profile_version_id='RPV-PG-001-V1' AND field_id='annual_mileage';
    RAISE EXCEPTION 'TEST_FAILURE_LOCKED_FACT_UPDATE_WAS_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_FAILURE_LOCKED_FACT_UPDATE_WAS_ALLOWED' THEN RAISE; END IF;
    IF position('LOCKED_PROFILE_IMMUTABLE' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
END $$;

-- Locked-version guard must reject DELETE and INSERT as well as UPDATE.
DO $$
BEGIN
  BEGIN
    DELETE FROM canonical_field_value WHERE risk_profile_version_id='RPV-PG-001-V1' AND field_id='annual_mileage';
    RAISE EXCEPTION 'TEST_FAILURE_LOCKED_FACT_DELETE_WAS_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_FAILURE_LOCKED_FACT_DELETE_WAS_ALLOWED' THEN RAISE; END IF;
    IF position('LOCKED_PROFILE_IMMUTABLE' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO canonical_field_value
      (canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type)
    VALUES ('CFV-PG-LOCKED-INSERT','RPV-PG-001-V1','replacement_fact','F','"blocked"'::jsonb,'customer_declared');
    RAISE EXCEPTION 'TEST_FAILURE_LOCKED_FACT_INSERT_WAS_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_FAILURE_LOCKED_FACT_INSERT_WAS_ALLOWED' THEN RAISE; END IF;
    IF position('LOCKED_PROFILE_IMMUTABLE' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO scenario (scenario_id,risk_profile_version_id,status)
VALUES ('SCN-PG-001','RPV-PG-001-V1','READY');

DO $$
BEGIN
  BEGIN
    INSERT INTO scenario_delta
    (scenario_delta_id,scenario_id,field_id,control_class,value_json)
    VALUES ('SCD-PG-BAD','SCN-PG-001','annual_mileage','F','5000'::jsonb);
    RAISE EXCEPTION 'TEST_FAILURE_F_DELTA_WAS_ALLOWED';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;

INSERT INTO scenario_delta
(scenario_delta_id,scenario_id,field_id,control_class,value_json)
VALUES ('SCD-PG-GOOD','SCN-PG-001','voluntary_excess','O','500'::jsonb);

-- Approved correction creates a new factual version; v1 remains unchanged.
INSERT INTO risk_profile_version (risk_profile_version_id,profile_id,version_no,status)
VALUES ('RPV-PG-001-V2','PRO-PG-001',2,'DRAFT');

INSERT INTO canonical_field_value
(canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type)
SELECT
  'V2-' || canonical_field_value_id,
  'RPV-PG-001-V2',
  field_id,
  control_class,
  CASE WHEN field_id='annual_mileage' THEN '9000'::jsonb ELSE value_json END,
  CASE WHEN field_id='annual_mileage' THEN 'customer_correction' ELSE source_type END
FROM canonical_field_value
WHERE risk_profile_version_id='RPV-PG-001-V1';

BEGIN;
UPDATE risk_profile_version SET status='SUPERSEDED' WHERE risk_profile_version_id='RPV-PG-001-V1';
UPDATE risk_profile_version SET status='LOCKED',locked_at=now() WHERE risk_profile_version_id='RPV-PG-001-V2';
INSERT INTO audit_event
(audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json)
VALUES ('AUD-PG-LOCK-002','profile_locked','risk_profile_version','RPV-PG-001-V2','PRO-PG-001','{"versionNo":2}'::jsonb);
COMMIT;

DO $$
DECLARE v1_mileage integer; v2_mileage integer; v1_status profile_version_status; v2_status profile_version_status;
BEGIN
  SELECT (value_json #>> '{}')::integer INTO v1_mileage FROM canonical_field_value
    WHERE risk_profile_version_id='RPV-PG-001-V1' AND field_id='annual_mileage';
  SELECT (value_json #>> '{}')::integer INTO v2_mileage FROM canonical_field_value
    WHERE risk_profile_version_id='RPV-PG-001-V2' AND field_id='annual_mileage';
  SELECT status INTO v1_status FROM risk_profile_version WHERE risk_profile_version_id='RPV-PG-001-V1';
  SELECT status INTO v2_status FROM risk_profile_version WHERE risk_profile_version_id='RPV-PG-001-V2';

  IF v1_mileage <> 8000 THEN RAISE EXCEPTION 'TEST_FAILURE_V1_CHANGED'; END IF;
  IF v2_mileage <> 9000 THEN RAISE EXCEPTION 'TEST_FAILURE_V2_CORRECTION_MISSING'; END IF;
  IF v1_status <> 'SUPERSEDED' THEN RAISE EXCEPTION 'TEST_FAILURE_V1_NOT_SUPERSEDED'; END IF;
  IF v2_status <> 'LOCKED' THEN RAISE EXCEPTION 'TEST_FAILURE_V2_NOT_LOCKED'; END IF;
END $$;

-- Lock + audit persistence is atomic: simulate audit failure inside a subtransaction and
-- verify the lock update rolls back.
INSERT INTO customer (customer_id,synthetic) VALUES ('CUS-PG-TX',true);
INSERT INTO profile (profile_id,customer_id) VALUES ('PRO-PG-TX','CUS-PG-TX');
INSERT INTO risk_profile_version (risk_profile_version_id,profile_id,version_no,status)
VALUES ('RPV-PG-TX-V1','PRO-PG-TX',1,'DRAFT');

DO $$
DECLARE tx_status profile_version_status;
BEGIN
  BEGIN
    UPDATE risk_profile_version SET status='LOCKED',locked_at=now()
      WHERE risk_profile_version_id='RPV-PG-TX-V1';
    INSERT INTO audit_event
      (audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json)
    VALUES
      ('AUD-PG-LOCK-001','profile_locked','risk_profile_version','RPV-PG-TX-V1','PRO-PG-TX','{}'::jsonb);
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  SELECT status INTO tx_status FROM risk_profile_version WHERE risk_profile_version_id='RPV-PG-TX-V1';
  IF tx_status <> 'DRAFT' THEN RAISE EXCEPTION 'TEST_FAILURE_LOCK_AUDIT_NOT_ATOMIC'; END IF;
END $$;

-- A new current quote run must reference a scenario based on the current locked version.
INSERT INTO scenario (scenario_id,risk_profile_version_id,status)
VALUES ('SCN-PG-002','RPV-PG-001-V2','READY');
INSERT INTO scenario_delta
(scenario_delta_id,scenario_id,field_id,control_class,value_json)
VALUES ('SCD-PG-V2','SCN-PG-002','voluntary_excess','O','500'::jsonb);

-- Prove raw and normalised quote stores are structurally separate and linked one-way.
INSERT INTO quote_run (quote_run_id,risk_profile_version_id) VALUES ('QR-PG-001','RPV-PG-001-V2');
INSERT INTO quote_request
(quote_request_id,quote_run_id,scenario_id,provider_key,adapter_version,mapping_version)
VALUES ('QREQ-PG-001','QR-PG-001','SCN-PG-002','MOCK-A','1','1');
INSERT INTO raw_provider_response (raw_provider_response_id,quote_request_id,payload_json)
VALUES ('RAW-PG-001','QREQ-PG-001','{"grossPremiumPence":74218}'::jsonb);
INSERT INTO normalised_quote
(normalised_quote_id,raw_provider_response_id,normalisation_version,annual_cash_premium_pence,finance_cost_pence,compulsory_excess_pence,voluntary_excess_pence,comparison_state)
VALUES ('NOR-PG-001','RAW-PG-001','1',74218,0,25000,35000,'COMPARABLE');

DO $$
DECLARE raw_count integer; norm_count integer;
BEGIN
  SELECT count(*) INTO raw_count FROM raw_provider_response WHERE raw_provider_response_id='RAW-PG-001';
  SELECT count(*) INTO norm_count FROM normalised_quote WHERE normalised_quote_id='NOR-PG-001' AND raw_provider_response_id='RAW-PG-001';
  IF raw_count <> 1 OR norm_count <> 1 THEN RAISE EXCEPTION 'TEST_FAILURE_RAW_NORMALISED_SEPARATION'; END IF;
END $$;

-- Correction transaction is atomic: forced audit failure must leave no v3 and v2 remains LOCKED.
DO $$
DECLARE v3_count integer; v2_status profile_version_status;
BEGIN
  BEGIN
    INSERT INTO risk_profile_version (risk_profile_version_id,profile_id,version_no,status) VALUES ('RPV-PG-001-V3','PRO-PG-001',3,'DRAFT');
    INSERT INTO canonical_field_value (canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type)
      SELECT 'V3-' || canonical_field_value_id,'RPV-PG-001-V3',field_id,control_class,value_json,source_type FROM canonical_field_value WHERE risk_profile_version_id='RPV-PG-001-V2';
    UPDATE risk_profile_version SET status='SUPERSEDED' WHERE risk_profile_version_id='RPV-PG-001-V2';
    UPDATE risk_profile_version SET status='LOCKED',locked_at=now() WHERE risk_profile_version_id='RPV-PG-001-V3';
    INSERT INTO audit_event (audit_event_id,event_type,entity_type,entity_id,trace_id,metadata_json)
      VALUES ('AUD-PG-LOCK-001','profile_locked','risk_profile_version','RPV-PG-001-V3','PRO-PG-001','{}'::jsonb);
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  SELECT count(*) INTO v3_count FROM risk_profile_version WHERE risk_profile_version_id='RPV-PG-001-V3';
  SELECT status INTO v2_status FROM risk_profile_version WHERE risk_profile_version_id='RPV-PG-001-V2';
  IF v3_count <> 0 OR v2_status <> 'LOCKED' THEN RAISE EXCEPTION 'TEST_FAILURE_CORRECTION_NOT_ATOMIC'; END IF;
END $$;

SELECT 'POSTGRES_SPRINT1_CONTRACT_PASS' AS result;
