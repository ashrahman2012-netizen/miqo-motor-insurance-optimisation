BEGIN;

ALTER TABLE optimisation_preference
  ADD COLUMN frozen_at timestamptz;

ALTER TABLE scenario
  ADD COLUMN preference_snapshot_json jsonb,
  ADD COLUMN generation_fingerprint text,
  ADD COLUMN generation_ordinal integer;

ALTER TABLE scenario ADD CONSTRAINT scenario_generated_snapshot_complete CHECK (
  status <> 'GENERATED'
  OR (
    preference_snapshot_json IS NOT NULL
    AND generation_fingerprint IS NOT NULL
    AND generation_ordinal IS NOT NULL
    AND generation_ordinal > 0
  )
);

ALTER TABLE scenario_delta ADD CONSTRAINT scenario_delta_approved_o_field CHECK (
  field_id IN (
    'voluntary_excess',
    'payment_structure',
    'policy_start_date',
    'telematics_preference',
    'genuine_named_driver_inclusion'
  )
);

CREATE UNIQUE INDEX uq_generated_scenario_fingerprint_ordinal
  ON scenario(risk_profile_version_id,generation_fingerprint,generation_ordinal)
  WHERE status='GENERATED';

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

  IF EXISTS (
    SELECT 1 FROM scenario
    WHERE risk_profile_version_id = NEW.risk_profile_version_id
      AND status = 'GENERATED'
  ) THEN
    RAISE EXCEPTION 'PREFERENCE_SET_FROZEN_BY_SCENARIO';
  END IF;

  RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION miqo_guard_frozen_optimisation_preference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'PREFERENCE_SET_FROZEN_BY_SCENARIO';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_frozen_optimisation_preference
BEFORE UPDATE OR DELETE ON optimisation_preference
FOR EACH ROW EXECUTE FUNCTION miqo_guard_frozen_optimisation_preference();

CREATE OR REPLACE FUNCTION miqo_guard_generated_scenario_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'GENERATED' THEN
    RAISE EXCEPTION 'GENERATED_SCENARIO_IMMUTABLE';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_generated_scenario_immutable
BEFORE UPDATE OR DELETE ON scenario
FOR EACH ROW EXECUTE FUNCTION miqo_guard_generated_scenario_immutable();

CREATE OR REPLACE FUNCTION miqo_guard_generated_scenario_delta_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_scenario_id text;
  target_status text;
BEGIN
  target_scenario_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.scenario_id ELSE NEW.scenario_id END;

  SELECT status INTO target_status
  FROM scenario
  WHERE scenario_id = target_scenario_id;

  IF target_status = 'GENERATED' THEN
    RAISE EXCEPTION 'GENERATED_SCENARIO_IMMUTABLE';
  END IF;

  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_generated_scenario_delta_immutable
BEFORE INSERT OR UPDATE OR DELETE ON scenario_delta
FOR EACH ROW EXECUTE FUNCTION miqo_guard_generated_scenario_delta_immutable();

COMMIT;
