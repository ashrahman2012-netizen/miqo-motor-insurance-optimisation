\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.customer_intake_identity') IS NULL
     OR to_regclass('public.customer_intake_submission') IS NULL
     OR to_regclass('public.customer_lifecycle_event') IS NULL
     OR to_regclass('public.customer_notification_outbox') IS NULL THEN
    RAISE EXCEPTION 'CXM_INTAKE_SCHEMA_MISSING';
  END IF;
END;
$$;

INSERT INTO customer(customer_id,synthetic)
VALUES('CUS-SYN-CXM-CONTRACT',true);

INSERT INTO customer_intake_identity(
  dedupe_key,customer_id,customer_status,renewal_or_future_start_date,next_action_at,synthetic
) VALUES(
  repeat('a',64),'CUS-SYN-CXM-CONTRACT','RENEWAL_MONITORING','2026-12-01','2026-10-27T09:00:00Z',true
);

INSERT INTO customer_intake_submission(
  intake_submission_id,source_mailbox,source_message_id,customer_id,dedupe_key,form_version,
  client_submission_id,subject,payload_sha256,payload_json,processing_status,synthetic,received_at
) VALUES(
  'CXM-SYN-SUB-CONTRACT','miqos.new@gmail.com','GMAIL-SYN-CONTRACT','CUS-SYN-CXM-CONTRACT',repeat('a',64),'CIRF-1.1',
  'SUB-SYN-CONTRACT','[MIQOS NEW CUSTOMER] Synthetic','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','{}'::jsonb,'ACCEPTED',true,'2026-09-25T20:00:00Z'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO customer_intake_submission(
      intake_submission_id,source_mailbox,source_message_id,customer_id,dedupe_key,form_version,
      client_submission_id,subject,payload_sha256,payload_json,processing_status,synthetic,received_at
    ) VALUES(
      'CXM-REAL-BLOCK','miqos.new@gmail.com','GMAIL-REAL-BLOCK','CUS-SYN-CXM-CONTRACT',repeat('a',64),'CIRF-1.1',
      'SUB-REAL-BLOCK','[MIQOS NEW CUSTOMER] Blocked',repeat('c',64),'{}'::jsonb,'ACCEPTED',false,now()
    );
    RAISE EXCEPTION 'CXM_REAL_DATA_WAS_NOT_BLOCKED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO customer_intake_submission(
      intake_submission_id,source_mailbox,source_message_id,customer_id,dedupe_key,form_version,
      client_submission_id,subject,payload_sha256,payload_json,processing_status,synthetic,received_at
    ) VALUES(
      'CXM-WRONG-MAILBOX','wrong@example.com','GMAIL-WRONG-MAILBOX','CUS-SYN-CXM-CONTRACT',repeat('a',64),'CIRF-1.1',
      'SUB-WRONG-MAILBOX','[MIQOS NEW CUSTOMER] Blocked',repeat('d',64),'{}'::jsonb,'ACCEPTED',true,now()
    );
    RAISE EXCEPTION 'CXM_WRONG_MAILBOX_WAS_NOT_BLOCKED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

ROLLBACK;

SELECT 'CXM_INTAKE_CONTRACT_PASS' AS result;
