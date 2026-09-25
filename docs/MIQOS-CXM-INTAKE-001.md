# MIQOS-CXM-INTAKE-001 — Controlled Mailbox Intake Foundation

**Status:** implementation foundation / synthetic-only execution  
**Controlled mailbox:** `miqos.new@gmail.com`  
**Form contract:** `CIRF-1.1`

## Purpose

Convert a structured MIQOS Customer Information Request email into an idempotent customer-intake transaction without treating emailed declarations as verified or locked insurance facts.

## Processing chain

```text
miqos.new@gmail.com
  -> Gmail event adapter (production connection pending)
  -> internal /admin/cxm/intake/email gateway
  -> structured CIRF-1.1 parser + server validation
  -> message/client-submission idempotency
  -> identity-fingerprint deduplication
  -> server-generated MIQOS synthetic customer ID
  -> customer intake persistence
  -> lifecycle status derivation
  -> immutable lifecycle-event records
  -> transactional admin-notification outbox
```

## Current hard boundary

This repository remains `SYNTHETIC / NON-PRODUCTION`. The intake service therefore requires `synthetic=true`, and all new intake tables include database checks that reject non-synthetic records. Real Gmail/customer data must not be posted into this runtime.

The production activation gate must separately provide:

1. an authorised connection for `miqos.new@gmail.com`;
2. a production/customer-data runtime that is not the current synthetic prototype database;
3. approved encryption, retention, access-control and audit configuration;
4. a Gmail event adapter (prefer event-driven delivery rather than mailbox polling);
5. an authenticated internal service principal replacing the synthetic admin header;
6. a Communications Hub worker to drain the notification outbox.

## Deduplication

Three controls are applied in order:

1. Gmail `source_message_id` uniqueness;
2. form `client_submission_id` uniqueness;
3. a SHA-256 identity fingerprint over normalized full name + email + mobile + postcode.

The third control links a repeat intake to the existing customer without silently overwriting the prior intake record. A duplicate submission is preserved and queued for admin review.

## Initial lifecycle status

The first intake is automatically assigned one of:

- `RENEWAL_MONITORING` — renewal/start date more than 35 days away;
- `RENEWAL_WINDOW_OPEN` — date is within the next 35 days;
- `QUOTE_FOLLOW_UP_DUE` — date is today or in the past.

For monitoring records, `next_action_at` is calculated for 09:00 UTC, 35 days before the renewal/start date. A scheduler can later re-evaluate these records without altering locked quotation facts.

## Data separation

The structured intake payload is an acquisition/renewal snapshot only. It is not written into `RiskProfileVersion` or canonical factual fields. The existing facts-versus-choices and profile-lock invariants remain unchanged.

## Admin notification

Notifications use a transactional outbox. The database commit creates a minimal notification payload containing the customer ID, name, renewal/start date, received timestamp and authenticated admin path. Sending occurs only after persistence succeeds.

## Activation blocker

The Gmail connector available during this implementation is authenticated to a different account, not `miqos.new@gmail.com`. The repository foundation is therefore complete independently of mailbox credentials, but live mailbox ingestion must remain disabled until the controlled mailbox itself is authorised.
