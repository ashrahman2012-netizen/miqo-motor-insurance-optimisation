BEGIN;

ALTER TABLE quote_request DROP CONSTRAINT quote_request_synthetic_channel;
ALTER TABLE quote_request ADD CONSTRAINT quote_request_synthetic_channel CHECK (
  channel_key IN ('DIRECT_SYNTHETIC','PCW_SYNTHETIC')
);

CREATE TABLE market_route (
  market_route_id text PRIMARY KEY,
  route_key text NOT NULL UNIQUE,
  route_catalogue_version text NOT NULL,
  provider_key text NOT NULL,
  channel_key text NOT NULL,
  adapter_version text NOT NULL,
  mapping_version text NOT NULL,
  route_fingerprint text NOT NULL UNIQUE,
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_route_fingerprint_format CHECK (
    route_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT market_route_synthetic_only CHECK (
    synthetic = true
    AND provider_key LIKE 'MOCK-%'
    AND channel_key IN ('DIRECT_SYNTHETIC','PCW_SYNTHETIC')
  )
);

CREATE TABLE sp4_quote_request_lineage (
  quote_request_id text PRIMARY KEY REFERENCES quote_request(quote_request_id),
  market_route_id text NOT NULL REFERENCES market_route(market_route_id),
  customer_objective_id text NOT NULL REFERENCES customer_objective(customer_objective_id),
  scenario_id text NOT NULL REFERENCES scenario(scenario_id),
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  route_fingerprint text NOT NULL,
  orchestration_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sp4_quote_lineage_route_fingerprint_format CHECK (
    route_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT uq_sp4_quote_route UNIQUE (scenario_id,market_route_id)
);

CREATE OR REPLACE FUNCTION miqo_guard_sp4_quote_request_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  request_scenario text;
  request_provider text;
  request_channel text;
  request_adapter text;
  request_mapping text;
  run_version text;
  route_provider text;
  route_channel text;
  route_adapter text;
  route_mapping text;
  route_fp text;
  route_synthetic boolean;
  scenario_objective text;
  scenario_version text;
BEGIN
  SELECT qr.scenario_id,qr.provider_key,qr.channel_key,qr.adapter_version,qr.mapping_version,run.risk_profile_version_id
    INTO request_scenario,request_provider,request_channel,request_adapter,request_mapping,run_version
  FROM quote_request qr
  JOIN quote_run run ON run.quote_run_id=qr.quote_run_id
  WHERE qr.quote_request_id=NEW.quote_request_id;

  SELECT provider_key,channel_key,adapter_version,mapping_version,route_fingerprint,synthetic
    INTO route_provider,route_channel,route_adapter,route_mapping,route_fp,route_synthetic
  FROM market_route
  WHERE market_route_id=NEW.market_route_id;

  SELECT customer_objective_id,risk_profile_version_id
    INTO scenario_objective,scenario_version
  FROM sp4_scenario_lineage
  WHERE scenario_id=NEW.scenario_id;

  IF request_scenario IS NULL THEN
    RAISE EXCEPTION 'SP4_ROUTE_QUOTE_REQUEST_NOT_FOUND';
  END IF;

  IF route_provider IS NULL OR route_synthetic IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'SP4_MARKET_ROUTE_NOT_SYNTHETIC';
  END IF;

  IF scenario_objective IS NULL THEN
    RAISE EXCEPTION 'SP4_ROUTE_SCENARIO_LINEAGE_NOT_FOUND';
  END IF;

  IF request_scenario IS DISTINCT FROM NEW.scenario_id
     OR run_version IS DISTINCT FROM NEW.risk_profile_version_id
     OR scenario_version IS DISTINCT FROM NEW.risk_profile_version_id
     OR scenario_objective IS DISTINCT FROM NEW.customer_objective_id THEN
    RAISE EXCEPTION 'SP4_ROUTE_QUOTE_LINEAGE_MISMATCH';
  END IF;

  IF request_provider IS DISTINCT FROM route_provider
     OR request_channel IS DISTINCT FROM route_channel
     OR request_adapter IS DISTINCT FROM route_adapter
     OR request_mapping IS DISTINCT FROM route_mapping
     OR NEW.route_fingerprint IS DISTINCT FROM route_fp THEN
    RAISE EXCEPTION 'SP4_MARKET_ROUTE_METADATA_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_sp4_quote_request_lineage
BEFORE INSERT ON sp4_quote_request_lineage
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_quote_request_lineage();

CREATE OR REPLACE FUNCTION miqo_guard_sp4_route_evidence_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SP4_ROUTE_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_market_route_immutable
BEFORE UPDATE OR DELETE ON market_route
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_route_evidence_immutable();

CREATE TRIGGER trg_sp4_quote_request_lineage_immutable
BEFORE UPDATE OR DELETE ON sp4_quote_request_lineage
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_route_evidence_immutable();

COMMIT;
