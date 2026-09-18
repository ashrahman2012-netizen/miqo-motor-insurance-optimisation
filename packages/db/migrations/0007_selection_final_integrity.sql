BEGIN;

CREATE TABLE shortlist (
  shortlist_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  comparison_rule_version text NOT NULL,
  comparison_fingerprint text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_shortlist_version_fingerprint
  ON shortlist(risk_profile_version_id,comparison_fingerprint);

CREATE TABLE shortlist_entry (
  shortlist_entry_id text PRIMARY KEY,
  shortlist_id text NOT NULL REFERENCES shortlist(shortlist_id),
  normalised_quote_id text NOT NULL REFERENCES normalised_quote(normalised_quote_id),
  ordinal integer NOT NULL CHECK (ordinal > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shortlist_id,normalised_quote_id),
  UNIQUE(shortlist_id,ordinal)
);

CREATE TABLE selection (
  selection_id text PRIMARY KEY,
  shortlist_id text NOT NULL REFERENCES shortlist(shortlist_id),
  normalised_quote_id text NOT NULL REFERENCES normalised_quote(normalised_quote_id),
  scenario_id text NOT NULL REFERENCES scenario(scenario_id),
  quote_request_id text NOT NULL REFERENCES quote_request(quote_request_id),
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  status text NOT NULL CHECK (status IN ('ACCEPTED','BLOCKED')),
  selected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shortlist_id)
);

CREATE TABLE final_integrity_result (
  final_integrity_result_id text PRIMARY KEY,
  selection_id text NOT NULL UNIQUE REFERENCES selection(selection_id),
  integrity_rule_version text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('PASS','BLOCKED')),
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE prototype_completion (
  prototype_completion_id text PRIMARY KEY,
  selection_id text NOT NULL UNIQUE REFERENCES selection(selection_id),
  profile_id text NOT NULL REFERENCES profile(profile_id),
  status text NOT NULL CHECK (status = 'PROTOTYPE_JOURNEY_COMPLETE'),
  data_classification text NOT NULL CHECK (data_classification = 'SYNTHETIC'),
  live_provider_activity text NOT NULL CHECK (live_provider_activity = 'DISABLED'),
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION miqo_guard_shortlist_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  quote_state comparison_state;
BEGIN
  SELECT comparison_state INTO quote_state
  FROM normalised_quote
  WHERE normalised_quote_id=NEW.normalised_quote_id;

  IF quote_state IS DISTINCT FROM 'DIRECTLY_COMPARABLE' THEN
    RAISE EXCEPTION 'SHORTLIST_REQUIRES_DIRECTLY_COMPARABLE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_shortlist_entry
BEFORE INSERT ON shortlist_entry
FOR EACH ROW EXECUTE FUNCTION miqo_guard_shortlist_entry();

CREATE OR REPLACE FUNCTION miqo_guard_selection_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  shortlist_version text;
  actual_request text;
  actual_scenario text;
  actual_version text;
  quote_state comparison_state;
  profile_state profile_version_status;
  shortlist_member boolean;
  blocking_signal boolean;
BEGIN
  SELECT risk_profile_version_id INTO shortlist_version
  FROM shortlist
  WHERE shortlist_id=NEW.shortlist_id;

  SELECT
    qr.quote_request_id,
    qr.scenario_id,
    run.risk_profile_version_id,
    nq.comparison_state
  INTO
    actual_request,
    actual_scenario,
    actual_version,
    quote_state
  FROM normalised_quote nq
  JOIN raw_provider_response raw
    ON raw.raw_provider_response_id=nq.raw_provider_response_id
  JOIN quote_request qr
    ON qr.quote_request_id=raw.quote_request_id
  JOIN quote_run run
    ON run.quote_run_id=qr.quote_run_id
  WHERE nq.normalised_quote_id=NEW.normalised_quote_id;

  SELECT EXISTS(
    SELECT 1
    FROM shortlist_entry se
    WHERE se.shortlist_id=NEW.shortlist_id
      AND se.normalised_quote_id=NEW.normalised_quote_id
  ) INTO shortlist_member;

  IF NOT shortlist_member THEN
    RAISE EXCEPTION 'SELECTION_QUOTE_NOT_SHORTLISTED';
  END IF;

  IF quote_state IS DISTINCT FROM 'DIRECTLY_COMPARABLE' THEN
    RAISE EXCEPTION 'SELECTION_REQUIRES_DIRECTLY_COMPARABLE';
  END IF;

  IF shortlist_version IS DISTINCT FROM NEW.risk_profile_version_id
     OR actual_request IS DISTINCT FROM NEW.quote_request_id
     OR actual_scenario IS DISTINCT FROM NEW.scenario_id
     OR actual_version IS DISTINCT FROM NEW.risk_profile_version_id THEN
    RAISE EXCEPTION 'SELECTION_LINEAGE_MISMATCH';
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM scenario s
    WHERE s.scenario_id=NEW.scenario_id
      AND s.risk_profile_version_id=NEW.risk_profile_version_id
  ) THEN
    RAISE EXCEPTION 'SELECTION_SCENARIO_PROFILE_MISMATCH';
  END IF;

  IF NEW.status='ACCEPTED' THEN
    SELECT status INTO profile_state
    FROM risk_profile_version
    WHERE risk_profile_version_id=NEW.risk_profile_version_id;

    SELECT EXISTS(
      SELECT 1 FROM integrity_signal
      WHERE scenario_id=NEW.scenario_id AND blocking=true
    ) INTO blocking_signal;

    IF profile_state IS DISTINCT FROM 'LOCKED' THEN
      RAISE EXCEPTION 'FINAL_PROFILE_VERSION_NOT_CURRENT_LOCKED';
    END IF;

    IF blocking_signal THEN
      RAISE EXCEPTION 'FINAL_BLOCKING_INTEGRITY_SIGNAL_PRESENT';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_selection_lineage
