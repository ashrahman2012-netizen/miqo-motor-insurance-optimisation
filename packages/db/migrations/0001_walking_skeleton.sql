BEGIN;

CREATE TYPE control_class AS ENUM ('F','V','D','O','I');
CREATE TYPE profile_version_status AS ENUM ('DRAFT','LOCKED','SUPERSEDED');
CREATE TYPE comparison_state AS ENUM ('COMPARABLE','ADJUSTED','NON_COMPARABLE');

CREATE TABLE customer (
  customer_id text PRIMARY KEY,
  synthetic boolean NOT NULL DEFAULT true CHECK (synthetic = true),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profile (
  profile_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customer(customer_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE risk_profile_version (
  risk_profile_version_id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES profile(profile_id),
  version_no integer NOT NULL CHECK (version_no > 0),
  status profile_version_status NOT NULL,
  locked_at timestamptz,
  UNIQUE (profile_id, version_no),
  CHECK ((status = 'LOCKED' AND locked_at IS NOT NULL) OR status <> 'LOCKED')
);

CREATE UNIQUE INDEX uq_one_locked_profile ON risk_profile_version(profile_id) WHERE status = 'LOCKED';

CREATE TABLE canonical_field_value (
  canonical_field_value_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  field_id text NOT NULL,
  control_class control_class NOT NULL,
  value_json jsonb NOT NULL,
  source_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (risk_profile_version_id, field_id)
);

CREATE TABLE discrepancy (
  discrepancy_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  field_id text NOT NULL,
  declared_value_json jsonb,
  verified_value_json jsonb,
  state text NOT NULL CHECK (state IN ('DETECTED','REVIEW_REQUIRED','EXPLAINED','CORRECTED','ACCEPTED','BLOCKING','CLOSED')),
  blocking boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scenario (
  scenario_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scenario_delta (
  scenario_delta_id text PRIMARY KEY,
  scenario_id text NOT NULL REFERENCES scenario(scenario_id) ON DELETE CASCADE,
  field_id text NOT NULL,
  control_class control_class NOT NULL CHECK (control_class = 'O'),
  value_json jsonb NOT NULL
);

CREATE TABLE quote_run (
  quote_run_id text PRIMARY KEY,
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quote_request (
  quote_request_id text PRIMARY KEY,
  quote_run_id text NOT NULL REFERENCES quote_run(quote_run_id),
  scenario_id text NOT NULL REFERENCES scenario(scenario_id),
  provider_key text NOT NULL,
  adapter_version text NOT NULL,
  mapping_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE raw_provider_response (
  raw_provider_response_id text PRIMARY KEY,
  quote_request_id text NOT NULL REFERENCES quote_request(quote_request_id),
  payload_json jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE normalised_quote (
  normalised_quote_id text PRIMARY KEY,
  raw_provider_response_id text NOT NULL UNIQUE REFERENCES raw_provider_response(raw_provider_response_id),
  normalisation_version text NOT NULL,
  annual_cash_premium_pence integer NOT NULL CHECK (annual_cash_premium_pence >= 0),
  finance_cost_pence integer NOT NULL DEFAULT 0 CHECK (finance_cost_pence >= 0),
  compulsory_excess_pence integer NOT NULL DEFAULT 0 CHECK (compulsory_excess_pence >= 0),
  voluntary_excess_pence integer NOT NULL DEFAULT 0 CHECK (voluntary_excess_pence >= 0),
  comparison_state comparison_state NOT NULL
);

CREATE TABLE integrity_signal (
  integrity_signal_id text PRIMARY KEY,
  stage text NOT NULL,
  rule_id text NOT NULL,
  risk_profile_version_id text REFERENCES risk_profile_version(risk_profile_version_id),
  scenario_id text REFERENCES scenario(scenario_id),
  normalised_quote_id text REFERENCES normalised_quote(normalised_quote_id),
  state text NOT NULL,
  blocking boolean NOT NULL DEFAULT false,
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_event (
  audit_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  trace_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);


-- Database invariant: once factual values belong to a LOCKED or SUPERSEDED profile version,
-- no direct insert/update/delete is allowed against that version.
CREATE OR REPLACE FUNCTION miqo_guard_locked_profile_field_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_version_id text;
  target_status profile_version_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_version_id := OLD.risk_profile_version_id;
  ELSE
    target_version_id := NEW.risk_profile_version_id;
  END IF;

  SELECT status INTO target_status
  FROM risk_profile_version
  WHERE risk_profile_version_id = target_version_id;

  IF target_status IN ('LOCKED','SUPERSEDED') THEN
    RAISE EXCEPTION 'LOCKED_PROFILE_IMMUTABLE';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_locked_profile_field_mutation
BEFORE INSERT OR UPDATE OR DELETE ON canonical_field_value
FOR EACH ROW EXECUTE FUNCTION miqo_guard_locked_profile_field_mutation();

-- A locked profile version may transition to SUPERSEDED, but its identity/version/locked_at
-- cannot be edited in-place. A SUPERSEDED version is fully immutable.
CREATE OR REPLACE FUNCTION miqo_guard_profile_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'SUPERSEDED' THEN
    RAISE EXCEPTION 'SUPERSEDED_PROFILE_VERSION_IMMUTABLE';
  END IF;

  IF OLD.status = 'LOCKED' THEN
    IF NOT (
      NEW.status = 'SUPERSEDED'
      AND NEW.risk_profile_version_id = OLD.risk_profile_version_id
      AND NEW.profile_id = OLD.profile_id
      AND NEW.version_no = OLD.version_no
      AND NEW.locked_at IS NOT DISTINCT FROM OLD.locked_at
    ) THEN
      RAISE EXCEPTION 'LOCKED_PROFILE_VERSION_IMMUTABLE';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_profile_version_mutation
BEFORE UPDATE ON risk_profile_version
FOR EACH ROW EXECUTE FUNCTION miqo_guard_profile_version_mutation();

COMMIT;
