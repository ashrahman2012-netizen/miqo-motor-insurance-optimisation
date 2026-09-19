BEGIN;

CREATE TABLE occupation_taxonomy_rule (
  occupation_taxonomy_rule_id text PRIMARY KEY,
  taxonomy_version text NOT NULL,
  provider_key text NOT NULL,
  mapping_version text NOT NULL,
  canonical_occupation text NOT NULL,
  provider_occupation_code text NOT NULL,
  rule_fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT occupation_taxonomy_rule_fingerprint_format CHECK (
    rule_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT occupation_taxonomy_rule_synthetic_provider CHECK (
    provider_key LIKE 'MOCK-%'
  ),
  CONSTRAINT uq_occupation_taxonomy_rule UNIQUE (
    taxonomy_version,provider_key,mapping_version,canonical_occupation
  )
);

INSERT INTO occupation_taxonomy_rule(
  occupation_taxonomy_rule_id,taxonomy_version,provider_key,mapping_version,
  canonical_occupation,provider_occupation_code,rule_fingerprint
) VALUES
(
  'OCC-RULE-SP4-DIRECT-SE','sp4-occupation-taxonomy-v1','MOCK-PROVIDER-001','mock-mapping-v1',
  'SOFTWARE_ENGINEER','MOCK-OCC-SE-001',
  '9538d96e42dd8ee2edb0e750ee88408ec7f11ad1b1c7df5e4d5510ec65b2c5e1'
),
(
  'OCC-RULE-SP4-PCW-SE','sp4-occupation-taxonomy-v1','MOCK-PROVIDER-001','mock-mapping-pcw-v1',
  'SOFTWARE_ENGINEER','MOCK-PCW-OCC-SE-101',
  '6b3435e9abb7e54d12b93df8376cb37b69957a4979b49e5549c74701f5c1824e'
),
(
  'OCC-RULE-SP4-DIRECT-TE','sp4-occupation-taxonomy-v1','MOCK-PROVIDER-001','mock-mapping-v1',
  'TEACHER','MOCK-OCC-TE-002',
  'edf0cd89dff8f15c8b90529e2033d224ec626923c6f1b3a22a21f61f6a0ab1f0'
),
(
  'OCC-RULE-SP4-PCW-TE','sp4-occupation-taxonomy-v1','MOCK-PROVIDER-001','mock-mapping-pcw-v1',
  'TEACHER','MOCK-PCW-OCC-TE-102',
  '19e4090eb6985ecacfbe3c9dd4a599cba4f253bf961e7ffa29cdf3c422f4cd0b'
);

CREATE TABLE occupation_taxonomy_mapping (
  occupation_taxonomy_mapping_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  market_route_id text NOT NULL REFERENCES market_route(market_route_id),
  occupation_taxonomy_rule_id text NOT NULL REFERENCES occupation_taxonomy_rule(occupation_taxonomy_rule_id),
  taxonomy_version text NOT NULL,
  canonical_occupation text NOT NULL,
  provider_occupation_code text NOT NULL,
  rule_fingerprint text NOT NULL,
  mapping_fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT occupation_taxonomy_mapping_fingerprint_format CHECK (
    rule_fingerprint ~ '^[0-9a-f]{64}$'
    AND mapping_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT uq_occupation_taxonomy_mapping UNIQUE (
    risk_profile_version_id,market_route_id,taxonomy_version
  )
);

CREATE TABLE candidate_vehicle (
  candidate_vehicle_evidence_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  candidate_vehicle_id text NOT NULL,
  vehicle_snapshot_json jsonb NOT NULL,
  evidence_fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_vehicle_evidence_fingerprint_format CHECK (
    evidence_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT uq_candidate_vehicle_profile UNIQUE (
    risk_profile_version_id,candidate_vehicle_id
  )
);

CREATE OR REPLACE FUNCTION miqo_guard_occupation_taxonomy_mapping()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  profile_state profile_version_status;
  factual_occupation text;
  factual_class control_class;
  route_provider text;
  route_mapping text;
  route_synthetic boolean;
  rule_taxonomy text;
  rule_provider text;
  rule_mapping text;
  rule_occupation text;
  rule_code text;
  rule_fp text;
BEGIN
  SELECT status INTO profile_state
  FROM risk_profile_version
  WHERE risk_profile_version_id=NEW.risk_profile_version_id;

  IF profile_state IS DISTINCT FROM 'LOCKED' THEN
    RAISE EXCEPTION 'OCCUPATION_MAPPING_REQUIRES_LOCKED_PROFILE';
  END IF;

  SELECT value_json #>> '{}',control_class
    INTO factual_occupation,factual_class
  FROM canonical_field_value
  WHERE risk_profile_version_id=NEW.risk_profile_version_id
    AND field_id='occupation';

  IF factual_occupation IS NULL OR factual_class IS DISTINCT FROM 'F' THEN
    RAISE EXCEPTION 'CANONICAL_OCCUPATION_FACT_NOT_FOUND';
  END IF;

  SELECT provider_key,mapping_version,synthetic
    INTO route_provider,route_mapping,route_synthetic
  FROM market_route
  WHERE market_route_id=NEW.market_route_id;

  IF route_provider IS NULL OR route_synthetic IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'OCCUPATION_MAPPING_ROUTE_NOT_SYNTHETIC';
  END IF;

  SELECT taxonomy_version,provider_key,mapping_version,canonical_occupation,
         provider_occupation_code,rule_fingerprint
    INTO rule_taxonomy,rule_provider,rule_mapping,rule_occupation,rule_code,rule_fp
  FROM occupation_taxonomy_rule
  WHERE occupation_taxonomy_rule_id=NEW.occupation_taxonomy_rule_id;

  IF rule_taxonomy IS NULL THEN
    RAISE EXCEPTION 'OCCUPATION_TAXONOMY_RULE_NOT_FOUND';
  END IF;

  IF NEW.canonical_occupation IS DISTINCT FROM factual_occupation
     OR NEW.canonical_occupation IS DISTINCT FROM rule_occupation
     OR NEW.provider_occupation_code IS DISTINCT FROM rule_code
     OR NEW.taxonomy_version IS DISTINCT FROM rule_taxonomy
     OR NEW.rule_fingerprint IS DISTINCT FROM rule_fp
     OR route_provider IS DISTINCT FROM rule_provider
     OR route_mapping IS DISTINCT FROM rule_mapping THEN
    RAISE EXCEPTION 'OCCUPATION_MAPPING_LINEAGE_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_occupation_taxonomy_mapping
BEFORE INSERT ON occupation_taxonomy_mapping
FOR EACH ROW EXECUTE FUNCTION miqo_guard_occupation_taxonomy_mapping();

CREATE OR REPLACE FUNCTION miqo_guard_candidate_vehicle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  profile_state profile_version_status;
  vehicle_mode text;
  current_vehicle_id text;
BEGIN
  SELECT status INTO profile_state
  FROM risk_profile_version
  WHERE risk_profile_version_id=NEW.risk_profile_version_id;

  IF profile_state IS DISTINCT FROM 'LOCKED' THEN
    RAISE EXCEPTION 'CANDIDATE_VEHICLE_REQUIRES_LOCKED_PROFILE';
  END IF;

  SELECT value_json #>> '{}'
    INTO vehicle_mode
  FROM canonical_field_value
  WHERE risk_profile_version_id=NEW.risk_profile_version_id
    AND field_id='vehicle_mode'
    AND control_class='F';

  IF vehicle_mode IS DISTINCT FROM 'PRE_PURCHASE' THEN
    RAISE EXCEPTION 'CANDIDATE_VEHICLE_REQUIRES_PRE_PURCHASE';
  END IF;

  SELECT value_json #>> '{}'
    INTO current_vehicle_id
  FROM canonical_field_value
  WHERE risk_profile_version_id=NEW.risk_profile_version_id
    AND field_id='vehicle_id'
    AND control_class='F';

  IF current_vehicle_id IS NOT NULL
     AND current_vehicle_id=NEW.candidate_vehicle_id THEN
    RAISE EXCEPTION 'CURRENT_VEHICLE_CANNOT_BE_CANDIDATE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_candidate_vehicle
BEFORE INSERT ON candidate_vehicle
FOR EACH ROW EXECUTE FUNCTION miqo_guard_candidate_vehicle();

ALTER TABLE scenario_delta
  DROP CONSTRAINT scenario_delta_approved_o_field;

ALTER TABLE scenario_delta
  ADD CONSTRAINT scenario_delta_approved_o_field CHECK (
    field_id IN (
      'voluntary_excess',
      'payment_structure',
      'policy_start_date',
      'telematics_preference',
      'genuine_named_driver_inclusion',
      'candidate_vehicle'
    )
  );

CREATE OR REPLACE FUNCTION miqo_guard_candidate_vehicle_delta()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  scenario_generation text;
  scenario_version text;
  vehicle_mode text;
  candidate_id text;
  candidate_exists boolean;
  lineage_exists boolean;
BEGIN
  IF NEW.field_id <> 'candidate_vehicle' THEN
    RETURN NEW;
  END IF;

  SELECT generation_version,risk_profile_version_id
    INTO scenario_generation,scenario_version
  FROM scenario
  WHERE scenario_id=NEW.scenario_id;

  IF scenario_generation IS DISTINCT FROM 'sp4-gen-v1' THEN
    RAISE EXCEPTION 'CANDIDATE_VEHICLE_SP4_ONLY';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM sp4_scenario_lineage
    WHERE scenario_id=NEW.scenario_id
      AND risk_profile_version_id=scenario_version
  ) INTO lineage_exists;

  IF NOT lineage_exists THEN
    RAISE EXCEPTION 'CANDIDATE_VEHICLE_SCENARIO_LINEAGE_REQUIRED';
  END IF;

  SELECT value_json #>> '{}'
    INTO vehicle_mode
  FROM canonical_field_value
  WHERE risk_profile_version_id=scenario_version
    AND field_id='vehicle_mode'
    AND control_class='F';

  IF vehicle_mode IS DISTINCT FROM 'PRE_PURCHASE' THEN
    RAISE EXCEPTION 'CANDIDATE_VEHICLE_REQUIRES_PRE_PURCHASE';
  END IF;

  candidate_id=NEW.value_json #>> '{}';

  SELECT EXISTS(
    SELECT 1 FROM candidate_vehicle
    WHERE risk_profile_version_id=scenario_version
      AND candidate_vehicle_id=candidate_id
  ) INTO candidate_exists;

  IF NOT candidate_exists THEN
    RAISE EXCEPTION 'CANDIDATE_VEHICLE_EVIDENCE_NOT_FOUND';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_candidate_vehicle_delta
BEFORE INSERT OR UPDATE ON scenario_delta
FOR EACH ROW EXECUTE FUNCTION miqo_guard_candidate_vehicle_delta();

CREATE OR REPLACE FUNCTION miqo_guard_sp4_profile_optimisation_evidence_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SP4_PROFILE_OPTIMISATION_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_occupation_taxonomy_rule_immutable
BEFORE UPDATE OR DELETE ON occupation_taxonomy_rule
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_profile_optimisation_evidence_immutable();

CREATE TRIGGER trg_occupation_taxonomy_mapping_immutable
BEFORE UPDATE OR DELETE ON occupation_taxonomy_mapping
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_profile_optimisation_evidence_immutable();

CREATE TRIGGER trg_candidate_vehicle_immutable
BEFORE UPDATE OR DELETE ON candidate_vehicle
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_profile_optimisation_evidence_immutable();

COMMIT;
