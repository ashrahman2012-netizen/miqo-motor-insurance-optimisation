BEGIN;

ALTER TABLE customer_intake_submission
  ADD COLUMN source_channel text NOT NULL DEFAULT 'CONTROLLED_MAILBOX';

ALTER TABLE customer_intake_submission ALTER COLUMN source_mailbox DROP NOT NULL;
ALTER TABLE customer_intake_submission DROP CONSTRAINT customer_intake_submission_controlled_mailbox;
ALTER TABLE customer_intake_submission
  ADD CONSTRAINT customer_intake_submission_source_channel CHECK (
    (source_channel='CONTROLLED_MAILBOX' AND lower(source_mailbox)='miqos.new@gmail.com') OR
    (source_channel='DIRECT_FORM' AND source_mailbox IS NULL)
  );

CREATE TABLE customer_form_delivery (
  intake_submission_id text PRIMARY KEY REFERENCES customer_intake_submission(intake_submission_id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_sha256 text NOT NULL,
  excel_sha256 text NOT NULL,
  pdf_sha256 text,
  pdf_generated boolean NOT NULL DEFAULT false,
  email_delivery_status text NOT NULL DEFAULT 'PENDING',
  email_provider text,
  email_provider_message_id text,
  email_recipient text NOT NULL DEFAULT 'miqos.new@gmail.com',
  delivery_attempts integer NOT NULL DEFAULT 0,
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  CONSTRAINT customer_form_delivery_synthetic_only CHECK (synthetic=true),
  CONSTRAINT customer_form_delivery_hashes CHECK (
    html_sha256 ~ '^[0-9a-f]{64}$' AND
    excel_sha256 ~ '^[0-9a-f]{64}$' AND
    (pdf_sha256 IS NULL OR pdf_sha256 ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT customer_form_delivery_status CHECK (email_delivery_status IN ('PENDING','SENT','FAILED')),
  CONSTRAINT customer_form_delivery_attempts_non_negative CHECK (delivery_attempts >= 0)
);

CREATE INDEX ix_customer_form_delivery_status ON customer_form_delivery(email_delivery_status,created_at);

COMMIT;
