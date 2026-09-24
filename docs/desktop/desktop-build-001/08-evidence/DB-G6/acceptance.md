# DB-G6 acceptance — Observability, Diagnostics & Supportability

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G6 — Observability, Diagnostics & Supportability  
**Result:** PASS  
**Date:** 2026-09-23  
**Entry SHA:** `2751bc19f852c577f7e794495e903b6cbf33610d`  
**Accepted executable source:** `b7c1931aa2e1ef291036ece8eadfa043465d5389`

## Accepted scope

DB-G6 makes the installed Admin application operationally supportable without creating business authority or exporting business payloads.

Accepted implementation includes:

- a per-session opaque Desktop correlation identifier;
- standards-shaped W3C `traceparent` generation for every native API read;
- Fastify validation of incoming trace context;
- a separate Fastify request ID for each server request;
- response correlation headers:
  - `x-miqo-request-id`;
  - `x-miqo-trace-id`;
  - `x-miqo-api-version`;
  - `x-miqo-api-build-id`;
  - `x-miqo-api-source-commit`;
- Desktop fail-closed rejection when a returned trace ID contradicts the outgoing trace ID;
- current-session capture of last trace ID, server request ID, operation and reason code;
- safe API version/build/source identity capture;
- structured native logs carrying stable event/reason codes and correlation identifiers;
- existing bounded log retention: at most five files and seven days;
- System diagnostics for package/build/profile/API/correlation/log metadata;
- explicit redacted support-snapshot generation with schema, support reference, metadata scope and SHA-256 checksum;
- no automatic support snapshot upload, email or filesystem export;
- exact Tauri permission expansion by two native support commands:
  - `get_diagnostics`;
  - `create_support_snapshot`.

## Redaction and data boundary

The support snapshot is constructed from the fixed `DesktopDiagnostics` metadata struct. It does not read or embed log-file contents, profile/customer payloads, raw provider payloads, database/private-key material, memory dumps, bearer tokens or refresh tokens.

The snapshot explicitly declares excluded categories:

- `TOKENS_AND_CREDENTIALS`;
- `RAW_PROVIDER_PAYLOADS`;
- `PROFILE_AND_CUSTOMER_PAYLOADS`;
- `DATABASE_AND_PRIVATE_KEYS`;
- `MEMORY_DUMPS`.

The operational log proof also asserts absence of `Bearer ` and `refresh_token`.

## API boundary

DB-G6 changes the Fastify server boundary only to add correlation logging and safe response metadata. No business endpoint, request payload, response business body, domain method, database schema or mutation authority is added or changed.

Incoming trace context is accepted only when it matches the supported W3C shape and non-zero hex requirements; otherwise the API creates its own trace ID from its independent request ID.

API identity values are bounded operational values:

- semantic service version;
- CI/build ID;
- source commit.

They do not include configuration secrets or environment-variable dumps.

## Repair history

1. `4bb1b6ba68fae69ffa102f0675f46adba289ee0e` — initial safe diagnostics/correlation implementation. Repository CI passed; Windows workflows were superseded/cancelled by the repair push.
2. `76228263892a751cfa9eda3f069f1bafb3ed0d7b` — repaired support-snapshot construction by directly constructing the typed native snapshot rather than deserialising it from an intermediate JSON value. Repository CI and G8 API integration passed; Windows G7/G8 then stopped at `cargo fmt --check`.
3. `b7c1931aa2e1ef291036ece8eadfa043465d5389` — formatter-prescribed Rust layout repair only; complete validation chain passes.

No repair broadens data, network, filesystem, mutation, identity or environment authority.

## Exact executable delta

`2751bc19f852c577f7e794495e903b6cbf33610d` → `b7c1931aa2e1ef291036ece8eadfa043465d5389` is three commits ahead / zero behind.

Executable changes are confined to:

