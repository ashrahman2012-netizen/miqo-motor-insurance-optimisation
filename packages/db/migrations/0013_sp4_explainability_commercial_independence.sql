BEGIN;

CREATE TABLE recommendation_explanation (
  recommendation_explanation_id text PRIMARY KEY,
  recommendation_set_id text NOT NULL UNIQUE REFERENCES recommendation_set(recommendation_set_id),
  objective_id text NOT NULL,
  objective_version text NOT NULL,
  catalogue_version text NOT NULL REFERENCES optimisation_catalogue_version(catalogue_version),
  policy_fingerprint text NOT NULL,
  recommendation_rule_version text NOT NULL,
  explanation_rule_version text NOT NULL,
  surfaced_scenario_id text NOT NULL REFERENCES scenario(scenario_id),
  surfaced_market_route_id text NOT NULL REFERENCES market_route(market_route_id),
  surfaced_normalised_quote_id text NOT NULL REFERENCES normalised_quote(normalised_quote_id),
  eligible_evidence_json jsonb NOT NULL,
  excluded_evidence_json jsonb NOT NULL,
  material_reasons_json jsonb NOT NULL,
  explanation_fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_explanation_policy_fingerprint_format CHECK (
    policy_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT recommendation_explanation_fingerprint_format CHECK (
    explanation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT recommendation_explanation_rule_version CHECK (
    explanation_rule_version='sp4-explainability-v1'
  )
);

CREATE TABLE optimisation_explanation (
  explanation_id text PRIMARY KEY,
  recommendation_set_id text NOT NULL REFERENCES recommendation_set(recommendation_set_id),
  scenario_id text NOT NULL REFERENCES scenario(scenario_id),
  market_route_id text NOT NULL REFERENCES market_route(market_route_id),
  field_or_control text NOT NULL,
  classification text NOT NULL,
  source text NOT NULL,
  customer_can_change boolean NOT NULL,
  baseline_value jsonb,
  scenario_value jsonb,
  quoted_effect_if_observable jsonb,
  legitimacy_reason text NOT NULL,
  provider_channel_applicability jsonb NOT NULL,
  rule_version text NOT NULL,
  explanation_fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT optimisation_explanation_classification CHECK (
    classification IN ('FIXED','CONTROLLABLE','TIME_DEPENDENT','PROVIDER_SPECIFIC')
  ),
  CONSTRAINT optimisation_explanation_rule_version CHECK (
    rule_version='sp4-explainability-v1'
  ),
  CONSTRAINT optimisation_explanation_fingerprint_format CHECK (
    explanation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT uq_optimisation_explanation_control UNIQUE (
    recommendation_set_id,scenario_id,market_route_id,field_or_control
  )
);

-- Commercial metadata is deliberately isolated from the optimisation,
-- comparison and recommendation schemas. It is synthetic evidence used only
-- to prove that commercial economics cannot influence customer outcomes.
CREATE TABLE synthetic_commercial_metadata (
  synthetic_commercial_metadata_id text PRIMARY KEY,
  market_route_id text NOT NULL REFERENCES market_route(market_route_id),
  commercial_version text NOT NULL,
  provider_remuneration_pence integer NOT NULL DEFAULT 0,
  introducer_remuneration_pence integer NOT NULL DEFAULT 0,
  referral_revenue_pence integer NOT NULL DEFAULT 0,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT synthetic_commercial_values_nonnegative CHECK (
    provider_remuneration_pence >= 0
    AND introducer_remuneration_pence >= 0
    AND referral_revenue_pence >= 0
  ),
  CONSTRAINT uq_synthetic_commercial_version UNIQUE (
    market_route_id,commercial_version
  )
);

CREATE OR REPLACE FUNCTION miqo_guard_recommendation_explanation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rec_objective text;
  rec_objective_version text;
  rec_catalogue text;
  rec_policy text;
  rec_rule text;
  rec_surfaced_quote text;
  actual_scenario text;
  actual_route text;
BEGIN
  SELECT
    objective_id,
    objective_version,
    catalogue_version,
    policy_fingerprint,
    recommendation_rule_version,
    surfaced_normalised_quote_id
  INTO
    rec_objective,
    rec_objective_version,
    rec_catalogue,
    rec_policy,
    rec_rule,
    rec_surfaced_quote
  FROM recommendation_set
  WHERE recommendation_set_id=NEW.recommendation_set_id;

  IF rec_objective IS NULL THEN
    RAISE EXCEPTION 'SP4_EXPLANATION_RECOMMENDATION_SET_NOT_FOUND';
  END IF;

  IF rec_objective IS DISTINCT FROM NEW.objective_id
     OR rec_objective_version IS DISTINCT FROM NEW.objective_version
     OR rec_catalogue IS DISTINCT FROM NEW.catalogue_version
     OR rec_policy IS DISTINCT FROM NEW.policy_fingerprint
     OR rec_rule IS DISTINCT FROM NEW.recommendation_rule_version
     OR rec_surfaced_quote IS DISTINCT FROM NEW.surfaced_normalised_quote_id THEN
    RAISE EXCEPTION 'SP4_EXPLANATION_RECOMMENDATION_LINEAGE_MISMATCH';
  END IF;

  SELECT scenario_id,market_route_id
    INTO actual_scenario,actual_route
  FROM recommendation_quote_evidence
  WHERE recommendation_set_id=NEW.recommendation_set_id
    AND normalised_quote_id=NEW.surfaced_normalised_quote_id
    AND evidence_status='ELIGIBLE'
    AND ordinal=1;

  IF actual_scenario IS NULL
     OR actual_scenario IS DISTINCT FROM NEW.surfaced_scenario_id
     OR actual_route IS DISTINCT FROM NEW.surfaced_market_route_id THEN
    RAISE EXCEPTION 'SP4_EXPLANATION_SURFACED_EVIDENCE_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_recommendation_explanation
BEFORE INSERT ON recommendation_explanation
FOR EACH ROW EXECUTE FUNCTION miqo_guard_recommendation_explanation();

CREATE OR REPLACE FUNCTION miqo_guard_optimisation_explanation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_scenario text;
  parent_route text;
BEGIN
  SELECT surfaced_scenario_id,surfaced_market_route_id
    INTO parent_scenario,parent_route
  FROM recommendation_explanation
  WHERE recommendation_set_id=NEW.recommendation_set_id;

  IF parent_scenario IS NULL THEN
    RAISE EXCEPTION 'SP4_OPTIMISATION_EXPLANATION_PARENT_NOT_FOUND';
  END IF;

  IF parent_scenario IS DISTINCT FROM NEW.scenario_id
     OR parent_route IS DISTINCT FROM NEW.market_route_id THEN
    RAISE EXCEPTION 'SP4_OPTIMISATION_EXPLANATION_LINEAGE_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_optimisation_explanation
BEFORE INSERT ON optimisation_explanation
FOR EACH ROW EXECUTE FUNCTION miqo_guard_optimisation_explanation();

CREATE OR REPLACE FUNCTION miqo_guard_sp4_explanation_evidence_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SP4_EXPLANATION_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_recommendation_explanation_immutable
BEFORE UPDATE OR DELETE ON recommendation_explanation
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_explanation_evidence_immutable();

CREATE TRIGGER trg_optimisation_explanation_immutable
BEFORE UPDATE OR DELETE ON optimisation_explanation
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_explanation_evidence_immutable();

CREATE OR REPLACE FUNCTION miqo_guard_synthetic_commercial_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  route_is_synthetic boolean;
BEGIN
  SELECT synthetic INTO route_is_synthetic
  FROM market_route
  WHERE market_route_id=NEW.market_route_id;

  IF route_is_synthetic IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'SP4_COMMERCIAL_METADATA_REQUIRES_SYNTHETIC_ROUTE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_synthetic_commercial_metadata
BEFORE INSERT ON synthetic_commercial_metadata
FOR EACH ROW EXECUTE FUNCTION miqo_guard_synthetic_commercial_metadata();

COMMIT;
