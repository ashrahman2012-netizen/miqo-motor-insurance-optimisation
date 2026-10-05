\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.acquisition_handoff_receipt') IS NULL THEN
    RAISE EXCEPTION 'LG_G7_HANDOFF_RECEIPT_SCHEMA_MISSING';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='acquisition_handoff_receipt'
       AND column_name IN (
         'email','telephone','phone','name','date_of_birth','vehicle_registration',
         'risk_profile_version_id','profile_id','quotation_amount','premium'
       )
  ) THEN
    RAISE EXCEPTION 'LG_G7_HANDOFF_RECEIPT_CONTAINS_PROHIBITED_FIELDS';
  END IF;
END;
$$;

INSERT INTO acquisition_handoff_receipt(
  handoff_id,contract_version,accepted_client_id,acceptance_event_id,accepted_at,
  acquisition_lead_id,campaign_id,source,permission_basis,lifecycle_state,
  contact_preference,request_fingerprint,request_json,outcome,
  receiver_reference,audit_reference,received_at,synthetic
) VALUES(
  'LGG7-SYN-CONTRACT-001','lg-g7-handoff.v1','ACQ-CLIENT-SYN-CONTRACT-001',
  'CLIENT-ACCEPTED-SYN-CONTRACT-001','2026-10-05T19:30:00Z',
  'LEAD-SYN-CONTRACT-001','CAMPAIGN-SYN-CONTRACT-001','contract:synthetic',
  'TEST_SYNTHETIC','ACCEPTED_CLIENT',NULL,repeat('a',64),
  '{"contractVersion":"lg-g7-handoff.v1","permissionBasis":"TEST_SYNTHETIC"}'::jsonb,
  'ACCEPTED','MIQOS-RCV-SYN-CONTRACT-001','MIQOS-AUD-SYN-CONTRACT-001',
  '2026-10-05T19:31:00Z',true
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM acquisition_handoff_receipt
     WHERE handoff_id='LGG7-SYN-CONTRACT-001'
       AND contract_version='lg-g7-handoff.v1'
       AND permission_basis='TEST_SYNTHETIC'
       AND lifecycle_state='ACCEPTED_CLIENT'
       AND outcome='ACCEPTED'
       AND synthetic=true
  ) THEN
    RAISE EXCEPTION 'LG_G7_SYNTHETIC_RECEIPT_NOT_PERSISTED';
  END IF;

  BEGIN
    UPDATE acquisition_handoff_receipt
       SET permission_basis='CONSENT'
     WHERE handoff_id='LGG7-SYN-CONTRACT-001';
    RAISE EXCEPTION 'LG_G7_REAL_PERMISSION_BASIS_WAS_NOT_BLOCKED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE acquisition_handoff_receipt
       SET synthetic=false
     WHERE handoff_id='LGG7-SYN-CONTRACT-001';
    RAISE EXCEPTION 'LG_G7_REAL_DATA_WAS_NOT_BLOCKED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

ROLLBACK;

SELECT 'LG_G7_HANDOFF_RECEIVER_CONTRACT_PASS' AS result;
