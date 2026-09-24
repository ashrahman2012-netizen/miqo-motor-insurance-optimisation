# DB-G4 acceptance — Core Admin Evidence Surfaces

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G4 — Core Admin Evidence Surfaces  
**Result:** PASS  
**Date:** 2026-09-23  
**Entry SHA:** `2925141157e792ef7ebc5290f3c7d463ac1d0760`  
**Accepted executable source:** `e4377a6b7533a3bd7a542e863899e79e7fe87c1d`

## Accepted scope

DB-G4 makes the Desktop operationally useful for authoritative read-only profile evidence while preserving the frozen Admin mutation boundary.

Accepted implementation includes:

- exact-ID Cases entry surface with no global list/search claim;
- exact profile inspection route;
- exact profile-version inspection route;
- current-profile discrepancy evidence route;
- core append-only profile audit route;
- shared `@miqo/application-adapters` lifecycle composition projected into a passive Desktop read model;
- field/value/control-class/source presentation without editability;
- version history and validation evidence;
- discrepancy presentation with no keep/update/correction/resolution action;
- failure mapping preserving EMPTY, BLOCKED and ERROR states with no cached/fabricated substitute;
- native `admin-read` expansion by exactly two new typed commands: `load_admin_profile` and `load_admin_profile_version`;
- typed Rust allow-list additions for `GET /admin/profiles/:profileId` and `GET /admin/profile-versions/:versionId`;
- inherited environment attestation before protected evidence reads;
- opaque identifier validation before native path construction;
- Desktop/service/API integration tests for exact profile and exact profile-version evidence.

No new Fastify endpoint is introduced or modified.

## Explicit non-authority

DB-G4 does **not** authorise or implement:

- profile field edit/save;
- validation execution;
- profile lock;
- correction draft;
- discrepancy resolution;
- global case/entity search or listing;
- audit mutation;
- deep selection/quote/recommendation lineage;
- ranking, integrity or recommendation decisions;
- provider activation;
- live quote execution;
- direct database access.

## Repair history

The gateway records failed intermediate revisions rather than treating them as proof:

1. `d49408c1717cc1de3b8d1610b38d162ae704d813` — implementation source. Repository CI passed, but G7/G8 Windows proof failed at `cargo fmt --check` only. Desktop TypeScript/tests/frontend build were already green.
2. `5b107bb377de663f81d50c60effa8101b79bfeb8` — formatter repair. Repository CI passed, but G7/G8 failed during Tauri manifest generation because the new native commands had not yet been registered into the generated permission manifest (`allow-load-admin-profile` / `allow-load-admin-profile-version` unavailable).
3. `e4377a6b7533a3bd7a542e863899e79e7fe87c1d` — registers the two new native read commands in `build.rs`; complete repository/Windows/API/install proof passes.

The repairs do not broaden authority; they make the intended least-privilege commands buildable and testable under Tauri's permission model.

## Exact executable delta

`2925141157e792ef7ebc5290f3c7d463ac1d0760` → `e4377a6b7533a3bd7a542e863899e79e7fe87c1d` is three commits ahead / zero behind.

Executable changes are confined to:

```text
apps/admin-desktop/src-tauri/build.rs
apps/admin-desktop/src-tauri/capabilities/admin-read.json
apps/admin-desktop/src-tauri/src/lib.rs
apps/admin-desktop/src/app/DesktopApp.tsx
apps/admin-desktop/src/components/ExactIdLookup.tsx
apps/admin-desktop/src/routes/AuditRoute.tsx
apps/admin-desktop/src/routes/CasesRoute.tsx
apps/admin-desktop/src/routes/DiscrepanciesRoute.tsx
apps/admin-desktop/src/routes/ProfileEvidenceRoute.tsx
apps/admin-desktop/src/routes/ProfileVersionRoute.tsx
apps/admin-desktop/src/services/admin-profile.ts
apps/admin-desktop/src/services/contracts.ts
apps/admin-desktop/src/services/tauri-transport.ts
apps/admin-desktop/src/styles.css
apps/admin-desktop/test/admin-audit.test.ts
apps/admin-desktop/test/api-integration.test.ts
apps/admin-desktop/test/core-evidence.test.ts
scripts/desktop-g8-proof.ps1
```

Plus DB-G4 control/evidence documentation under `docs/desktop/desktop-build-001/**`.

No backend API implementation, database, shared package, dependency version, lockfile or workflow file changes.

## Repository CI

Accepted executable source `e4377a6b7533a3bd7a542e863899e79e7fe87c1d` is green under:

- push `ci` #691 / run `35857342196` — SUCCESS
  - locked-dependencies job `107168869392`
  - postgres-contract job `107168869616`
  - target-stack-sprint1 job `107168869926`
- PR `ci` #692 / run `35857346203` — SUCCESS
  - locked-dependencies job `107168882976`
  - target-stack-sprint1 job `107168883382`
  - postgres-contract job `107168883415`

## Windows G7 proof

- `desktop-prep-g7` #221 / run `35857346229` — SUCCESS
- Windows Desktop preflight/full job `107168883003` — SUCCESS
- artifact ID `10748318330`
- artifact name `miqos-admin-windows-x64-13f95042f13cbb24c193b3619f1b06acb7b76d7d`
- digest `sha256:3e15444a6514bc215637cb60f6d0f6b2ee2b1c600e3c8139e5a169e01715b74c`

## Windows/API G8 proof

- `desktop-prep-g8` #41 / run `35857346216` — SUCCESS
- Desktop service / certified API integration job `107168883576` — SUCCESS
- Windows installed Desktop skeleton proof job `107168883213` — SUCCESS
- Windows artifact ID `10749206120`, digest `sha256:df9ade17bde5c1e99a7838cc5ccdbb1460c9ba4b3af9f2284a4b6c3df88d286d`
- API artifact ID `10747652916`, digest `sha256:dfb17e26b54f297ce50b45b3e400a3701368f8d2066b9a0b92610835d70488c4`

The Windows PR proof uses synthetic merge SHA `13f95042f13cbb24c193b3619f1b06acb7b76d7d`, composed from frozen G9 base `f01776e9bb98bb47a0693f43194d1d48b03b6d5e` and DB-G4 branch head `e4377a6b7533a3bd7a542e863899e79e7fe87c1d`.

## Boundary review

| Question | Result |
|---|---|
| Domain/business semantics changed? | No |
| Direct database access introduced? | No |
| Admin mutation introduced? | No |
| New API endpoint introduced? | No |
| Global search/list capability introduced? | No |
| Deep selection trace introduced? | No |
| Generic native HTTP proxy introduced? | No |
| Native permissions broadened beyond required read commands? | No |
| Environment authority changed? | No |
| Identity/RBAC authority changed? | No |
| Dependency versions changed? | No |
| Workflow authority changed? | No |

## Risk disposition

- Reuse of the customer-facing profile adapter is controlled by projection into a passive Desktop read model; tests explicitly prove mutation affordances are absent.
- Exact-ID entry remains distinct from global search.
- Native command growth remains typed and enumerated, not generic.
- Historical discrepancy completeness remains constrained by the existing current-version-oriented discrepancy resource; Desktop labels the evidence accordingly and does not fabricate historical discrepancy state.

## Exit

**DB-G4 = PASS.**

DB-G5 — Deep Audit, Trace & Decision-Evidence Surfaces remains **NOT STARTED** and requires a separate controlled execution step.

This gateway does not certify production identity/RBAC, non-synthetic environments, production signing, provider activation, deep selection/quote/recommendation lineage or release/go-live.
