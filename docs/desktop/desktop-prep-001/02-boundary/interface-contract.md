# MIQOS Desktop Interface Contract v1.0

**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G2  
**Status:** FROZEN AT G2

## 1. Interface direction

```text
Desktop React UI
    ↓
Desktop application services / API client
    ↓
HTTP(S)
    ↓
Fastify API
    ↓
authoritative services/domain
    ↓
PostgreSQL
```

The Desktop renderer never talks directly to PostgreSQL.

## 2. Approved initial Admin read contract

| Purpose | Method/resource | Authority |
|---|---|---|
| Health/environment preflight | `GET /health` | API runtime |
| Profile/case inspection | `GET /admin/profiles/:profileId` | profile/audit/discrepancy services |
| Exact profile-version inspection | `GET /admin/profile-versions/:versionId` | profile service |
| Audit timeline | `GET /admin/audit?profileId=...` | append-only audit service |
| Selection lineage | `GET /admin/selections/:selectionId/trace` | trace service |
| Sprint 4 complete lineage | `GET /admin/selections/:selectionId/sp4-trace` | Sprint 4 admin trace service |
| Raw response for selected quote evidence | `GET /quote-requests/:quoteRequestId/raw-response` | provider-response evidence |
| Profile discrepancies | `GET /profiles/:profileId/discrepancies` | discrepancy evidence |

The last two are non-admin-prefixed resources already consumed by the certified Admin Audit & Trace loader. G2 permits them for **read-only evidence composition only**.

## 3. Shared contract/adapters

Desktop application services pass API DTOs to:

- `@miqo/application-adapters`;
- `@miqo/application-contracts`.

For the current Audit/Trace proof:

```text
API evidence
  ↓
composeAdminAuditTracePageVM(...)
  ↓
AdminAuditTracePageVM
  ↓
Desktop presentation
```

The adapter does not fetch, persist or authorise.

## 4. Error contract

Desktop must preserve existing backend outcome classes.

| HTTP/backend condition | Desktop interpretation |
|---|---|
| success | render authoritative ViewModel |
| 404/absent evidence | EMPTY or explicit not-found state |
| 409 conflict/domain guard | BLOCKED |
| 422 validation | BLOCKED with authoritative reason |
| unknown environment | NOT_AUTHORISED / fail closed |
| network/server failure | ERROR |
| partial composed evidence | PARTIAL; do not infer missing facts |

Client code must not upgrade:

- BLOCKED → AVAILABLE;
- EXCLUDED → ELIGIBLE;
- NOT_COMPARABLE → DIRECTLY_COMPARABLE;
- unknown/missing → successful/zero/default;
- missing integrity evidence → PASS.

## 5. Version compatibility

Until a formal API versioning scheme exists, Desktop compatibility is pinned by:

- repository/application contract version;
- exact build revision;
- shared ViewModel contract tests;
- G8 representative integration proof.

A future independent API deployment cadence should introduce an explicit API compatibility/version contract rather than relying permanently on same-repository coordination.

## 6. Network and origin boundary

Current Fastify CORS permits the customer/admin web origins only.

Tauri Desktop transport therefore requires an explicit origin/network decision under G3/G5. G2 does **not** authorise:

- wildcard CORS;
- disabling origin checks;
- a generic privileged native HTTP proxy;
- remote UI content.

Any required CORS/connect policy change must remain least privilege and environment-specific.

## 7. Offline behaviour

The initial Desktop application is **online-required for authoritative MIQOS data**.

Permitted offline behaviour:

- launch shell;
- show build/runtime identity;
- show a controlled disconnected/error state;
- access non-sensitive packaged help/support information if later supplied.

Not permitted offline:

- authoritative profile editing;
- generating local recommendation/integrity outcomes;
- treating cached data as current authoritative state;
- queuing hidden domain mutations for later replay without a separately designed command/idempotency contract.

## 8. Retry boundary

Automatic retry is allowed only for safe/idempotent reads under G5/G6 policy.

Mutation retries are not authorised by G2 because there is no Desktop admin mutation contract yet.

## 9. Interface expansion rule

New Desktop API consumption must identify:

1. resource;
2. method;
3. authority owner;
4. read versus mutation;
5. authentication/authorisation requirement;
6. audit requirement;
7. idempotency/retry semantics;
8. ViewModel mapping;
9. failure-state mapping.

No endpoint is considered Desktop-authorised merely because it exists in `apps/api`.
