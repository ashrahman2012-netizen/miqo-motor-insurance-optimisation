BEGIN;

ALTER TABLE raw_provider_response
  ADD COLUMN payload_text text,
  ADD COLUMN payload_sha256 text,
  ADD COLUMN provider_reference text,
  ADD COLUMN provider_response_at timestamptz;

ALTER TABLE raw_provider_response ADD CONSTRAINT raw_provider_payload_sha256_format CHECK (
  payload_sha256 IS NULL OR payload_sha256 ~ '^[0-9a-f]{64}$'
);

ALTER TABLE raw_provider_response ADD CONSTRAINT raw_provider_payload_text_nonempty CHECK (
  payload_text IS NULL OR length(payload_text) > 0
);

CREATE UNIQUE INDEX uq_raw_provider_response_quote_request
  ON raw_provider_response(quote_request_id);

CREATE OR REPLACE FUNCTION miqo_guard_raw_provider_response_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_provider text;
BEGIN
  SELECT provider_key INTO target_provider
  FROM quote_request
  WHERE quote_request_id=NEW.quote_request_id;

  IF target_provider='MOCK-PROVIDER-001' AND (
    NEW.payload_text IS NULL
    OR NEW.payload_sha256 IS NULL
    OR NEW.provider_reference IS NULL
    OR NEW.provider_response_at IS NULL
  ) THEN
    RAISE EXCEPTION 'RAW_PROVIDER_CAPTURE_INCOMPLETE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_raw_provider_response_insert
BEFORE INSERT ON raw_provider_response
FOR EACH ROW EXECUTE FUNCTION miqo_guard_raw_provider_response_insert();

CREATE OR REPLACE FUNCTION miqo_guard_raw_provider_response_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'RAW_PROVIDER_RESPONSE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_guard_raw_provider_response_immutable
BEFORE UPDATE OR DELETE ON raw_provider_response
FOR EACH ROW EXECUTE FUNCTION miqo_guard_raw_provider_response_immutable();

COMMIT;
