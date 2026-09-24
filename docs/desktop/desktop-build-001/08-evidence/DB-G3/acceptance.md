# DB-G3 acceptance — Native Platform, Transport & Environment Boundary

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G3  
**Result:** PASS  
**Date:** 2026-09-23  
**Entry SHA:** `c03a9ec518683121cf6816f6faeb8d9b580fce6a`  
**Accepted executable source:** `6abb124e2a6235ac4d2e71ce63b71dc753bc123a`

## Accepted platform hardening

DB-G3 hardens the existing TEST/SYNTHETIC Desktop native boundary without activating real identity, non-synthetic environments, live providers or new Admin resources.

Accepted implementation includes:

- typed native `ApiReadOperation` allow-list rather than arbitrary URL/method construction;
- approved current routes limited to `/health`, `/admin/audit?profileId=:profileId` and `/profiles/:profileId/discrepancies`;
- strict profile-ID validation before route construction;
- immutable TEST/SYNTHETIC deployment-profile validation for schema, profile ID, stage, application environment, API base URL, API audience, OIDC issuer/client/scopes and feature set;
- unknown feature flags rejected fail-closed;
- TEST loopback origin retained as the current synthetic exception only;
- GET-only native reads, redirects disabled and 2 MiB response limit;
- server attestation requiring `status=ok`, `dataClassification=SYNTHETIC`, `liveProvidersEnabled=false`;
- contradiction mapped to `DESKTOP_ENVIRONMENT_ATTESTATION_FAILED` with no endpoint fallback or environment reinterpretation;
- main-window Tauri capability renamed from proof-era `scaffold` to `admin-read`;
- exact capability reduced to the three approved native commands;
- packaged-local CSP retained with renderer `connect-src 'self'` and no generic shell/filesystem/http plugin capability;
- Dashboard environment display corrected so unresolved runtime identity renders `ENVIRONMENT UNKNOWN` rather than asserting TEST/SYNTHETIC prematurely;
- Rust negative tests covering environment/origin drift, identity drift, unknown feature flags and route-template escape attempts.

## Repair history

The gateway records two failed intermediate proof revisions and does not count them as PASS evidence:

1. `ce4fd0c95b50b61a3c4d3dfc91ee0951c459c654` — native hardening source; Windows proof stopped at Rust formatting.
2. `9c8a329d9535c89e38039048496ee81ac13039a4` — formatter repair; G7 passed but G8 failed because the installed-proof harness still referenced removed `scaffold.json`.
3. `6abb124e2a6235ac4d2e71ce63b71dc753bc123a` — installed-proof harness aligned to `admin-read`; complete regression chain PASS.

The proof repair changes validate the new capability boundary; they do not remove or bypass a security assertion.

## Exact executable delta

`c03a9ec518683121cf6816f6faeb8d9b580fce6a` → `6abb124e2a6235ac4d2e71ce63b71dc753bc123a` is three commits ahead / zero behind.

Executable changes are confined to:

```text
apps/admin-desktop/src-tauri/Cargo.toml
apps/admin-desktop/src-tauri/capabilities/admin-read.json
apps/admin-desktop/src-tauri/capabilities/scaffold.json   (removed/renamed)
apps/admin-desktop/src-tauri/src/lib.rs
apps/admin-desktop/src-tauri/tauri.conf.json
apps/admin-desktop/src/routes/DashboardRoute.tsx
scripts/desktop-g8-proof.ps1
```

Plus DB-G3 control/evidence documentation under `docs/desktop/desktop-build-001/**`.

The Cargo manifest change only removes the proof-era word `scaffold` from the package description; dependency versions are unchanged. No API/domain/database/shared-package/lockfile/workflow dependency authority is changed.

## Exact-source CI and Windows proof

Accepted executable source `6abb124e2a6235ac4d2e71ce63b71dc753bc123a` is green under:

### Repository CI

- push `ci` #683 / run `35776583591` — SUCCESS
  - `postgres-contract` job `106911211870`
  - `locked-dependencies` job `106911211903`
  - `target-stack-sprint1` job `106911212226`
- pull-request `ci` #684 / run `35776590679` — SUCCESS
  - `locked-dependencies` job `106911237361`
  - `target-stack-sprint1` job `106911237583`
  - `postgres-contract` job `106911237966`

### Windows G7

- `desktop-prep-g7` #217 / run `35776590700` — SUCCESS
- Windows Desktop preflight/full job `106911239127` — SUCCESS
- package artifact ID `10717060915`
- artifact name `miqos-admin-windows-x64-a7eb8247725d04b8b8fc7322576ece7555520239`
- digest `sha256:30ae8639038e3c5489edd71d1ba679f84e694bc28087f6d732aa70faf8a36fba`

### Windows/API G8

- `desktop-prep-g8` #37 / run `35776590659` — SUCCESS
- Desktop service / certified API integration job `106911237592` — SUCCESS
- Windows installed Desktop skeleton proof job `106911238055` — SUCCESS
- Windows artifact ID `10717536155`, digest `sha256:3d39a8b083316f2b0eebb19441f43efcd1db2d9f2748abd519c4ab5f40482500`
- API artifact ID `10716667035`, digest `sha256:7a98817a5a744dffedb339584699f006c742354fece847f788d3653dc315e207`

The PR merge used by Windows proof is `a7eb8247725d04b8b8fc7322576ece7555520239`, composed from frozen G9 base `f01776e9bb98bb47a0693f43194d1d48b03b6d5e` and DB-G3 head `6abb124e2a6235ac4d2e71ce63b71dc753bc123a`.

## Boundary review

| Question | Result |
|---|---|
| Domain/business semantics changed? | No |
| Direct DB access introduced? | No |
| Admin mutation introduced? | No |
| New API resource introduced? | No |
| Generic native HTTP proxy introduced? | No |
| Renderer network authority broadened? | No |
| Tauri capability broadened? | No; proof-era capability is narrowed/renamed |
| Real OIDC/token brokerage enabled? | No |
| Non-synthetic environment enabled? | No |
| Live providers enabled? | No |
| Dependency versions changed? | No |
| Workflow authority changed? | No |

## Carried dependencies

- `CC-G3-001` real server authentication/permission/access-audit extension remains DB-G7 scope.
- `CC-G5-001` certification/production environment authority remains open; DB-G3 explicitly does not enable it.
- `D-G3-IDP-001`, `D-G5-ENV-001` and production signing remain downstream.

## Exit

**DB-G3 = PASS.**

DB-G4 — Core Admin Evidence Surfaces remains **NOT STARTED** and requires a separate controlled execution step.

This gateway does not certify production identity/RBAC, certification/production environments, provider activation, production signing, deep Admin evidence surfaces or release/go-live.