BEFORE INSERT ON selection
FOR EACH ROW EXECUTE FUNCTION miqo_guard_selection_lineage();

CREATE OR REPLACE FUNCTION miqo_guard_final_integrity_result()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  selection_status text;
BEGIN
  SELECT status INTO selection_status
  FROM selection
  WHERE selection_id=NEW.selection_id;

  IF NEW.outcome='PASS' AND selection_status IS DISTINCT FROM 'ACCEPTED' THEN
    RAISE EXCEPTION 'FINAL_INTEGRITY_PASS_REQUIRES_ACCEPTED_SELECTION';
  END IF;

  IF NEW.outcome='BLOCKED' AND selection_status IS DISTINCT FROM 'BLOCKED' THEN
    RAISE EXCEPTION 'FINAL_INTEGRITY_BLOCK_REQUIRES_BLOCKED_SELECTION';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_final_integrity_result
BEFORE INSERT ON final_integrity_result
FOR EACH ROW EXECUTE FUNCTION miqo_guard_final_integrity_result();

CREATE OR REPLACE FUNCTION miqo_guard_prototype_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  selection_status text;
  integrity_outcome text;
BEGIN
  SELECT status INTO selection_status
  FROM selection
  WHERE selection_id=NEW.selection_id;

  SELECT outcome INTO integrity_outcome
  FROM final_integrity_result
  WHERE selection_id=NEW.selection_id;

  IF selection_status IS DISTINCT FROM 'ACCEPTED'
     OR integrity_outcome IS DISTINCT FROM 'PASS' THEN
    RAISE EXCEPTION 'PROTOTYPE_COMPLETION_REQUIRES_FINAL_INTEGRITY_PASS';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_prototype_completion
BEFORE INSERT ON prototype_completion
FOR EACH ROW EXECUTE FUNCTION miqo_guard_prototype_completion();

CREATE OR REPLACE FUNCTION miqo_guard_sprint3_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SPRINT3_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_shortlist_immutable
BEFORE UPDATE OR DELETE ON shortlist
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sprint3_append_only();

CREATE TRIGGER trg_shortlist_entry_immutable
BEFORE UPDATE OR DELETE ON shortlist_entry
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sprint3_append_only();

CREATE TRIGGER trg_selection_immutable
BEFORE UPDATE OR DELETE ON selection
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sprint3_append_only();

CREATE TRIGGER trg_final_integrity_result_immutable
BEFORE UPDATE OR DELETE ON final_integrity_result
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sprint3_append_only();

CREATE TRIGGER trg_prototype_completion_immutable
BEFORE UPDATE OR DELETE ON prototype_completion
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sprint3_append_only();

CREATE OR REPLACE FUNCTION miqo_guard_audit_event_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_EVENT_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_audit_event_immutable
BEFORE UPDATE OR DELETE ON audit_event
FOR EACH ROW EXECUTE FUNCTION miqo_guard_audit_event_immutable();

COMMIT;
