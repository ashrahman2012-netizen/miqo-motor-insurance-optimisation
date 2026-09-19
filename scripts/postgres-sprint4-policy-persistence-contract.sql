\set ON_ERROR_STOP on

INSERT INTO optimisation_catalogue_version(
  catalogue_version,
  objective_model_version,
  policy_fingerprint,
  catalogue_snapshot_json,
  objective_model_snapshot_json
) VALUES(
  'sp4-catalogue-v2',
  'sp4-objectives-v1',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  '{"catalogueVersion":"sp4-catalogue-v2","controls":[]}'::jsonb,
  '{"objectiveModelVersion":"sp4-objectives-v1","objectives":[]}'::jsonb
);

INSERT INTO customer_objective(
  customer_objective_id,
  risk_profile_version_id,
  objective_id,
  objective_version,
  catalogue_version,
  policy_fingerprint
) VALUES(
  'OBJ-SP4-PG-001',
  'RPV-PG-001-V2',
  'LOWEST_ANNUAL_PREMIUM',
  'sp4-objectives-v1',
  'sp4-catalogue-v2',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO customer_objective(
      customer_objective_id,risk_profile_version_id,objective_id,objective_version,catalogue_version,policy_fingerprint
    ) VALUES(
      'OBJ-SP4-PG-DORMANT','RPV-PG-001-V2','BALANCED_COST_AND_EXPOSURE',
      'sp4-objectives-v1','sp4-catalogue-v2',
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    );
    RAISE EXCEPTION 'TEST_FAILURE_DORMANT_OBJECTIVE_ALLOWED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO customer_objective(
      customer_objective_id,risk_profile_version_id,objective_id,objective_version,catalogue_version,policy_fingerprint
    ) VALUES(
      'OBJ-SP4-PG-DRAFT','RPV-PG-TX-V1','LOWEST_FINANCE_COST',
      'sp4-objectives-v1','sp4-catalogue-v2',
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    );
    RAISE EXCEPTION 'TEST_FAILURE_DRAFT_OBJECTIVE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_DRAFT_OBJECTIVE_ALLOWED' THEN RAISE; END IF;
    IF position('CUSTOMER_OBJECTIVE_REQUIRES_LOCKED_PROFILE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO customer_objective(
      customer_objective_id,risk_profile_version_id,objective_id,objective_version,catalogue_version,policy_fingerprint
    ) VALUES(
      'OBJ-SP4-PG-BAD-LINEAGE','RPV-PG-001-V2','LOWEST_FINANCE_COST',
      'wrong-objective-version','sp4-catalogue-v2',
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    );
    RAISE EXCEPTION 'TEST_FAILURE_OBJECTIVE_POLICY_LINEAGE_BYPASS';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_OBJECTIVE_POLICY_LINEAGE_BYPASS' THEN RAISE; END IF;
    IF position('CUSTOMER_OBJECTIVE_POLICY_LINEAGE_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE customer_objective SET objective_id='LOWEST_FINANCE_COST'
    WHERE customer_objective_id='OBJ-SP4-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_OBJECTIVE_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_OBJECTIVE_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_POLICY_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    DELETE FROM optimisation_catalogue_version WHERE catalogue_version='sp4-catalogue-v2';
    RAISE EXCEPTION 'TEST_FAILURE_CATALOGUE_DELETE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_CATALOGUE_DELETE_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_POLICY_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  stored_objective text;
  stored_version text;
  stored_catalogue text;
  stored_fingerprint text;
BEGIN
  SELECT objective_id,objective_version,catalogue_version,policy_fingerprint
  INTO stored_objective,stored_version,stored_catalogue,stored_fingerprint
  FROM customer_objective WHERE customer_objective_id='OBJ-SP4-PG-001';

  IF stored_objective <> 'LOWEST_ANNUAL_PREMIUM' THEN RAISE EXCEPTION 'TEST_FAILURE_OBJECTIVE_ID'; END IF;
  IF stored_version <> 'sp4-objectives-v1' THEN RAISE EXCEPTION 'TEST_FAILURE_OBJECTIVE_VERSION'; END IF;
  IF stored_catalogue <> 'sp4-catalogue-v2' THEN RAISE EXCEPTION 'TEST_FAILURE_CATALOGUE_VERSION'; END IF;
  IF stored_fingerprint <> 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' THEN
    RAISE EXCEPTION 'TEST_FAILURE_POLICY_FINGERPRINT';
  END IF;
END $$;

SELECT 'POSTGRES_SPRINT4_POLICY_PERSISTENCE_CONTRACT_PASS' AS result;
