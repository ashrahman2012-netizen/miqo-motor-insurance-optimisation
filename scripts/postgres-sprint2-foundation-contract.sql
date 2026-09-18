\set ON_ERROR_STOP on

-- Runs after the Sprint 1 contract. RPV-PG-001-V2 is the current locked profile.
INSERT INTO optimisation_preference
  (optimisation_preference_id,risk_profile_version_id,preference_key,value_json)
VALUES
  ('OPT-PG-001','RPV-PG-001-V2','voluntary_excess','{"min":250,"max":500}'::jsonb),
  ('OPT-PG-002','RPV-PG-001-V2','payment_structure','"ANNUAL"'::jsonb);

UPDATE optimisation_preference
SET frozen_at=now()
WHERE risk_profile_version_id='RPV-PG-001-V2';

INSERT INTO scenario
  (scenario_id,risk_profile_version_id,optimisation_preference_id,generation_version,generated_at,preference_snapshot_json,generation_fingerprint,generation_ordinal,status)
VALUES
  ('SCN-SP2-PG-001','RPV-PG-001-V2','OPT-PG-001','sp2-gen-v1',now(),
   '{"payment_structure":"ANNUAL","voluntary_excess":{"min":250,"max":500}}'::jsonb,
   'foundation-contract-fingerprint',1,'GENERATED');

INSERT INTO scenario_delta
  (scenario_delta_id,scenario_id,field_id,control_class,value_json)
VALUES
  ('SCD-SP2-PG-001','SCN-SP2-PG-001','voluntary_excess','O','500'::jsonb);

DO $$
BEGIN
  BEGIN
    INSERT INTO optimisation_preference
      (optimisation_preference_id,risk_profile_version_id,preference_key,value_json)
    VALUES ('OPT-PG-BAD-KEY','RPV-PG-001-V2','annual_mileage','6000'::jsonb);
    RAISE EXCEPTION 'TEST_FAILURE_FACTUAL_PREFERENCE_ALLOWED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO optimisation_preference
      (optimisation_preference_id,risk_profile_version_id,preference_key,value_json)
    VALUES ('OPT-PG-DRAFT','RPV-PG-TX-V1','payment_structure','"ANNUAL"'::jsonb);
    RAISE EXCEPTION 'TEST_FAILURE_DRAFT_PREFERENCE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_FAILURE_DRAFT_PREFERENCE_ALLOWED' THEN RAISE; END IF;
    IF position('OPTIMISATION_REQUIRES_LOCKED_PROFILE' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO scenario
      (scenario_id,risk_profile_version_id,optimisation_preference_id,generation_version,generated_at,status)
    VALUES ('SCN-SP2-PG-BAD','RPV-PG-001-V1','OPT-PG-001','sp2-gen-v1',now(),'GENERATED');
    RAISE EXCEPTION 'TEST_FAILURE_SCENARIO_LINEAGE_MISMATCH_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_FAILURE_SCENARIO_LINEAGE_MISMATCH_ALLOWED' THEN RAISE; END IF;
    IF position('SCENARIO_PREFERENCE_PROFILE_MISMATCH' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  source_version text;
  preference_id text;
  generator text;
  delta_class control_class;
BEGIN
  SELECT risk_profile_version_id,optimisation_preference_id,generation_version
    INTO source_version,preference_id,generator
  FROM scenario WHERE scenario_id='SCN-SP2-PG-001';
  SELECT control_class INTO delta_class
  FROM scenario_delta WHERE scenario_id='SCN-SP2-PG-001';

  IF source_version <> 'RPV-PG-001-V2' THEN RAISE EXCEPTION 'TEST_FAILURE_SCENARIO_SOURCE'; END IF;
  IF preference_id <> 'OPT-PG-001' THEN RAISE EXCEPTION 'TEST_FAILURE_SCENARIO_PREFERENCE'; END IF;
  IF generator <> 'sp2-gen-v1' THEN RAISE EXCEPTION 'TEST_FAILURE_GENERATION_VERSION'; END IF;
  IF delta_class <> 'O' THEN RAISE EXCEPTION 'TEST_FAILURE_NON_O_DELTA'; END IF;
END $$;

SELECT 'POSTGRES_SPRINT2_FOUNDATION_CONTRACT_PASS' AS result;
