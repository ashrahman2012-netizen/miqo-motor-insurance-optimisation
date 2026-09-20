BEGIN;

CREATE TABLE sp6_provider_candidate_control (
  provider_candidate_id text PRIMARY KEY,
  provider_key text NOT NULL,
  counterparty_reference text NOT NULL,
  channel text NOT NULL,
  target_environment text NOT NULL,
  proposed_route_key text NOT NULL UNIQUE,
  technical_documentation_reference text NOT NULL,
  contractual_authority_status text NOT NULL,
  permitted_test_data_class text NOT NULL,
  evidence_class text NOT NULL,
  candidate_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sp6_provider_candidate_channel CHECK (
    channel IN ('DIRECT_INSURER','AUTHORISED_INTERMEDIARY')
  ),
  CONSTRAINT sp6_provider_candidate_environment CHECK (
    target_environment IN ('CERTIFICATION','PRODUCTION')
  ),
  CONSTRAINT sp6_provider_candidate_contract_status CHECK (
    contractual_authority_status IN ('PENDING','APPROVED')
  ),
  CONSTRAINT sp6_provider_candidate_test_data CHECK (
    permitted_test_data_class IN ('SYNTHETIC','CERTIFICATION_DATA')
  ),
  CONSTRAINT sp6_provider_candidate_evidence_class CHECK (
    evidence_class IN ('EXTERNAL_PROVIDER','TEST_FIXTURE')
  ),
  CONSTRAINT sp6_provider_candidate_status CHECK (
    candidate_status IN ('DRAFT','APPROVED_FOR_CERTIFICATION')
  )
);

