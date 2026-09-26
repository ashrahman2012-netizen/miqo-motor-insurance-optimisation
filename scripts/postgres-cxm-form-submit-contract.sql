\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.customer_form_delivery') IS NULL THEN
    RAISE EXCEPTION 'CXM_FORM_DELIVERY_SCHEMA_MISSING';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='customer_intake_submission' AND column_name='source_channel'
  ) THEN
    RAISE EXCEPTION 'CXM_FORM_SOURCE_CHANNEL_MISSING';
  END IF;
END;
$$;

INSERT INTO customer(customer_id,synthetic)
VALUES('CUS-SYN-CXM-FORM-CONTRACT',true);

INSERT INTO customer_intake_identity(
  dedupe_key,customer_id,customer_status,renewal_or_future_start_date,next_action_at,synthetic
) VALUES(
  repeat('e',64),'CUS-SYN-CXM-FORM-CONTRACT','RENEWAL_MONITORING','2026-12-01','2026-10-27T09:00:00Z',true
);

INSERT INTO customer_intake_submission(
  intake_submission_id,source_channel,source_mailbox,source_message_id,customer_id,dedupe_key,form_version,
  client_submission_id,subject,payload_sha256,payload_json,processing_status,synthetic,received_at
) VALUES(
  'CXM-SYN-FORM-CONTRACT','DIRECT_FORM',NULL,'FORM:SUB-SYN-FORM-CONTRACT','CUS-SYN-CXM-FORM-CONTRACT',repeat('e',64),'CIRF-1.2.2',
  'SUB-SYN-FORM-CONTRACT','[MIQOS NEW CUSTOMER] Synthetic Form',repeat('f',64),'{}'::jsonb,'ACCEPTED',true,now()
);

INSERT INTO customer_form_delivery(
  intake_submission_id,idempotency_key,subject,html_sha256,excel_sha256,pdf_sha256,pdf_generated,
  email_delivery_status,email_provider,email_provider_message_id,email_recipient,delivery_attempts,synthetic
) VALUES(
  'CXM-SYN-FORM-CONTRACT','SUB-SYN-FORM-CONTRACT','[MIQOS NEW CUSTOMER] Synthetic Form',
  repeat('1',64),repeat('2',64),repeat('3',64),true,'SENT','gmail','GMAIL-SYN-FORM-CONTRACT','miqos.new@gmail.com',1,true
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM customer_intake_submission
    WHERE intake_submission_id='CXM-SYN-FORM-CONTRACT'
      AND source_channel='DIRECT_FORM'
      AND source_mailbox IS NULL
  ) THEN
    RAISE EXCEPTION 'CXM_DIRECT_FORM_SOURCE_NOT_PERSISTED';
  END IF;

  BEGIN
    INSERT INTO customer_intake_submission(
      intake_submission_id,source_channel,source_mailbox,source_message_id,customer_id,dedupe_key,form_version,
      client_submission_id,subject,payload_sha256,payload_json,processing_status,synthetic,received_at
    ) VALUES(
      'CXM-SYN-FORM-BAD-MAILBOX','DIRECT_FORM','miqos.new@gmail.com','FORM:BAD','CUS-SYN-CXM-FORM-CONTRACT',repeat('e',64),'CIRF-1.2.2',
      'SUB-SYN-FORM-BAD-MAILBOX','[MIQOS NEW CUSTOMER] Bad',repeat('4',64),'{}'::jsonb,'ACCEPTED',true,now()
    );
    RAISE EXCEPTION 'CXM_DIRECT_FORM_MAILBOX_WAS_NOT_BLOCKED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE customer_form_delivery
       SET synthetic=false
     WHERE intake_submission_id='CXM-SYN-FORM-CONTRACT';
    RAISE EXCEPTION 'CXM_FORM_REAL_DELIVERY_WAS_NOT_BLOCKED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

ROLLBACK;

SELECT 'CXM_FORM_SUBMIT_CONTRACT_PASS' AS result;
