BEGIN;

ALTER TABLE quote_request
  ADD COLUMN channel_key text,
  ADD COLUMN request_fingerprint text;

UPDATE quote_request
SET channel_key='DIRECT_SYNTHETIC'
WHERE channel_key IS NULL;

UPDATE quote_request
SET request_fingerprint=md5(
  quote_request_id || '|' || quote_run_id || '|' || scenario_id || '|' ||
  provider_key || '|' || channel_key || '|' || adapter_version || '|' || mapping_version
)
WHERE request_fingerprint IS NULL;

ALTER TABLE quote_request
  ALTER COLUMN channel_key SET NOT NULL,
  ALTER COLUMN request_fingerprint SET NOT NULL;

ALTER TABLE quote_request ADD CONSTRAINT quote_request_synthetic_provider CHECK (
  provider_key LIKE 'MOCK-%'
);

ALTER TABLE quote_request ADD CONSTRAINT quote_request_synthetic_channel CHECK (
  channel_key = 'DIRECT_SYNTHETIC'
);

CREATE UNIQUE INDEX uq_quote_request_fingerprint
  ON quote_request(request_fingerprint);

CREATE INDEX idx_integrity_signal_pre_quote
  ON integrity_signal(risk_profile_version_id,scenario_id,stage,created_at);

CREATE OR REPLACE FUNCTION miqo_guard_quote_run_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  profile_status profile_version_status;
BEGIN
  SELECT status INTO profile_status
  FROM risk_profile_version
  WHERE risk_profile_version_id=NEW.risk_profile_version_id;

  IF profile_status <> 'LOCKED' THEN
    RAISE EXCEPTION 'QUOTE_RUN_REQUIRES_LOCKED_PROFILE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_quote_run_profile
BEFORE INSERT ON quote_run
FOR EACH ROW EXECUTE FUNCTION miqo_guard_quote_run_profile();

CREATE OR REPLACE FUNCTION miqo_guard_quote_request_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  run_version_id text;
  scenario_version_id text;
  scenario_status text;
  profile_status profile_version_status;
  missing_required integer;
  blocking_discrepancy boolean;
  invalid_delta_count integer;
BEGIN
  SELECT risk_profile_version_id INTO run_version_id
  FROM quote_run
  WHERE quote_run_id=NEW.quote_run_id;

  SELECT risk_profile_version_id,status
    INTO scenario_version_id,scenario_status
  FROM scenario
  WHERE scenario_id=NEW.scenario_id;

  IF run_version_id IS NULL OR scenario_version_id IS NULL
     OR run_version_id IS DISTINCT FROM scenario_version_id THEN
    RAISE EXCEPTION 'QUOTE_LINEAGE_MISMATCH';
  END IF;

  SELECT status INTO profile_status
  FROM risk_profile_version
  WHERE risk_profile_version_id=run_version_id;

  IF profile_status='SUPERSEDED' THEN
    RAISE EXCEPTION 'PROFILE_VERSION_SUPERSEDED';
  END IF;

  IF profile_status <> 'LOCKED' THEN
    RAISE EXCEPTION 'PROFILE_NOT_LOCKED';
  END IF;

  IF scenario_status <> 'GENERATED' THEN
    RAISE EXCEPTION 'MISSING_REQUIRED_QUOTE_INPUT';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM discrepancy
    WHERE risk_profile_version_id=run_version_id
      AND blocking=true
  ) INTO blocking_discrepancy;

  IF blocking_discrepancy THEN
    RAISE EXCEPTION 'UNRESOLVED_DISCREPANCY';
  END IF;

  SELECT count(*) INTO invalid_delta_count
  FROM scenario_delta
  WHERE scenario_id=NEW.scenario_id
    AND (
      control_class <> 'O'
      OR field_id NOT IN (
        'voluntary_excess',
        'payment_structure',
        'policy_start_date',
        'telematics_preference',
        'genuine_named_driver_inclusion'
      )
    );

  IF invalid_delta_count > 0 THEN
    RAISE EXCEPTION 'SCENARIO_CONTAINS_NON_O_DELTA';
  END IF;

  SELECT count(*) INTO missing_required
  FROM (
    VALUES ('main_driver_id'),('annual_mileage'),('licence_held_since')
  ) AS required(field_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM canonical_field_value value
    WHERE value.risk_profile_version_id=run_version_id
      AND value.field_id=required.field_id
      AND value.value_json <> 'null'::jsonb
  );

  IF missing_required > 0 THEN
    RAISE EXCEPTION 'MISSING_REQUIRED_QUOTE_INPUT';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_quote_request_lineage
BEFORE INSERT ON quote_request
FOR EACH ROW EXECUTE FUNCTION miqo_guard_quote_request_lineage();

CREATE OR REPLACE FUNCTION miqo_guard_quote_request_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'QUOTE_REQUEST_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_guard_quote_request_immutable
BEFORE UPDATE OR DELETE ON quote_request
FOR EACH ROW EXECUTE FUNCTION miqo_guard_quote_request_immutable();

CREATE OR REPLACE FUNCTION miqo_guard_integrity_signal_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'INTEGRITY_SIGNAL_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_guard_integrity_signal_immutable
BEFORE UPDATE OR DELETE ON integrity_signal
FOR EACH ROW EXECUTE FUNCTION miqo_guard_integrity_signal_immutable();

COMMIT;
