# G7 Evidence — Build & CI/CD Preparation

**Gateway:** G7  
**Current result:** PASS — G7-A PASS / G7-B PASS  
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
| actual NSIS artefact generated | PASS — artefact 10646138442 |
| full package CI run passed | PASS — run 35615450461 |

## G7-B execution after WP-G8.1

WP-G8.1 exists and Full mode executes.

The prior CLI-probe defect was corrected by invoking the locked workspace binary directly.

Run `35609979477` / #109 then progressed through the certified shared checks and into Rust/Tauri compilation.

Observed terminal blocker:

```text
unknown field 'windows'
```

for:

```text
build.windows.staticVCRuntime
```

from released `tauri-build 2.6.3`.

The run failed at the Rust clippy stage before package generation.

Therefore:

- NSIS artefact: not produced;
- SHA-256: not produced;
- build-manifest.json: not produced;
- GitHub package artefact: not uploaded.

G7 remains PARTIAL PASS.

## Next controlled operation

Resolve the narrow Tauri configuration compatibility blocker under explicit controlled authority, then rerun G7-B.

The remainder of G8 remains unauthorised until an actual NSIS package and required provenance evidence exist.


## G7-B final closure

Successful Desktop Full workflow:

- run `35615450461` / #130 — **SUCCESS**;
- job `106384830231` — **SUCCESS**;
- package detection — **SUCCESS**;
- artefact upload — **SUCCESS**.

Same-head certified CI:

- run `35615450454` / #570 — **SUCCESS**;
- `locked-dependencies` — **SUCCESS**;
- `postgres-contract` — **SUCCESS**;
- `target-stack-sprint1` — **SUCCESS**.

Detailed package evidence:

`08-evidence/G7/full-package-ci.md`

## Gateway decision

**G7 = PASS**

The remainder of G8 Desktop Skeleton Proof is authorised.
