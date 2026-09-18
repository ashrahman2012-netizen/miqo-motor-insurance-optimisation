ALTER TYPE comparison_state RENAME VALUE 'COMPARABLE' TO 'DIRECTLY_COMPARABLE';
ALTER TYPE comparison_state RENAME VALUE 'ADJUSTED' TO 'ADJUSTED_COMPARABLE';
ALTER TYPE comparison_state RENAME VALUE 'NON_COMPARABLE' TO 'NOT_COMPARABLE';

ALTER TABLE normalised_quote
  DROP CONSTRAINT IF EXISTS normalised_quote_raw_provider_response_id_key;

ALTER TABLE normalised_quote
  ALTER COLUMN annual_cash_premium_pence DROP NOT NULL,
  ALTER COLUMN finance_cost_pence DROP NOT NULL,
  ALTER COLUMN compulsory_excess_pence DROP NOT NULL,
  ALTER COLUMN voluntary_excess_pence DROP NOT NULL,
  ALTER COLUMN finance_cost_pence DROP DEFAULT,
  ALTER COLUMN compulsory_excess_pence DROP DEFAULT,
  ALTER COLUMN voluntary_excess_pence DROP DEFAULT,
  ADD COLUMN comparison_reason text,
  ADD COLUMN normalisation_fingerprint text,
  ADD COLUMN normalised_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX uq_normalised_quote_raw_version
  ON normalised_quote(raw_provider_response_id,normalisation_version);

CREATE UNIQUE INDEX uq_normalised_quote_fingerprint
  ON normalised_quote(normalisation_fingerprint)
  WHERE normalisation_fingerprint IS NOT NULL;

CREATE OR REPLACE FUNCTION miqo_guard_sprint2_normalised_quote()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.normalisation_version LIKE 'sp2-normaliser-%' THEN
    IF NEW.comparison_state='ADJUSTED_COMPARABLE' THEN
      RAISE EXCEPTION 'ADJUSTED_COMPARABLE_NOT_APPROVED';
    END IF;

    IF NEW.comparison_state NOT IN ('DIRECTLY_COMPARABLE','NOT_COMPARABLE') THEN
      RAISE EXCEPTION 'INVALID_SPRINT2_COMPARISON_STATE';
    END IF;

    IF NEW.normalisation_fingerprint IS NULL OR NEW.comparison_reason IS NULL THEN
      RAISE EXCEPTION 'NORMALISATION_PROVENANCE_INCOMPLETE';
    END IF;

    IF NEW.comparison_state='DIRECTLY_COMPARABLE' AND (
      NEW.annual_cash_premium_pence IS NULL
      OR NEW.finance_cost_pence IS NULL
      OR NEW.compulsory_excess_pence IS NULL
      OR NEW.voluntary_excess_pence IS NULL
    ) THEN
      RAISE EXCEPTION 'DIRECT_COMPARABILITY_REQUIRES_COMPLETE_DIMENSIONS';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_sprint2_normalised_quote
BEFORE INSERT ON normalised_quote
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sprint2_normalised_quote();

CREATE OR REPLACE FUNCTION miqo_guard_normalised_quote_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'NORMALISED_QUOTE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_guard_normalised_quote_immutable
BEFORE UPDATE OR DELETE ON normalised_quote
FOR EACH ROW EXECUTE FUNCTION miqo_guard_normalised_quote_immutable();