CREATE TABLE sp6_provider_certification_contract (
  provider_certification_contract_id text PRIMARY KEY,
  provider_candidate_id text NOT NULL REFERENCES sp6_provider_candidate_control(provider_candidate_id),
  model_version text NOT NULL,
  adapter_version text NOT NULL,
  mapping_version text NOT NULL,
  request_schema_version text NOT NULL,
  response_schema_version text NOT NULL,
  mapping_fingerprint text NOT NULL,
  schema_fingerprint text NOT NULL,
  contract_fingerprint text NOT NULL UNIQUE,
  certification_state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sp6_provider_cert_model_version CHECK (
    model_version='sp6-provider-certification-v1'
  ),
  CONSTRAINT sp6_provider_cert_state CHECK (
    certification_state IN ('DRAFT','READY_FOR_PROVIDER_CERTIFICATION','CERTIFIED')
  ),
  CONSTRAINT sp6_provider_cert_mapping_fingerprint CHECK (
    mapping_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT sp6_provider_cert_schema_fingerprint CHECK (
    schema_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT sp6_provider_cert_contract_fingerprint CHECK (
    contract_fingerprint ~ '^[0-9a-f]{64}$'
  )
);

CREATE TABLE sp6_provider_certification_evidence (
  provider_certification_evidence_id text PRIMARY KEY,
  provider_certification_contract_id text NOT NULL REFERENCES sp6_provider_certification_contract(provider_certification_contract_id),
  evidence_class text NOT NULL,
  certification_request_id text NOT NULL,
  provider_reference text NOT NULL,
  raw_response_hash text NOT NULL,
  normalisation_fingerprint text NOT NULL,
  recommendation_fingerprint text NOT NULL,
  evidence_fingerprint text NOT NULL UNIQUE,
  raw_response_json jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sp6_provider_cert_evidence_class CHECK (
    evidence_class IN ('EXTERNAL_PROVIDER','TEST_FIXTURE')
  ),
  CONSTRAINT sp6_provider_cert_raw_hash CHECK (
    raw_response_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT sp6_provider_cert_normalisation_fingerprint CHECK (
    normalisation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT sp6_provider_cert_recommendation_fingerprint CHECK (
    recommendation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT sp6_provider_cert_evidence_fingerprint CHECK (
    evidence_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT uq_sp6_provider_cert_request UNIQUE (
    provider_certification_contract_id,certification_request_id
  )
);

CREATE OR REPLACE FUNCTION miqo_guard_sp6_provider_candidate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.candidate_status='APPROVED_FOR_CERTIFICATION'
     AND NEW.evidence_class<>'EXTERNAL_PROVIDER' THEN
    RAISE EXCEPTION 'SP6_PROVIDER_CANDIDATE_EXTERNAL_EVIDENCE_REQUIRED';
  END IF;
  IF NEW.candidate_status='APPROVED_FOR_CERTIFICATION'
     AND NEW.target_environment<>'CERTIFICATION' THEN
    RAISE EXCEPTION 'SP6_PROVIDER_CANDIDATE_CERTIFICATION_ENVIRONMENT_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_sp6_provider_candidate
BEFORE INSERT ON sp6_provider_candidate_control
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp6_provider_candidate();

CREATE OR REPLACE FUNCTION miqo_guard_sp6_provider_certification_contract()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  candidate_evidence_class text;
  candidate_status text;
  candidate_environment text;
BEGIN
  SELECT evidence_class,candidate_status,target_environment
    INTO candidate_evidence_class,candidate_status,candidate_environment
  FROM sp6_provider_candidate_control
  WHERE provider_candidate_id=NEW.provider_candidate_id;

  IF candidate_evidence_class IS NULL THEN
    RAISE EXCEPTION 'SP6_PROVIDER_CANDIDATE_NOT_FOUND';
  END IF;

  IF NEW.certification_state<>'DRAFT' THEN
    IF candidate_evidence_class<>'EXTERNAL_PROVIDER'
       OR candidate_status<>'APPROVED_FOR_CERTIFICATION'
       OR candidate_environment<>'CERTIFICATION' THEN
      RAISE EXCEPTION 'SP6_PROVIDER_CERTIFICATION_EXTERNAL_CANDIDATE_REQUIRED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_sp6_provider_certification_contract
BEFORE INSERT ON sp6_provider_certification_contract
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp6_provider_certification_contract();

CREATE OR REPLACE FUNCTION miqo_guard_sp6_provider_certification_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  contract_state text;
BEGIN
  SELECT certification_state INTO contract_state
  FROM sp6_provider_certification_contract
  WHERE provider_certification_contract_id=NEW.provider_certification_contract_id;

  IF contract_state IS NULL THEN
    RAISE EXCEPTION 'SP6_PROVIDER_CERTIFICATION_CONTRACT_NOT_FOUND';
  END IF;

  IF NEW.evidence_class='EXTERNAL_PROVIDER'
     AND contract_state NOT IN ('READY_FOR_PROVIDER_CERTIFICATION','CERTIFIED') THEN
    RAISE EXCEPTION 'SP6_EXTERNAL_PROVIDER_EVIDENCE_REQUIRES_READY_CONTRACT';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_sp6_provider_certification_evidence
BEFORE INSERT ON sp6_provider_certification_evidence
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp6_provider_certification_evidence();

CREATE OR REPLACE FUNCTION miqo_guard_sp6_provider_certification_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SP6_PROVIDER_CERTIFICATION_EVIDENCE_IMMUTABLE';
END;
$$;

CREATE TRIGGER trg_sp6_provider_candidate_immutable
BEFORE UPDATE OR DELETE ON sp6_provider_candidate_control
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp6_provider_certification_immutable();

CREATE TRIGGER trg_sp6_provider_cert_contract_immutable
BEFORE UPDATE OR DELETE ON sp6_provider_certification_contract
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp6_provider_certification_immutable();

CREATE TRIGGER trg_sp6_provider_cert_evidence_immutable
BEFORE UPDATE OR DELETE ON sp6_provider_certification_evidence
FOR EACH ROW EXECUTE FUNCTION miqo_guard_sp6_provider_certification_immutable();

COMMIT;
