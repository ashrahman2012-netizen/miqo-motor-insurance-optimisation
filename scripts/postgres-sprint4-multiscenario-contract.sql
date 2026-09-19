\set ON_ERROR_STOP on

-- Requires Sprint 4 policy-persistence contract state:
-- OBJ-SP4-PG-001 -> RPV-PG-001-V2 / sp4-catalogue-v2 / c...c fingerprint.

INSERT INTO scenario(
  scenario_id,
  risk_profile_version_id,
  generation_version,
  generated_at,
  status,
  preference_snapshot_json,
  generation_fingerprint,
  generation_ordinal
) VALUES(
  'SCN-SP4-PG-001',
  'RPV-PG-001-V2',
  'sp4-gen-v1',
  now(),
  'GENERATING',
  '{"contract":"sp4-multi"}'::jsonb,
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  1
);

INSERT INTO sp4_scenario_lineage(
  scenario_id,
  customer_objective_id,
  risk_profile_version_id,
  catalogue_version,
  policy_fingerprint,
  generation_version,
  exploration_fingerprint,
  candidate_fingerprint
) VALUES(
  'SCN-SP4-PG-001',
  'OBJ-SP4-PG-001',
  'RPV-PG-001-V2',
  'sp4-catalogue-v2',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'sp4-gen-v1',
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
);

INSERT INTO scenario_delta(
  scenario_delta_id,scenario_id,field_id,control_class,value_json
) VALUES(
  'SCD-SP4-PG-001','SCN-SP4-PG-001','voluntary_excess','O','500'::jsonb
);

UPDATE scenario SET status='GENERATED' WHERE scenario_id='SCN-SP4-PG-001';

INSERT INTO scenario_generation_rejection(
  scenario_generation_rejection_id,
  customer_objective_id,
  risk_profile_version_id,
  catalogue_version,
  generation_version,
  exploration_fingerprint,
  candidate_fingerprint,
  candidate_json,
  rule_id,
  category,
  reason
) VALUES(
  'REJ-SP4-PG-001',
  'OBJ-SP4-PG-001',
  'RPV-PG-001-V2',
  'sp4-catalogue-v2',
  'sp4-gen-v1',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '{"annual_mileage":6000}'::jsonb,
  'CONTROL_NOT_IN_OPTIMISATION_CATALOGUE',
  'POLICY_INELIGIBLE',
  'annual_mileage is not an approved O-class optimisation control.'
);

DO $$
BEGIN
  INSERT INTO scenario(
    scenario_id,risk_profile_version_id,generation_version,generated_at,status,
    preference_snapshot_json,generation_fingerprint,generation_ordinal
  ) VALUES(
    'SCN-SP4-PG-BAD',
    'RPV-PG-001-V2',
    'sp4-gen-v1',
    now(),
    'GENERATING',
    '{"contract":"bad-lineage"}'::jsonb,
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    2
  );

  BEGIN
    INSERT INTO sp4_scenario_lineage(
      scenario_id,customer_objective_id,risk_profile_version_id,catalogue_version,
      policy_fingerprint,generation_version,exploration_fingerprint,candidate_fingerprint
    ) VALUES(
      'SCN-SP4-PG-BAD',
      'OBJ-SP4-PG-001',
      'RPV-PG-001-V2',
      'sp4-catalogue-v2',
      'abababababababababababababababababababababababababababababababab',
      'sp4-gen-v1',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd'
    );
    RAISE EXCEPTION 'TEST_FAILURE_SP4_BAD_LINEAGE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_SP4_BAD_LINEAGE_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_SCENARIO_POLICY_LINEAGE_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE sp4_scenario_lineage
    SET catalogue_version='tampered'
    WHERE scenario_id='SCN-SP4-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_SP4_LINEAGE_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_SP4_LINEAGE_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_GENERATION_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    DELETE FROM scenario_generation_rejection
    WHERE scenario_generation_rejection_id='REJ-SP4-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_SP4_REJECTION_DELETE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_SP4_REJECTION_DELETE_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_GENERATION_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  scenario_status text;
  delta_class control_class;
  stored_catalogue text;
  stored_objective text;
  mileage jsonb;
  rejection_rule text;
BEGIN
  SELECT status INTO scenario_status FROM scenario WHERE scenario_id='SCN-SP4-PG-001';
  SELECT control_class INTO delta_class FROM scenario_delta WHERE scenario_id='SCN-SP4-PG-001';
  SELECT catalogue_version,customer_objective_id
    INTO stored_catalogue,stored_objective
  FROM sp4_scenario_lineage WHERE scenario_id='SCN-SP4-PG-001';
  SELECT value_json INTO mileage
  FROM canonical_field_value
  WHERE risk_profile_version_id='RPV-PG-001-V2' AND field_id='annual_mileage';
  SELECT rule_id INTO rejection_rule
  FROM scenario_generation_rejection
  WHERE scenario_generation_rejection_id='REJ-SP4-PG-001';

  IF scenario_status <> 'GENERATED' THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_SCENARIO_STATUS'; END IF;
  IF delta_class <> 'O' THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_NON_O_DELTA'; END IF;
  IF stored_catalogue <> 'sp4-catalogue-v2' THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_CATALOGUE_LINEAGE'; END IF;
  IF stored_objective <> 'OBJ-SP4-PG-001' THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_OBJECTIVE_LINEAGE'; END IF;
  -- RPV-PG-001-V2 is the corrected Sprint 1 fixture. The rejected
  -- optimisation candidate must not mutate that certified factual value.
  IF mileage <> '9000'::jsonb THEN
    RAISE EXCEPTION 'TEST_FAILURE_SP4_FACT_MUTATED';
  END IF;
  IF rejection_rule <> 'CONTROL_NOT_IN_OPTIMISATION_CATALOGUE' THEN RAISE EXCEPTION 'TEST_FAILURE_SP4_REJECTION_REASON'; END IF;
END $$;

SELECT 'POSTGRES_SPRINT4_MULTISCENARIO_CONTRACT_PASS' AS result;