```text
apps/admin-desktop/src-tauri/build.rs
apps/admin-desktop/src-tauri/capabilities/admin-read.json
apps/admin-desktop/src-tauri/src/lib.rs
apps/admin-desktop/src/app/DesktopApp.tsx
apps/admin-desktop/src/routes/SystemRoute.tsx
apps/admin-desktop/src/services/contracts.ts
apps/admin-desktop/src/services/tauri-transport.ts
apps/admin-desktop/src/styles.css
apps/admin-desktop/test/api-integration.test.ts
apps/api/src/server.ts
scripts/desktop-g8-proof.ps1
```

Plus DB-G6 documentation under `docs/desktop/desktop-build-001/**`.

No database migration, shared package implementation, dependency version, lockfile or workflow file change.

## Exact-source proof

Accepted executable source `b7c1931aa2e1ef291036ece8eadfa043465d5389` is green under:

- push `ci` #711 / run `35870996132` — SUCCESS
  - locked-dependencies `107214740181`
  - postgres-contract `107214740660`
  - target-stack-sprint1 `107214740877`
- PR `ci` #712 / run `35871004256` — SUCCESS
  - locked-dependencies `107214765077`
  - target-stack-sprint1 `107214765417`
  - postgres-contract `107214765698`
- Desktop G7 #231 / run `35871004371` — SUCCESS
  - Windows Desktop preflight/full `107214767210`
  - artifact `10754979411`
  - digest `sha256:6051a1012767dfd4c14d95660fb0400dc502f760eae57e06d7586f0058610d35`
- Desktop G8 #51 / run `35871004186` — SUCCESS
  - Windows installed Desktop skeleton proof `107214765126`
  - Desktop service / certified API integration `107214765489`
  - Windows artifact `10755124109`, digest `sha256:d6d772e67a7e254e389de34a8c4739c5448b03f5c5a309a979450faf8bee1f85`
  - API artifact `10754602129`, digest `sha256:76c2945a256895039eb04da252d9de7dede5335afaeeefe11ef64e308d992002`

The Windows PR proof uses synthetic merge SHA `6631fa04fd7a32c449100b378eb04aef0424ff52` paired with exact branch head `b7c1931aa2e1ef291036ece8eadfa043465d5389`.

## Proof strength and residual hardening

G8 proves the exact eight-command Tauri capability, installed package lifecycle, structured log presence, and absence of bearer/refresh-token material. API integration explicitly proves trace/request correlation and safe API build/source headers.

The installed G8 UI proof does not directly click the System-route “Generate redacted support snapshot” action. This is recorded as a bounded hardening item for DB-G10 rather than a DB-G6 blocker because:

- the native support command is exactly permissioned;
- the command is compiled and packaged;
- snapshot content is constructed from a closed typed metadata struct;
- there is no filesystem/upload capability;
- no sensitive payload/log content enters the snapshot construction path.

## Change-control disposition

**CC-G6-001 = CLOSED BY DB-G6.**

Validated trace context, independent server request ID and safe API build/source identity are now implemented and proven for the current TEST/SYNTHETIC stack.

This closure does not close CC-G3-001 or CC-G5-001 and does not certify production identity, non-synthetic environments or production telemetry.

## Boundary review

| Question | Result |
|---|---|
| Business/domain semantics changed? | No |
| Business endpoint added? | No |
| Admin mutation introduced? | No |
| Direct DB access introduced? | No |
| Raw business payload logged into native operational logs? | No |
| Raw business payload included in support snapshot? | No |
| Token/credential field included in support snapshot? | No |
| Automatic upload/export introduced? | No |
| Generic filesystem/shell/network permission introduced? | No |
| Production identity/environment activated? | No |
| Ranking/comparability/recommendation/integrity computation introduced? | No |
| Dependency/workflow authority changed? | No |

## Exit

**DB-G6 = PASS.**

DB-G7 — Identity, Authentication & Authorisation remains **NOT STARTED** and requires a separate controlled execution step.

DB-G6 does not certify real IdP integration, API bearer validation/RBAC, non-synthetic environments, production signing, provider activation, production release or go-live.
