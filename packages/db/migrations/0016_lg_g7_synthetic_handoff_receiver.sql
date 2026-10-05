BEGIN;

CREATE TABLE acquisition_handoff_receipt (
  handoff_id text PRIMARY KEY,
  contract_version text NOT NULL,
  accepted_client_id text NOT NULL,
  acceptance_event_id text NOT NULL,
  accepted_at timestamptz NOT NULL,
  acquisition_lead_id text NOT NULL,
  campaign_id text NOT NULL,
  source text NOT NULL,
  permission_basis text NOT NULL,
  lifecycle_state text NOT NULL,
  contact_preference text,
  request_fingerprint text NOT NULL,
  request_json jsonb NOT NULL,
  outcome text NOT NULL,
  receiver_reference text NOT NULL UNIQUE,
  audit_reference text NOT NULL UNIQUE,
  received_at timestamptz NOT NULL,
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_handoff_contract_version CHECK (contract_version='lg-g7-handoff.v1'),
  CONSTRAINT acquisition_handoff_permission_basis CHECK (permission_basis='TEST_SYNTHETIC'),
  CONSTRAINT acquisition_handoff_lifecycle_state CHECK (lifecycle_state='ACCEPTED_CLIENT'),
  CONSTRAINT acquisition_handoff_outcome CHECK (outcome='ACCEPTED'),
  CONSTRAINT acquisition_handoff_fingerprint_sha256 CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT acquisition_handoff_synthetic_only CHECK (synthetic=true),
  CONSTRAINT acquisition_handoff_nonempty_refs CHECK (
    length(handoff_id)>0
    AND length(accepted_client_id)>0
    AND length(acceptance_event_id)>0
    AND length(acquisition_lead_id)>0
    AND length(campaign_id)>0
    AND length(source)>0
    AND length(receiver_reference)>0
    AND length(audit_reference)>0
    AND (contact_preference IS NULL OR length(contact_preference)>0)
  )
);

CREATE INDEX ix_acquisition_handoff_receipt_acceptance_event
  ON acquisition_handoff_receipt(acceptance_event_id);

CREATE INDEX ix_acquisition_handoff_receipt_lead
  ON acquisition_handoff_receipt(acquisition_lead_id,received_at DESC);

COMMIT;
