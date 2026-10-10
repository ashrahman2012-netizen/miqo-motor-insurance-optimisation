# MIQOS-CXM-INTAKE-002 — Gmail Event Adapter & Mailbox Activation

**Status:** mailbox connected / adapter implemented / real-data gate closed  
**Controlled mailbox:** `miqos.new@gmail.com`  
**Gmail profile name:** `MIQOS`  
**Form contract:** `CIRF-1.1`

## Activation evidence

On 2026-09-25 the Gmail connector was verified against the dedicated MIQOS mailbox:

- account: `miqos.new@gmail.com`
- profile: `MIQOS`
- personal Gmail remains a separate linked account
- the intake workflow must always target the MIQOS account explicitly

The following mailbox labels were created:

- `MIQOS/Intake/Pending`
- `MIQOS/Intake/Processed`
- `MIQOS/Intake/Duplicate`
- `MIQOS/Intake/Manual Review`
- `MIQOS/Intake/Rejected`

At activation there were no messages matching the structured intake subject prefix `[MIQOS NEW CUSTOMER]`; therefore no customer email was read or processed into MIQOS.

## Event adapter

The application exposes the synthetic-gated endpoint:

```text
POST /admin/cxm/intake/gmail-event
```

The bridge envelope is provider-neutral enough to keep Gmail credentials outside the API runtime:

```json
{
  "provider": "gmail",
  "eventId": "provider-event-id",
  "mailbox": "miqos.new@gmail.com",
  "synthetic": true,
  "message": {
    "id": "gmail-message-id",
    "threadId": "gmail-thread-id",
    "receivedAt": "2026-09-25T20:00:00Z",
    "subject": "[MIQOS NEW CUSTOMER] ...",
    "body": "CIRF-1.1 structured body"
  }
}
```

The adapter validates the event and delegates persistence to the certified intake service. It does not contain Gmail OAuth tokens, ChatGPT connector IDs or provider secrets.

## Commit-before-label rule

The bridge MUST apply Gmail processing labels only after the API returns a successful acknowledgement.

Expected outcome mapping:

| API disposition | Gmail label |
|---|---|
| `PROCESSED` | `MIQOS/Intake/Processed` |
| `DUPLICATE` | `MIQOS/Intake/Duplicate` |
| malformed customer form | `MIQOS/Intake/Rejected` |
| mailbox/source/boundary exception | `MIQOS/Intake/Manual Review` |

The bridge should leave the original message intact. Deletion is not part of intake processing.

## Delivery mechanism

The available ChatGPT Gmail connector exposes mailbox read/write actions but no Gmail push/watch or webhook registration primitive. Production delivery must therefore be implemented in the deployment layer, for example with an authorised Gmail event bridge, and not by embedding ChatGPT connector credentials in MIQOS.

Polling may be used only as an explicitly approved fallback; it is not the preferred production architecture.

## Production boundary

This repository remains synthetic-only. The Gmail adapter currently accepts `synthetic=true` test events and the underlying service/database reject real-customer mode. Connecting the mailbox does **not** authorise storage of real customer data in the prototype database.

Production activation still requires:

1. a separately approved real-customer data store/runtime;
2. service-to-service authentication for the Gmail event bridge;
3. encryption, retention and access controls appropriate for customer data;
4. production notification-outbox worker;
5. operational monitoring and dead-letter/manual-review handling;
6. formal removal/replacement of the synthetic-only database checks in a production migration, not an ad-hoc override.

## Current readiness

```text
MAILBOX CONNECTION                PASS
MAILBOX IDENTITY                 PASS
MAILBOX PROCESSING LABELS        PASS
STRUCTURED SUBJECT MATCH         READY
GMAIL EVENT ADAPTER              IMPLEMENTED
DEDUPE + CUSTOMER ID             IMPLEMENTED
LIFECYCLE PROGRESSION            IMPLEMENTED
ADMIN NOTIFICATION OUTBOX        IMPLEMENTED
SYNTHETIC CI                     REQUIRED / AUTOMATED
LIVE EVENT DELIVERY              DEPLOYMENT DEPENDENCY
REAL CUSTOMER DATA STORE         NOT AUTHORISED
LIVE CUSTOMER PROCESSING         BLOCKED
```
