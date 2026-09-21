# G7 Evidence — Build & CI/CD Preparation

**Gateway:** G7  
**Current result:** PARTIAL PASS — G7-A PASS / G7-B PENDING  
**Date:** 2026-09-21

## Evidence implemented

### Canonical build entry point

`scripts/desktop-ci.ps1`

Modes:

- Auto;
- Preflight;
- Full.

### Actual GitHub Actions workflow

`.github/workflows/desktop-prep-g7.yml`

The workflow uses:

- `windows-2025`;
- Node 22.16.0;
- npm 10.9.2 verification;
- Rust 1.98.1;
- MSVC workload verification;
- full-SHA pinned actions;
- contents-read token permissions;
- caches disabled;
- SYNTHETIC/liveProviders=false boundary;
- canonical build script;
- package artefact upload only when Full mode produces manifest/package evidence.

### Full-action pins

- checkout v7.0.1 — `3d3c42e5aac5ba805825da76410c181273ba90b1`
- setup-node v7.0.0 — `820762786026740c76f36085b0efc47a31fe5020`
- upload-artifact v7.0.1 — `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`

## Current external/toolchain evidence

Current GitHub documentation identifies `windows-2025` as a standard x64 hosted runner.

The current Windows 2025 image documents Rust/Cargo 1.98.1 and Visual Studio/MSVC availability.

GitHub security guidance recommends full-length action-SHA pinning as the immutable-reference control.

GitHub cache guidance warns against secrets in caches and recommends restricted cache writing for low-trust workflows; the initial MIQOS Desktop workflow disables caches entirely.

Rust 1.98.1 is the current stable point release selected for the G7 controlled toolchain.

## Live CI evidence

Draft validation PR #5 produced:

- Desktop workflow run `35601094369` — **SUCCESS**
- Existing certified CI run `35601094316` — **SUCCESS**
- certified CI jobs `locked-dependencies`, `postgres-contract`, and `target-stack-sprint1` — all **SUCCESS**

Detailed Windows evidence: `08-evidence/G7/windows-preflight-run.md`.

## G7-A exit results

| Criterion | Result |
|---|---|
| canonical Desktop build entry point exists | PASS |
| Windows runner/toolchain selected | PASS |
| workflow definition exists | PASS |
| Windows preflight workflow executed successfully | PASS |
| existing certified CI remained green on validation head | PASS |
| workflow security/secret boundary defined | PASS |
| package artefact contract defined | PASS |
| signing insertion point defined | PASS |
| release pipeline defined | PASS |
| package CI can execute before scaffold | NOT APPLICABLE — planned dependency |
| actual NSIS artefact generated | PENDING G8.1 |
| full package CI run passed | PENDING G8.1 |

## Why not full PASS

The controlled blueprint creates the Desktop application scaffold at G8 WP-G8.1 but requires a successful package CI run to close G7.

No `apps/admin-desktop` currently exists.

G7 must therefore remain PARTIAL PASS until the minimal G8.1 scaffold is created and the same workflow automatically executes Full mode.

## Next controlled operation

Execute only:

`G8 / WP-G8.1 — Desktop Scaffold`

Then immediately return to:

`G7-B — Full Package CI Closure`

before proceeding with the rest of the G8 integration/proof scope.
