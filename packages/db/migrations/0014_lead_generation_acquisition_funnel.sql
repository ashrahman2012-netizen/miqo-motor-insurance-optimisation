BEGIN;

CREATE TABLE lead_campaign (
  campaign_id text PRIMARY KEY,
  campaign_name text NOT NULL,
  template_version text NOT NULL,
  sender_domain text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_campaign_status_allowed CHECK (status IN ('DRAFT','READY','PAUSED','CLOSED')),
  CONSTRAINT lead_campaign_synthetic_only CHECK (synthetic = true)
);

CREATE TABLE lead_record (
  lead_id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES lead_campaign(campaign_id),
  journey_token text NOT NULL UNIQUE,
  permission_basis text NOT NULL DEFAULT 'TEST_SYNTHETIC',
  state text NOT NULL DEFAULT 'CREATED',
  renewal_window text,
  contact_preference text,
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_record_permission_basis_allowed CHECK (permission_basis IN ('CONSENT','SOFT_OPT_IN','CORPORATE_B2B','TEST_SYNTHETIC')),
  CONSTRAINT lead_record_state_allowed CHECK (state IN ('CREATED','YES','QUALIFIED','SUPPRESSED')),
  CONSTRAINT lead_record_synthetic_only CHECK (synthetic = true)
);

CREATE TABLE lead_event (
  lead_event_id text PRIMARY KEY,
  lead_id text NOT NULL REFERENCES lead_record(lead_id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_record_campaign ON lead_record(campaign_id);
CREATE INDEX idx_lead_event_lead_time ON lead_event(lead_id, occurred_at);

COMMIT;
