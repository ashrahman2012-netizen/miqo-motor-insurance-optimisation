BEGIN;

CREATE TABLE customer_intake_identity (
  dedupe_key text PRIMARY KEY,
  customer_id text NOT NULL UNIQUE REFERENCES customer(customer_id),
  customer_status text NOT NULL,
  renewal_or_future_start_date date NOT NULL,
  next_action_at timestamptz,
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_intake_identity_synthetic_only CHECK (synthetic=true),
  CONSTRAINT customer_intake_identity_dedupe_sha256 CHECK (dedupe_key ~ '^[0-9a-f]{64}$'),
  CONSTRAINT customer_intake_identity_status CHECK (
    customer_status IN ('NEW_INTAKE','RENEWAL_MONITORING','RENEWAL_WINDOW_OPEN','QUOTE_FOLLOW_UP_DUE','MANUAL_REVIEW_REQUIRED')
  )
);

CREATE TABLE customer_intake_submission (
  intake_submission_id text PRIMARY KEY,
  source_mailbox text NOT NULL,
  source_message_id text NOT NULL UNIQUE,
  source_thread_id text,
  customer_id text NOT NULL REFERENCES customer(customer_id),
  dedupe_key text NOT NULL REFERENCES customer_intake_identity(dedupe_key),
  form_version text NOT NULL,
  client_submission_id text NOT NULL UNIQUE,
  subject text NOT NULL,
  payload_sha256 text NOT NULL,
  payload_json jsonb NOT NULL,
  processing_status text NOT NULL,
  synthetic boolean NOT NULL DEFAULT true,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_intake_submission_synthetic_only CHECK (synthetic=true),
  CONSTRAINT customer_intake_submission_controlled_mailbox CHECK (lower(source_mailbox)='miqos.new@gmail.com'),
  CONSTRAINT customer_intake_submission_payload_sha256 CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT customer_intake_submission_status CHECK (processing_status IN ('ACCEPTED','DUPLICATE_MATCHED','MANUAL_REVIEW_REQUIRED'))
);

CREATE INDEX ix_customer_intake_submission_customer ON customer_intake_submission(customer_id,created_at DESC);
CREATE INDEX ix_customer_intake_submission_dedupe ON customer_intake_submission(dedupe_key,created_at DESC);

CREATE TABLE customer_lifecycle_event (
  lifecycle_event_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customer(customer_id),
  intake_submission_id text REFERENCES customer_intake_submission(intake_submission_id),
  event_type text NOT NULL,
  event_payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  synthetic boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_event_synthetic_only CHECK (synthetic=true),
  CONSTRAINT customer_lifecycle_event_type CHECK (
    event_type IN (
      'CUSTOMER_CREATED',
      'CUSTOMER_INFORMATION_REQUEST_RECEIVED',
      'CUSTOMER_MATCHED_EXISTING',
      'CUSTOMER_STATUS_CHANGED',
      'ADMIN_NOTIFICATION_QUEUED'
    )
  )
);

CREATE INDEX ix_customer_lifecycle_event_customer ON customer_lifecycle_event(customer_id,occurred_at);

CREATE TABLE customer_notification_outbox (
  notification_outbox_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customer(customer_id),
  intake_submission_id text NOT NULL REFERENCES customer_intake_submission(intake_submission_id),
  event_type text NOT NULL,
  payload_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  CONSTRAINT customer_notification_outbox_synthetic_only CHECK (synthetic=true),
  CONSTRAINT customer_notification_outbox_status CHECK (status IN ('PENDING','SENT','FAILED','SUPPRESSED'))
);

CREATE INDEX ix_customer_notification_outbox_pending ON customer_notification_outbox(status,created_at);

COMMIT;
