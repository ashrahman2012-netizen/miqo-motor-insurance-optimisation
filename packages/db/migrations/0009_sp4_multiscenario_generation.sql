BEGIN;

CREATE TABLE sp4_scenario_lineage (
  scenario_id text PRIMARY KEY REFERENCES scenario(scenario_id),
  customer_objective_id text NOT NULL REFERENCES customer_objective(customer_objective_id),
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  catalogue_version text NOT NULL REFERENCES optimisation_catalogue_version(catalogue_version),
  policy_fingerprint text NOT NULL,
  generation_version text NOT NULL,
  exploration_fingerprint text NOT NULL,
  candidate_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sp4_scenario_lineage_policy_fingerprint_format CHECK (
    policy_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT sp4_scenario_lineage_generation_fingerprint_format CHECK (
    exploration_fingerprint ~ '^[0-9a-f]{64}$'
    AND candidate_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT uq_sp4_scenario_lineage_candidate UNIQUE (
    customer_objective_id,exploration_fingerprint,candidate_fingerprint
  )
);

CREATE TABLE scenario_generation_rejection (
  scenario_generation_rejection_id text PRIMARY KEY,
  customer_objective_id text NOT NULL REFERENCES customer_objective(customer_objective_id),
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  catalogue_version text NOT NULL REFERENCES optimisation_catalogue_version(catalogue_version),
  generation_version text NOT NULL,
  exploration_fingerprint text NOT NULL,
  candidate_fingerprint text NOT NULL,
  candidate_json jsonb NOT NULL,
  rule_id text NOT NULL,
  category text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scenario_generation_rejection_fingerprint_format CHECK (
    exploration_fingerprint ~ '^[0-9a-f]{64}$'
    AND candidate_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT scenario_generation_rejection_category CHECK (
    category IN ('POLICY_INELIGIBLE','IMPOSSIBLE','CONTRADICTORY','NOT_ENABLED')
  ),
  CONSTRAINT uq_scenario_generation_rejection
    UNIQUE (customer_objective_id,exploration_fingerprint,candidate_fingerprint,rule_id)
);

CREATE OR REPLACE FUNCTION miqo_guard_scenario_preference_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  preference_version_id text;
  objective_version_id text;
  objective_catalogue text;
  objective_fingerprint text;
  lineage_version_id text;
  lineage_catalogue text;
  lineage_fingerprint text;
  profile_status profile_version_status;
BEGIN
  IF NEW.status <> 'GENERATED' THEN
    RETURN NEW;
  END IF;

  SELECT status INTO profile_status
  FROM risk_profile_version
  WHERE risk_profile_version_id = NEW.risk_profile_version_id;

  IF profile_status <> 'LOCKED' THEN
    RAISE EXCEPTION 'SCENARIO_REQUIRES_LOCKED_PROFILE';
  END IF;

  IF NEW.generation_version = 'sp4-gen-v1' THEN
    SELECT risk_profile_version_id,catalogue_version,policy_fingerprint
      INTO lineage_version_id,lineage_catalogue,lineage_fingerprint
    FROM sp4_scenario_lineage
    WHERE scenario_id=NEW.scenario_id;

    IF lineage_version_id IS NULL THEN
      RAISE EXCEPTION 'SP4_SCENARIO_LINEAGE_NOT_FOUND';
    END IF;

    SELECT risk_profile_version_id,catalogue_version,policy_fingerprint
      INTO objective_version_id,objective_catalogue,objective_fingerprint
    FROM customer_objective
    WHERE customer_objective_id=(
      SELECT customer_objective_id FROM sp4_scenario_lineage WHERE scenario_id=NEW.scenario_id
    );

    IF objective_version_id IS NULL THEN
      RAISE EXCEPTION 'SP4_SCENARIO_OBJECTIVE_NOT_FOUND';
    END IF;

    IF lineage_version_id IS DISTINCT FROM NEW.risk_profile_version_id
       OR objective_version_id IS DISTINCT FROM NEW.risk_profile_version_id
       OR objective_catalogue IS DISTINCT FROM lineage_catalogue
       OR objective_fingerprint IS DISTINCT FROM lineage_fingerprint THEN
      RAISE EXCEPTION 'SP4_SCENARIO_POLICY_LINEAGE_MISMATCH';
    END IF;

    RETURN NEW;
  END IF;

  SELECT risk_profile_version_id INTO preference_version_id
  FROM optimisation_preference
  WHERE optimisation_preference_id = NEW.optimisation_preference_id;

  IF preference_version_id IS DISTINCT FROM NEW.risk_profile_version_id THEN
    RAISE EXCEPTION 'SCENARIO_PREFERENCE_PROFILE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1 FROM optimisation_preference
    WHERE risk_profile_version_id = NEW.risk_profile_version_id
      AND frozen_at IS NULL
  ) THEN
    RAISE EXCEPTION 'PREFERENCE_SET_NOT_FROZEN';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION miqo_guard_sp4_scenario_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  objective_version_id text;
  objective_catalogue text;
  objective_fingerprint text;
  scenario_version_id text;
  scenario_generation_version text;
  profile_status profile_version_status;
BEGIN
  SELECT risk_profile_version_id,catalogue_version,policy_fingerprint
    INTO objective_version_id,objective_catalogue,objective_fingerprint
  FROM customer_objective
  WHERE customer_objective_id=NEW.customer_objective_id;

  SELECT risk_profile_version_id,generation_version
    INTO scenario_version_id,scenario_generation_version
  FROM scenario
  WHERE scenario_id=NEW.scenario_id;

  SELECT status INTO profile_status
  FROM risk_profile_version
  WHERE risk_profile_version_id=NEW.risk_profile_version_id;

  IF objective_version_id IS NULL THEN
    RAISE EXCEPTION 'SP4_SCENARIO_OBJECTIVE_NOT_FOUND';
  END IF;

  IF scenario_version_id IS NULL THEN
    RAISE EXCEPTION 'SP4_SCENARIO_NOT_FOUND';
  END IF;

  IF scenario_version_id IS DISTINCT FROM NEW.risk_profile_version_id
     OR objective_version_id IS DISTINCT FROM NEW.risk_profile_version_id
     OR objective_catalogue IS DISTINCT FROM NEW.catalogue_version
     OR objective_fingerprint IS DISTINCT FROM NEW.policy_fingerprint
     OR scenario_generation_version IS DISTINCT FROM NEW.generation_version THEN
    RAISE EXCEPTION 'SP4_SCENARIO_POLICY_LINEAGE_MISMATCH';
  END IF;

  IF profile_status IS DISTINCT FROM 'LOCKED' THEN
    RAISE EXCEPTION 'SP4_SCENARIO_REQUIRES_LOCKED_PROFILE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_sp4_scenario_lineage
BEFORE INSERT ON sp4_scenario_lineage
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_scenario_lineage();

CREATE OR REPLACE FUNCTION miqo_guard_scenario_generation_rejection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  objective_version_id text;
  objective_catalogue text;
  profile_status profile_version_status;
BEGIN
  SELECT risk_profile_version_id,catalogue_version
    INTO objective_version_id,objective_catalogue
  FROM customer_objective
  WHERE customer_objective_id=NEW.customer_objective_id;

  SELECT status INTO profile_status
  FROM risk_profile_version
  WHERE risk_profile_version_id=NEW.risk_profile_version_id;

  IF objective_version_id IS NULL THEN
    RAISE EXCEPTION 'SP4_REJECTION_OBJECTIVE_NOT_FOUND';
  END IF;

  IF objective_version_id IS DISTINCT FROM NEW.risk_profile_version_id
     OR objective_catalogue IS DISTINCT FROM NEW.catalogue_version THEN
    RAISE EXCEPTION 'SP4_REJECTION_POLICY_LINEAGE_MISMATCH';
  END IF;

  IF profile_status IS DISTINCT FROM 'LOCKED' THEN
    RAISE EXCEPTION 'SP4_REJECTION_REQUIRES_LOCKED_PROFILE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_scenario_generation_rejection
BEFORE INSERT ON scenario_generation_rejection
FOR EACH ROW EXECUTE FUNCTION miqo_guard_scenario_generation_rejection();

CREATE OR REPLACE FUNCTION miqo_guard_sp4_generation_evidence_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SP4_GENERATION_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_sp4_scenario_lineage_immutable
BEFORE UPDATE OR DELETE ON sp4_scenario_lineage
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_generation_evidence_immutable();

CREATE TRIGGER trg_scenario_generation_rejection_immutable
BEFORE UPDATE OR DELETE ON scenario_generation_rejection
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_generation_evidence_immutable();

COMMIT;
