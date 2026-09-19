\set ON_ERROR_STOP on

-- S4-G7 occupation taxonomy mapping / S4-G8 PRE_PURCHASE candidate vehicle integrity.
-- Requires Sprint 4 MarketRoute contract state.

INSERT INTO customer(customer_id,synthetic)
VALUES('CUS-SP4-INTEGRITY-CURRENT',true),('CUS-SP4-INTEGRITY-PRE',true);

INSERT INTO profile(profile_id,customer_id)
VALUES
  ('PRO-SP4-INTEGRITY-CURRENT','CUS-SP4-INTEGRITY-CURRENT'),
  ('PRO-SP4-INTEGRITY-PRE','CUS-SP4-INTEGRITY-PRE');

INSERT INTO risk_profile_version(risk_profile_version_id,profile_id,version_no,status)
VALUES
  ('RPV-SP4-INTEGRITY-CURRENT','PRO-SP4-INTEGRITY-CURRENT',1,'DRAFT'),
  ('RPV-SP4-INTEGRITY-PRE','PRO-SP4-INTEGRITY-PRE',1,'DRAFT');

INSERT INTO canonical_field_value(
  canonical_field_value_id,risk_profile_version_id,field_id,control_class,value_json,source_type
) VALUES
('CFV-SP4-INT-CUR-A','RPV-SP4-INTEGRITY-CURRENT','main_driver_id','F','"DRV-SP4-CURRENT"'::jsonb,'customer_declared'),
('CFV-SP4-INT-CUR-B','RPV-SP4-INTEGRITY-CURRENT','annual_mileage','F','8000'::jsonb,'customer_declared'),
('CFV-SP4-INT-CUR-C','RPV-SP4-INTEGRITY-CURRENT','licence_held_since','F','"2018-04-16"'::jsonb,'customer_declared'),
('CFV-SP4-INT-CUR-D','RPV-SP4-INTEGRITY-CURRENT','occupation','F','"SOFTWARE_ENGINEER"'::jsonb,'customer_declared'),
('CFV-SP4-INT-CUR-E','RPV-SP4-INTEGRITY-CURRENT','vehicle_mode','F','"CURRENT_VEHICLE"'::jsonb,'customer_declared'),
('CFV-SP4-INT-CUR-F','RPV-SP4-INTEGRITY-CURRENT','vehicle_id','F','"VEH-CURRENT-PG-1"'::jsonb,'customer_declared'),
('CFV-SP4-INT-PRE-A','RPV-SP4-INTEGRITY-PRE','main_driver_id','F','"DRV-SP4-PRE"'::jsonb,'customer_declared'),
('CFV-SP4-INT-PRE-B','RPV-SP4-INTEGRITY-PRE','annual_mileage','F','8000'::jsonb,'customer_declared'),
('CFV-SP4-INT-PRE-C','RPV-SP4-INTEGRITY-PRE','licence_held_since','F','"2018-04-16"'::jsonb,'customer_declared'),
('CFV-SP4-INT-PRE-D','RPV-SP4-INTEGRITY-PRE','occupation','F','"TEACHER"'::jsonb,'customer_declared'),
('CFV-SP4-INT-PRE-E','RPV-SP4-INTEGRITY-PRE','vehicle_mode','F','"PRE_PURCHASE"'::jsonb,'customer_declared'),
('CFV-SP4-INT-PRE-F','RPV-SP4-INTEGRITY-PRE','vehicle_id','F','"VEH-CURRENT-PG-2"'::jsonb,'customer_declared');

UPDATE risk_profile_version
SET status='LOCKED',locked_at=now()
WHERE risk_profile_version_id IN ('RPV-SP4-INTEGRITY-CURRENT','RPV-SP4-INTEGRITY-PRE');

