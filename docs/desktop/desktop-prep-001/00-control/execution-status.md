# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G8 — Desktop Skeleton Proof
**Status:** IN EXECUTION — API/PACKAGE PROOF PASS / INSTALLED PROOF BLOCKED
**Execution branch:** miqos/desktop-prep-001
**Upstream certified branch:** miqos/app-build-001
**Upstream certified SHA:** ce211bf4e23643f1eab75e865210f4de121841fb
**Current controlled source head:** 3346a5cd713242c8997a25586df753171bf6d9e4
**Date:** 2026-09-21

## Current control position

G0 through G7 remain PASS.

G7 historical closure remains valid and the current G8 source head has also restored the G7 regression guard:

- `desktop-prep-g7` run `35624013728` / #189 — **SUCCESS**;
- canonical Desktop full contract — **SUCCESS**;
- packaged artefact detection — **SUCCESS**;
- Desktop package evidence upload — **SUCCESS**.

The certified repository CI is also green on the same source tree:

- `ci` run `35624013703` / #637 — **SUCCESS**.

## G8 current evidence

Permanent G8 run:

```text
workflow: desktop-prep-g8
run:      35624013907
run #:    12
```

### API/application-service lane

Job `106414115309` — **SUCCESS**.

Proved:

- PostgreSQL 16 migration path;
- certified Fastify API startup;
- TEST/SYNTHETIC health boundary;
- Desktop application service;
- existing Admin Audit adapter/ViewModel composition;
- contradictory environment/provider evidence fails closed;
- API proof artefact upload.

### Windows package lane

Job `106414115119` reached:

- Node/Rust/MSVC setup — PASS;
- npm/dependency boundary — PASS;
- Desktop typecheck/tests/build — PASS;
- `cargo fmt --check` — PASS;
- `cargo clippy -- -D warnings` — PASS;
- `cargo test` — PASS;
- Tauri release build — PASS;
- NSIS package generation — PASS;
- G7 full package contract — PASS.

The installed proof then failed immediately in the proof harness before installation assertions.

## Active G8 blocker

`scripts/desktop-g8-proof.ps1` line 33 enumerates HKLM uninstall registry entries using:

```powershell
Where-Object { $_.DisplayName -eq $ProductName }
```

Under `Set-StrictMode -Version Latest`, at least one registry object lacks a `DisplayName` property, producing:

```text
The property 'DisplayName' cannot be found on this object.
```

This is a proof-harness robustness defect, not evidence of a Tauri, NSIS, native-command, CSP, API, or package-build failure.

## Next controlled operation

Correct only the uninstall-registry enumeration in the G8 proof harness so missing `DisplayName` properties are safely ignored under strict mode.

Then rerun the permanent G8 workflow and require the installed sequence to complete:

- install;
- launch;
- controlled API-unavailable UI;
- safe retry against SYNTHETIC stub;
- visible SYNTHETIC/ATTESTED evidence;
- structured log proof;
- runtime independence;
- 0.1.0 → 0.1.1 upgrade;
- downgrade rejection;
- silent uninstall;
- proof artefact upload.

G8 remains **NOT PASS** until that evidence exists.

G9 remains NOT STARTED.
