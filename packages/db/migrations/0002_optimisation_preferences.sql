BEGIN;

CREATE TABLE optimisation_preference (
  optimisation_preference_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  preference_key text NOT NULL CHECK (preference_key IN (
    'voluntary_excess',
    'payment_structure',
    'policy_start_date',
    'telematics_preference',
    'genuine_named_driver_inclusion'
  )),
  value_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (risk_profile_version_id, preference_key)
);

ALTER TABLE scenario
  ADD COLUMN optimisation_preference_id text REFERENCES optimisation_preference(optimisation_preference_id),
  ADD COLUMN generation_version text,
  ADD COLUMN generated_at timestamptz;

ALTER TABLE scenario ADD CONSTRAINT scenario_generated_provenance CHECK (
  status <> 'GENERATED'
  OR (
    optimisation_preference_id IS NOT NULL
    AND generation_version IS NOT NULL
    AND generated_at IS NOT NULL
  )
);

CREATE OR REPLACE FUNCTION miqo_guard_optimisation_preference_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_status profile_version_status;
BEGIN
  SELECT status INTO target_status
  FROM risk_profile_version
  WHERE risk_profile_version_id = NEW.risk_profile_version_id;

  IF target_status <> 'LOCKED' THEN
    RAISE EXCEPTION 'OPTIMISATION_REQUIRES_LOCKED_PROFILE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_optimisation_preference_profile
BEFORE INSERT OR UPDATE ON optimisation_preference
FOR EACH ROW EXECUTE FUNCTION miqo_guard_optimisation_preference_profile();

CREATE OR REPLACE FUNCTION miqo_guard_scenario_preference_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  preference_version_id text;
  profile_status profile_version_status;
BEGIN
  IF NEW.status <> 'GENERATED' THEN
    RETURN NEW;
  END IF;

  SELECT risk_profile_version_id INTO preference_version_id
  FROM optimisation_preference
  WHERE optimisation_preference_id = NEW.optimisation_preference_id;

  SELECT status INTO profile_status
  FROM risk_profile_version
  WHERE risk_profile_version_id = NEW.risk_profile_version_id;

  IF preference_version_id IS DISTINCT FROM NEW.risk_profile_version_id THEN
    RAISE EXCEPTION 'SCENARIO_PREFERENCE_PROFILE_MISMATCH';
  END IF;

  IF profile_status <> 'LOCKED' THEN
    RAISE EXCEPTION 'SCENARIO_REQUIRES_LOCKED_PROFILE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_scenario_preference_lineage
BEFORE INSERT OR UPDATE ON scenario
FOR EACH ROW EXECUTE FUNCTION miqo_guard_scenario_preference_lineage();

COMMIT;
