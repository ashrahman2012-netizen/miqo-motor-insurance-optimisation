# MIQOS LG-G7 — Synthetic Acquisition Handoff Receiver

**Status:** implementation / synthetic-only certification  
**Endpoint:** `POST /acquisition/handoffs`  
**Request contract:** `lg-g7-handoff.v1`  
**Response contract:** `lg-g7-handoff-response.v1`

## Purpose

Provide the minimum MIQOS-side boundary required to receive the approved acquisition handoff contract without creating quotation-profile facts or weakening the existing synthetic-only core boundary.

This receiver is deliberately separate from:
- `POST /profiles`;
- controlled Gmail customer intake;
- CIRF direct-form submission;
- quotation, scenario and provider execution surfaces.

## Runtime boundary

The current implementation accepts only:

`permissionBasis=TEST_SYNTHETIC`

Any other permission basis is rejected with:

`HANDOFF_REAL_DATA_GATE_CLOSED`

The core process remains subject to the existing startup invariant:

- `MIQO_DATA_CLASSIFICATION=SYNTHETIC`;
- `MIQO_LIVE_PROVIDERS_ENABLED=false`.

No production/customer-data activation is authorised by this change.

## Authentication

The synthetic receiver uses a dedicated service-to-service header:

`X-MIQO-Synthetic-Handoff`

The corresponding server-side value is supplied only through:

`MIQO_SYNTHETIC_HANDOFF_KEY`

The route fails closed when the key is not configured and rejects requests with a missing or incorrect key.

This credential is intentionally separate from Brevo credentials, Cloudflare journey-token secrets, browser/customer authentication and database credentials.

## Persistence

Migration:

`0016_lg_g7_synthetic_handoff_receiver.sql`

Boundary-owned table:

`acquisition_handoff_receipt`

The table stores only the approved handoff metadata, request fingerprint, stable receiver/audit references and receipt timestamp.

It has no foreign key to:
- `customer`;
- `profile`;
- `risk_profile_version`;
- `canonical_field_value`;
- quotation or scenario state.

Receiver acceptance therefore means only that MIQOS accepted the acquisition contract at its receiving boundary.

## Idempotency

`handoffId` is the idempotency identity.

For an existing `handoffId`:
- equivalent canonical request fingerprint -> return the original response;
- different fingerprint -> `HANDOFF_IDEMPOTENCY_CONFLICT`;
- no second boundary record is created.

The first valid response persists:
- `outcome=ACCEPTED`;
- a stable `receiverReference`;
- a stable `auditReference`;
- the receiver timestamp.

## Exact payload boundary

The HTTP schema rejects undeclared request fields.

The v1 receiver does not accept:
- name;
- email;
- telephone;
- address;
- date of birth;
- vehicle or licence facts;
- policy facts;
- claims or convictions;
- insurer/provider data;
- quotations or premiums;
- payment data;
- risk-profile or scenario state.

The contract schemas are mirrored in `contracts/` so the receiver branch remains self-contained.

## Certification

Automated PostgreSQL/API coverage proves:
- synthetic-only database constraints;
- exact request schema;
- dedicated receiver authentication;
- successful first receipt;
- stable idempotent replay;
- conflicting replay rejection;
- persisted request fingerprint;
- persisted receiver/audit references;
- real-data permission bases blocked;
- undeclared customer fields rejected before persistence;
- no profile, risk-profile-version or canonical fact creation;
- existing core CI continues to run against the stacked branch.

## Stacked-branch relationship

This branch is based on `miqos/cxm-intake-001` because that branch already establishes the synthetic customer-boundary seam.

LG-G7 remains a separate receiving contract and does not route handoffs through the CIRF mailbox or direct-form endpoints.

Merging or deploying this receiver does not activate acquisition transport. A controlled end-to-end handoff remains a separate LG-G7 certification step.