INSERT INTO occupation_taxonomy_mapping(
  occupation_taxonomy_mapping_id,risk_profile_version_id,market_route_id,
  occupation_taxonomy_rule_id,taxonomy_version,canonical_occupation,
  provider_occupation_code,rule_fingerprint,mapping_fingerprint
) VALUES(
  'OTM-SP4-PG-001','RPV-SP4-INTEGRITY-CURRENT','MR-SP4-PG-DIRECT',
  'OCC-RULE-SP4-DIRECT-SE','sp4-occupation-taxonomy-v1','SOFTWARE_ENGINEER',
  'MOCK-OCC-SE-001',
  '9538d96e42dd8ee2edb0e750ee88408ec7f11ad1b1c7df5e4d5510ec65b2c5e1',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO occupation_taxonomy_mapping(
      occupation_taxonomy_mapping_id,risk_profile_version_id,market_route_id,
      occupation_taxonomy_rule_id,taxonomy_version,canonical_occupation,
      provider_occupation_code,rule_fingerprint,mapping_fingerprint
    ) VALUES(
      'OTM-SP4-PG-BAD','RPV-SP4-INTEGRITY-CURRENT','MR-SP4-PG-PCW',
      'OCC-RULE-SP4-PCW-TE','sp4-occupation-taxonomy-v1','TEACHER',
      'MOCK-PCW-OCC-TE-102',
      '19e4090eb6985ecacfbe3c9dd4a599cba4f253bf961e7ffa29cdf3c422f4cd0b',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    );
    RAISE EXCEPTION 'TEST_FAILURE_OCCUPATION_FACT_RECLASSIFIED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_OCCUPATION_FACT_RECLASSIFIED' THEN RAISE; END IF;
    IF position('OCCUPATION_MAPPING_LINEAGE_MISMATCH' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO candidate_vehicle(
      candidate_vehicle_evidence_id,risk_profile_version_id,candidate_vehicle_id,
      vehicle_snapshot_json,evidence_fingerprint
    ) VALUES(
      'CVE-SP4-PG-BLOCKED','RPV-SP4-INTEGRITY-CURRENT','VEH-CAND-PG-BLOCKED',
      '{"make":"Synthetic","model":"Blocked"}'::jsonb,
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    );
    RAISE EXCEPTION 'TEST_FAILURE_CURRENT_VEHICLE_CANDIDATE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_CURRENT_VEHICLE_CANDIDATE_ALLOWED' THEN RAISE; END IF;
    IF position('CANDIDATE_VEHICLE_REQUIRES_PRE_PURCHASE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO candidate_vehicle(
  candidate_vehicle_evidence_id,risk_profile_version_id,candidate_vehicle_id,
  vehicle_snapshot_json,evidence_fingerprint
) VALUES(
  'CVE-SP4-PG-001','RPV-SP4-INTEGRITY-PRE','VEH-CAND-PG-1',
  '{"make":"Synthetic","model":"Candidate","group":12}'::jsonb,
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO candidate_vehicle(
      candidate_vehicle_evidence_id,risk_profile_version_id,candidate_vehicle_id,
      vehicle_snapshot_json,evidence_fingerprint
    ) VALUES(
      'CVE-SP4-PG-CURRENT','RPV-SP4-INTEGRITY-PRE','VEH-CURRENT-PG-2',
      '{"make":"Synthetic","model":"Current"}'::jsonb,
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );
    RAISE EXCEPTION 'TEST_FAILURE_CURRENT_FACTUAL_VEHICLE_REUSED_AS_CANDIDATE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_CURRENT_FACTUAL_VEHICLE_REUSED_AS_CANDIDATE' THEN RAISE; END IF;
    IF position('CURRENT_VEHICLE_CANNOT_BE_CANDIDATE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO scenario(scenario_id,risk_profile_version_id,status)
    VALUES('SCN-SP4-OCC-BAD','RPV-SP4-INTEGRITY-CURRENT','DRAFT');
    INSERT INTO scenario_delta(
      scenario_delta_id,scenario_id,field_id,control_class,value_json
    ) VALUES(
      'SCD-SP4-OCC-BAD','SCN-SP4-OCC-BAD','occupation','O','"TEACHER"'::jsonb
    );
    RAISE EXCEPTION 'TEST_FAILURE_OCCUPATION_BECAME_O_CONTROL';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_OCCUPATION_BECAME_O_CONTROL' THEN RAISE; END IF;
    IF position('scenario_delta_approved_o_field' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

INSERT INTO optimisation_catalogue_version(
  catalogue_version,objective_model_version,policy_fingerprint,
  catalogue_snapshot_json,objective_model_snapshot_json
) VALUES(
  'sp4-catalogue-v2.1','sp4-objectives-v1',
  '9999999999999999999999999999999999999999999999999999999999999999',
  '{"catalogueVersion":"sp4-catalogue-v2.1","contract":"g8"}'::jsonb,
  '{"objectiveModelVersion":"sp4-objectives-v1","contract":"g8"}'::jsonb
);

INSERT INTO customer_objective(
  customer_objective_id,risk_profile_version_id,objective_id,objective_version,
  catalogue_version,policy_fingerprint
) VALUES(
  'OBJ-SP4-VEH-PG','RPV-SP4-INTEGRITY-PRE','LOWEST_ANNUAL_PREMIUM','sp4-objectives-v1',
  'sp4-catalogue-v2.1',
  '9999999999999999999999999999999999999999999999999999999999999999'
);

INSERT INTO scenario(
  scenario_id,risk_profile_version_id,generation_version,generated_at,status,
  preference_snapshot_json,generation_fingerprint,generation_ordinal
) VALUES(
  'SCN-SP4-VEH-PG','RPV-SP4-INTEGRITY-PRE','sp4-gen-v1',now(),'GENERATING',
  '{"candidate_vehicle":"VEH-CAND-PG-1"}'::jsonb,
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',1
);

INSERT INTO sp4_scenario_lineage(
  scenario_id,customer_objective_id,risk_profile_version_id,catalogue_version,
  policy_fingerprint,generation_version,exploration_fingerprint,candidate_fingerprint
) VALUES(
  'SCN-SP4-VEH-PG','OBJ-SP4-VEH-PG','RPV-SP4-INTEGRITY-PRE','sp4-catalogue-v2.1',
  '9999999999999999999999999999999999999999999999999999999999999999',
  'sp4-gen-v1',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'abababababababababababababababababababababababababababababababab'
);

INSERT INTO scenario_delta(
  scenario_delta_id,scenario_id,field_id,control_class,value_json
) VALUES(
  'SCD-SP4-VEH-PG','SCN-SP4-VEH-PG','candidate_vehicle','O','"VEH-CAND-PG-1"'::jsonb
);

UPDATE scenario SET status='GENERATED' WHERE scenario_id='SCN-SP4-VEH-PG';

DO $$
BEGIN
  BEGIN
    UPDATE occupation_taxonomy_mapping
    SET provider_occupation_code='TAMPERED'
    WHERE occupation_taxonomy_mapping_id='OTM-SP4-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_OCCUPATION_MAPPING_MUTATION_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_OCCUPATION_MAPPING_MUTATION_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_PROFILE_OPTIMISATION_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    DELETE FROM candidate_vehicle
    WHERE candidate_vehicle_evidence_id='CVE-SP4-PG-001';
    RAISE EXCEPTION 'TEST_FAILURE_CANDIDATE_VEHICLE_DELETE_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='TEST_FAILURE_CANDIDATE_VEHICLE_DELETE_ALLOWED' THEN RAISE; END IF;
    IF position('SP4_PROFILE_OPTIMISATION_EVIDENCE_IMMUTABLE' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;

DO $$
DECLARE
  occupation_value jsonb;
  current_vehicle jsonb;
  candidate_delta jsonb;
  candidate_class control_class;
  mapping_code text;
BEGIN
  SELECT value_json INTO occupation_value
  FROM canonical_field_value
  WHERE risk_profile_version_id='RPV-SP4-INTEGRITY-CURRENT' AND field_id='occupation';

  SELECT provider_occupation_code INTO mapping_code
  FROM occupation_taxonomy_mapping
  WHERE occupation_taxonomy_mapping_id='OTM-SP4-PG-001';

  SELECT value_json INTO current_vehicle
  FROM canonical_field_value
  WHERE risk_profile_version_id='RPV-SP4-INTEGRITY-PRE' AND field_id='vehicle_id';

  SELECT value_json,control_class INTO candidate_delta,candidate_class
  FROM scenario_delta
  WHERE scenario_id='SCN-SP4-VEH-PG' AND field_id='candidate_vehicle';

  IF occupation_value <> '"SOFTWARE_ENGINEER"'::jsonb THEN
    RAISE EXCEPTION 'TEST_FAILURE_CANONICAL_OCCUPATION_MUTATED';
  END IF;
  IF mapping_code <> 'MOCK-OCC-SE-001' THEN
    RAISE EXCEPTION 'TEST_FAILURE_PROVIDER_OCCUPATION_CODE';
  END IF;
  IF current_vehicle <> '"VEH-CURRENT-PG-2"'::jsonb THEN
    RAISE EXCEPTION 'TEST_FAILURE_FACTUAL_VEHICLE_MUTATED';
  END IF;
  IF candidate_delta <> '"VEH-CAND-PG-1"'::jsonb OR candidate_class <> 'O' THEN
    RAISE EXCEPTION 'TEST_FAILURE_CANDIDATE_VEHICLE_DELTA';
  END IF;
  IF EXISTS(
    SELECT 1 FROM canonical_field_value
    WHERE risk_profile_version_id='RPV-SP4-INTEGRITY-PRE'
      AND field_id='candidate_vehicle'
  ) THEN
    RAISE EXCEPTION 'TEST_FAILURE_CANDIDATE_VEHICLE_STORED_AS_FACT';
  END IF;
END $$;

SELECT 'POSTGRES_SPRINT4_OCCUPATION_VEHICLE_CONTRACT_PASS' AS result;
