BEGIN;

CREATE TABLE optimisation_catalogue_version (
  catalogue_version text PRIMARY KEY,
  objective_model_version text NOT NULL,
  policy_fingerprint text NOT NULL UNIQUE,
  catalogue_snapshot_json jsonb NOT NULL,
  objective_model_snapshot_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT optimisation_catalogue_policy_fingerprint_format
    CHECK (policy_fingerprint ~ '^[0-9a-f]{64}$')
);

CREATE TABLE customer_objective (
  customer_objective_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  objective_id text NOT NULL,
  objective_version text NOT NULL,
  catalogue_version text NOT NULL REFERENCES optimisation_catalogue_version(catalogue_version),
  policy_fingerprint text NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_objective_executable_v1 CHECK (
    objective_id IN (
      'LOWEST_ANNUAL_PREMIUM',
      'LOWEST_MONTHLY_COMMITMENT',
      'LOWEST_FINANCE_COST',
      'LOWER_EXCESS_EXPOSURE'
    )
  ),
  CONSTRAINT customer_objective_policy_fingerprint_format
    CHECK (policy_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT uq_customer_objective_policy_selection
    UNIQUE (risk_profile_version_id, objective_id, policy_fingerprint)
);

CREATE OR REPLACE FUNCTION miqo_guard_customer_objective()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  profile_state profile_version_status;
  catalogue_objective_version text;
  catalogue_fingerprint text;
BEGIN
  SELECT status INTO profile_state
  FROM risk_profile_version
  WHERE risk_profile_version_id=NEW.risk_profile_version_id;

  IF profile_state IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_OBJECTIVE_PROFILE_VERSION_NOT_FOUND';
  END IF;

  IF profile_state IS DISTINCT FROM 'LOCKED' THEN
    RAISE EXCEPTION 'CUSTOMER_OBJECTIVE_REQUIRES_LOCKED_PROFILE';
  END IF;

  SELECT objective_model_version, policy_fingerprint
    INTO catalogue_objective_version, catalogue_fingerprint
  FROM optimisation_catalogue_version
  WHERE catalogue_version=NEW.catalogue_version;

  IF catalogue_objective_version IS NULL THEN
    RAISE EXCEPTION 'OPTIMISATION_CATALOGUE_VERSION_NOT_FOUND';
  END IF;

  IF NEW.objective_version IS DISTINCT FROM catalogue_objective_version
     OR NEW.policy_fingerprint IS DISTINCT FROM catalogue_fingerprint THEN
    RAISE EXCEPTION 'CUSTOMER_OBJECTIVE_POLICY_LINEAGE_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_customer_objective
BEFORE INSERT ON customer_objective
FOR EACH ROW EXECUTE FUNCTION miqo_guard_customer_objective();

CREATE OR REPLACE FUNCTION miqo_guard_sp4_policy_evidence_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SP4_POLICY_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_optimisation_catalogue_version_immutable
BEFORE UPDATE OR DELETE ON optimisation_catalogue_version
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_policy_evidence_immutable();

CREATE TRIGGER trg_customer_objective_immutable
BEFORE UPDATE OR DELETE ON customer_objective
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_policy_evidence_immutable();

COMMIT;
