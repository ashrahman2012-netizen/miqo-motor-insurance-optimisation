-- SIM-G3-R1-SYN005-C2: forward-only quote-request guard alignment.
-- Do not modify 0004 or 0011; preserve all existing checks and triggers.
BEGIN;

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
  invalid_candidate_count integer;
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
        'genuine_named_driver_inclusion',
        'candidate_vehicle'
      )
    );

  IF invalid_delta_count > 0 THEN
    RAISE EXCEPTION 'SCENARIO_CONTAINS_NON_O_DELTA';
  END IF;


  -- Independently enforce candidate eligibility for direct SQL quote-request writers.
  SELECT count(*) INTO invalid_candidate_count
  FROM scenario_delta delta
  WHERE delta.scenario_id=NEW.scenario_id
    AND delta.field_id='candidate_vehicle'
    AND (
      delta.control_class IS DISTINCT FROM 'O'
      OR (SELECT generation_version FROM scenario WHERE scenario_id=NEW.scenario_id)
        IS DISTINCT FROM 'sp4-gen-v1'
      OR jsonb_typeof(delta.value_json) IS DISTINCT FROM 'string'
      OR length(btrim(delta.value_json #>> '{}'))=0
      OR NOT EXISTS (
        SELECT 1 FROM sp4_scenario_lineage lineage
        WHERE lineage.scenario_id=NEW.scenario_id
          AND lineage.risk_profile_version_id=run_version_id
          AND lineage.generation_version='sp4-gen-v1'
      )
      OR NOT EXISTS (
        SELECT 1 FROM canonical_field_value mode
        WHERE mode.risk_profile_version_id=run_version_id
          AND mode.field_id='vehicle_mode'
          AND mode.control_class='F'
          AND mode.value_json='"PRE_PURCHASE"'::jsonb
      )
      OR EXISTS (
        SELECT 1 FROM canonical_field_value current_vehicle
        WHERE current_vehicle.risk_profile_version_id=run_version_id
          AND current_vehicle.field_id='vehicle_id'
          AND current_vehicle.control_class='F'
          AND current_vehicle.value_json=delta.value_json
      )
      OR NOT EXISTS (
        SELECT 1 FROM candidate_vehicle registry
        WHERE registry.risk_profile_version_id=run_version_id
          AND registry.candidate_vehicle_id=(delta.value_json #>> '{}')
      )
    );

  IF invalid_candidate_count > 0 THEN
    RAISE EXCEPTION 'CANDIDATE_VEHICLE_NOT_ELIGIBLE';
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

COMMIT;
