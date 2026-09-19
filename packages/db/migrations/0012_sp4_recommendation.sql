BEGIN;

CREATE TABLE recommendation_set (
  recommendation_set_id text PRIMARY KEY,
  customer_objective_id text NOT NULL REFERENCES customer_objective(customer_objective_id),
  risk_profile_version_id text NOT NULL REFERENCES risk_profile_version(risk_profile_version_id),
  exploration_fingerprint text NOT NULL,
  objective_id text NOT NULL,
  objective_version text NOT NULL,
  catalogue_version text NOT NULL REFERENCES optimisation_catalogue_version(catalogue_version),
  policy_fingerprint text NOT NULL,
  recommendation_rule_version text NOT NULL,
  recommendation_fingerprint text NOT NULL UNIQUE,
  surfaced_normalised_quote_id text REFERENCES normalised_quote(normalised_quote_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_set_exploration_fingerprint_format CHECK (
    exploration_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT recommendation_set_policy_fingerprint_format CHECK (
    policy_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT recommendation_set_fingerprint_format CHECK (
    recommendation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT recommendation_set_rule_version CHECK (
    recommendation_rule_version='sp4-recommendation-v1'
  ),
  CONSTRAINT recommendation_set_objective_allowed CHECK (
    objective_id IN (
      'LOWEST_ANNUAL_PREMIUM',
      'LOWEST_MONTHLY_COMMITMENT',
      'LOWEST_FINANCE_COST',
      'LOWER_EXCESS_EXPOSURE'
    )
  ),
  CONSTRAINT uq_recommendation_set_exploration UNIQUE (
    customer_objective_id,exploration_fingerprint,recommendation_rule_version
  )
);

CREATE TABLE recommendation_quote_evidence (
  recommendation_quote_evidence_id text PRIMARY KEY,
  recommendation_set_id text NOT NULL REFERENCES recommendation_set(recommendation_set_id),
  normalised_quote_id text NOT NULL REFERENCES normalised_quote(normalised_quote_id),
  quote_request_id text NOT NULL REFERENCES quote_request(quote_request_id),
  scenario_id text NOT NULL REFERENCES scenario(scenario_id),
  market_route_id text NOT NULL REFERENCES market_route(market_route_id),
  evidence_status text NOT NULL,
  ordinal integer,
  objective_metric text,
  objective_metric_value_pence integer,
  exclusion_reason text,
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_quote_status CHECK (
    evidence_status IN ('ELIGIBLE','EXCLUDED')
  ),
  CONSTRAINT recommendation_quote_metric_allowed CHECK (
    objective_metric IS NULL OR objective_metric IN (
      'annual_cash_premium_pence',
      'monthly_commitment_pence',
      'finance_cost_pence',
      'total_excess_exposure_pence'
    )
  ),
  CONSTRAINT recommendation_quote_metric_nonnegative CHECK (
    objective_metric_value_pence IS NULL OR objective_metric_value_pence >= 0
  ),
  CONSTRAINT recommendation_quote_ordinal_positive CHECK (
    ordinal IS NULL OR ordinal > 0
  ),
  CONSTRAINT recommendation_quote_evidence_fingerprint_format CHECK (
    evidence_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT uq_recommendation_quote_evidence UNIQUE (
    recommendation_set_id,normalised_quote_id
  ),
  CONSTRAINT uq_recommendation_quote_ordinal UNIQUE (
    recommendation_set_id,ordinal
  )
);

CREATE OR REPLACE FUNCTION miqo_guard_recommendation_set()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  objective_profile text;
  objective_name text;
  objective_version_value text;
  objective_catalogue text;
  objective_policy text;
  exploration_exists boolean;
  surfaced_state comparison_state;
  surfaced_lineage boolean;
BEGIN
  SELECT risk_profile_version_id,objective_id,objective_version,catalogue_version,policy_fingerprint
    INTO objective_profile,objective_name,objective_version_value,objective_catalogue,objective_policy
  FROM customer_objective
  WHERE customer_objective_id=NEW.customer_objective_id;

  IF objective_profile IS NULL THEN
    RAISE EXCEPTION 'SP4_RECOMMENDATION_OBJECTIVE_NOT_FOUND';
  END IF;

  IF objective_profile IS DISTINCT FROM NEW.risk_profile_version_id
     OR objective_name IS DISTINCT FROM NEW.objective_id
     OR objective_version_value IS DISTINCT FROM NEW.objective_version
     OR objective_catalogue IS DISTINCT FROM NEW.catalogue_version
     OR objective_policy IS DISTINCT FROM NEW.policy_fingerprint THEN
    RAISE EXCEPTION 'SP4_RECOMMENDATION_OBJECTIVE_LINEAGE_MISMATCH';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM sp4_scenario_lineage
    WHERE customer_objective_id=NEW.customer_objective_id
      AND risk_profile_version_id=NEW.risk_profile_version_id
      AND catalogue_version=NEW.catalogue_version
      AND policy_fingerprint=NEW.policy_fingerprint
      AND exploration_fingerprint=NEW.exploration_fingerprint
  ) INTO exploration_exists;

  IF NOT exploration_exists THEN
    RAISE EXCEPTION 'SP4_RECOMMENDATION_EXPLORATION_NOT_FOUND';
  END IF;

  IF NEW.surfaced_normalised_quote_id IS NOT NULL THEN
    SELECT nq.comparison_state,
           EXISTS(
             SELECT 1
             FROM normalised_quote nq2
             JOIN raw_provider_response raw ON raw.raw_provider_response_id=nq2.raw_provider_response_id
             JOIN sp4_quote_request_lineage ql ON ql.quote_request_id=raw.quote_request_id
             JOIN sp4_scenario_lineage sl ON sl.scenario_id=ql.scenario_id
             WHERE nq2.normalised_quote_id=NEW.surfaced_normalised_quote_id
               AND ql.customer_objective_id=NEW.customer_objective_id
               AND ql.risk_profile_version_id=NEW.risk_profile_version_id
               AND sl.exploration_fingerprint=NEW.exploration_fingerprint
           )
      INTO surfaced_state,surfaced_lineage
    FROM normalised_quote nq
    WHERE nq.normalised_quote_id=NEW.surfaced_normalised_quote_id;

    IF surfaced_state IS NULL OR NOT surfaced_lineage THEN
      RAISE EXCEPTION 'SP4_RECOMMENDATION_SURFACED_QUOTE_LINEAGE_MISMATCH';
    END IF;

    IF surfaced_state IS DISTINCT FROM 'DIRECTLY_COMPARABLE' THEN
      RAISE EXCEPTION 'SP4_RECOMMENDATION_SURFACED_QUOTE_NOT_DIRECTLY_COMPARABLE';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_recommendation_set
BEFORE INSERT ON recommendation_set
FOR EACH ROW EXECUTE FUNCTION miqo_guard_recommendation_set();

CREATE OR REPLACE FUNCTION miqo_guard_recommendation_quote_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  set_objective text;
  set_objective_id text;
  set_exploration text;
  set_profile text;
  quote_state comparison_state;
  quote_annual integer;
  quote_finance integer;
  quote_compulsory integer;
  quote_voluntary integer;
  actual_request text;
  actual_scenario text;
  actual_route text;
  actual_objective text;
  actual_profile text;
  actual_exploration text;
  payment_structure_value text;
  expected_metric text;
  expected_value integer;
BEGIN
  SELECT objective_id,customer_objective_id,exploration_fingerprint,risk_profile_version_id
    INTO set_objective,set_objective_id,set_exploration,set_profile
  FROM recommendation_set
  WHERE recommendation_set_id=NEW.recommendation_set_id;

  IF set_objective IS NULL THEN
    RAISE EXCEPTION 'SP4_RECOMMENDATION_SET_NOT_FOUND';
  END IF;

  SELECT
    nq.comparison_state,
    nq.annual_cash_premium_pence,
    nq.finance_cost_pence,
    nq.compulsory_excess_pence,
    nq.voluntary_excess_pence,
    raw.quote_request_id,
    ql.scenario_id,
    ql.market_route_id,
    ql.customer_objective_id,
    ql.risk_profile_version_id,
    sl.exploration_fingerprint
  INTO
    quote_state,
    quote_annual,
    quote_finance,
    quote_compulsory,
    quote_voluntary,
    actual_request,
    actual_scenario,
    actual_route,
    actual_objective,
    actual_profile,
    actual_exploration
  FROM normalised_quote nq
  JOIN raw_provider_response raw ON raw.raw_provider_response_id=nq.raw_provider_response_id
  JOIN sp4_quote_request_lineage ql ON ql.quote_request_id=raw.quote_request_id
  JOIN sp4_scenario_lineage sl ON sl.scenario_id=ql.scenario_id
  WHERE nq.normalised_quote_id=NEW.normalised_quote_id;

  IF actual_request IS NULL
     OR actual_request IS DISTINCT FROM NEW.quote_request_id
     OR actual_scenario IS DISTINCT FROM NEW.scenario_id
     OR actual_route IS DISTINCT FROM NEW.market_route_id
     OR actual_objective IS DISTINCT FROM set_objective_id
     OR actual_profile IS DISTINCT FROM set_profile
     OR actual_exploration IS DISTINCT FROM set_exploration THEN
    RAISE EXCEPTION 'SP4_RECOMMENDATION_QUOTE_LINEAGE_MISMATCH';
  END IF;

  SELECT value_json #>> '{}'
    INTO payment_structure_value
  FROM scenario_delta
  WHERE scenario_id=NEW.scenario_id
    AND field_id='payment_structure';

  IF NEW.evidence_status='ELIGIBLE' THEN
    IF quote_state IS DISTINCT FROM 'DIRECTLY_COMPARABLE' THEN
      RAISE EXCEPTION 'SP4_RECOMMENDATION_INELIGIBLE_COMPARISON_STATE';
    END IF;
    IF NEW.ordinal IS NULL
       OR NEW.objective_metric IS NULL
       OR NEW.objective_metric_value_pence IS NULL
       OR NEW.exclusion_reason IS NOT NULL THEN
      RAISE EXCEPTION 'SP4_RECOMMENDATION_ELIGIBLE_EVIDENCE_INCOMPLETE';
    END IF;

    CASE set_objective
      WHEN 'LOWEST_ANNUAL_PREMIUM' THEN
        expected_metric='annual_cash_premium_pence';
        expected_value=quote_annual;
      WHEN 'LOWEST_FINANCE_COST' THEN
        expected_metric='finance_cost_pence';
        expected_value=quote_finance;
      WHEN 'LOWER_EXCESS_EXPOSURE' THEN
        expected_metric='total_excess_exposure_pence';
        IF quote_compulsory IS NOT NULL AND quote_voluntary IS NOT NULL THEN
          expected_value=quote_compulsory+quote_voluntary;
        END IF;
      WHEN 'LOWEST_MONTHLY_COMMITMENT' THEN
        expected_metric='monthly_commitment_pence';
        IF payment_structure_value IS DISTINCT FROM 'MONTHLY' THEN
          RAISE EXCEPTION 'SP4_RECOMMENDATION_MONTHLY_REQUIRES_MONTHLY_SCENARIO';
        END IF;
        IF quote_annual IS NOT NULL AND quote_finance IS NOT NULL THEN
          expected_value=(quote_annual+quote_finance+11)/12;
        END IF;
      ELSE
        RAISE EXCEPTION 'SP4_RECOMMENDATION_OBJECTIVE_NOT_EXECUTABLE';
    END CASE;

    IF expected_value IS NULL
       OR NEW.objective_metric IS DISTINCT FROM expected_metric
       OR NEW.objective_metric_value_pence IS DISTINCT FROM expected_value THEN
      RAISE EXCEPTION 'SP4_RECOMMENDATION_OBJECTIVE_METRIC_MISMATCH';
    END IF;
  ELSE
    IF NEW.ordinal IS NOT NULL
       OR NEW.objective_metric IS NOT NULL
       OR NEW.objective_metric_value_pence IS NOT NULL
       OR NEW.exclusion_reason IS NULL THEN
      RAISE EXCEPTION 'SP4_RECOMMENDATION_EXCLUDED_EVIDENCE_INVALID';
    END IF;
    IF quote_state='ADJUSTED_COMPARABLE'
       AND NEW.exclusion_reason IS DISTINCT FROM 'COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE' THEN
      RAISE EXCEPTION 'SP4_RECOMMENDATION_ADJUSTED_EXCLUSION_REASON_REQUIRED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_recommendation_quote_evidence
BEFORE INSERT ON recommendation_quote_evidence
FOR EACH ROW EXECUTE FUNCTION miqo_guard_recommendation_quote_evidence();

CREATE OR REPLACE FUNCTION miqo_guard_sp4_recommendation_evidence_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SP4_RECOMMENDATION_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_recommendation_set_immutable
BEFORE UPDATE OR DELETE ON recommendation_set
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_recommendation_evidence_immutable();

CREATE TRIGGER trg_recommendation_quote_evidence_immutable
BEFORE UPDATE OR DELETE ON recommendation_quote_evidence
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp4_recommendation_evidence_immutable();

COMMIT;
