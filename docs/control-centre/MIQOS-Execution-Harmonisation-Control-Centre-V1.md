# MIQOS Execution Harmonisation & Collaboration Control Centre — V1 Plan

## Purpose

This control-plane workstream separates **product/runtime changes** from **execution-harness and governance changes** so that existing certified behaviour is not disrupted while legacy checks, future provider integrations and GitHub/ChatGPT collaboration are made coherent.

Tracking issue: #19.

## Authoritative current baseline

- active runtime/remediation branch: `miqo/desktop-uat-remediation`
- current head: `d0a61b3b464a9af9d1d3408e6a1818b8a1a4ae9b`
- `ci #1042` — PASS
- `ci #1043` — PASS
- `desktop-g3 #55` — PASS
- `desktop-g3 #56` — PASS
- boundary: `SYNTHETIC_ONLY`

R1 is physically closed. R2.1–R2.4 are implemented and regression-green. R2.5, R3, R4 and R5 remain unexecuted.

## Current execution failures

### EXF-01 — DESKTOP-G1 legacy staging drift

Latest: `desktop-g1 #16`.

Working:
- embedded-pglite — PASS
- distributable-runtime — PASS

Failing:
- tauri-distributable — FAIL

Root cause:
`tauri.conf.json` now declares runtime resources under repository-root `r/`, but the legacy Linux G1 Tauri job does not stage that resource root before native build. The build terminates with:

`resource path ../../../r doesn't exist`

Classification: verification-harness drift, not a current runtime/product failure.

Corrective action:
- create/reuse one canonical runtime-staging helper;
- stage the exact current runtime contract before the G1 Tauri build;
- do not alter current packaged-runtime semantics.

### EXF-02 — DESKTOP-G2 legacy first-run proof drift

Latest: `desktop-g2 #27`.

Working:
- Windows release build — PASS
- NSIS generation — PASS

Failing:
- installed first-run proof — FAIL

Root cause:
the legacy G2 proof deliberately sanitises PATH but omits `%SystemRoot%\System32\WindowsPowerShell\v1.0`. The later certified G3 keyring machine-context implementation requires Windows PowerShell for the SMBIOS context query. The installed runtime therefore exits before readiness.

Classification: verification-harness drift, not an installer build failure.

Corrective action:
- update the G2 proof allow-list/PATH to the certified G3 runtime dependency contract;
- preserve machine binding, DPAPI and fail-closed key behaviour;
- do not add host Node/npm/Docker/PostgreSQL dependencies.

### EXF-03 — R2.4 inherited browser contract drift — RESOLVED

Initial R2.4 runs failed because:
- inherited tests expected `Start synthetic profile` after the CTA became `Start new synthetic profile`;
- broad status/alert role locators collided with existing shell semantics.

Correction:
`872dbc1e787cd2d10fa325ddde2e3767c9d010b6`

Current CI and G3 are GREEN.

## Execution harmonisation phases

### EH-0 — inventory and freeze

- freeze `d0a61b3...` as the analysis reference;
- capture current PASS/FAIL matrix;
- no runtime changes.

### EH-1 — legacy G1/G2 harness correction

Only:
- shared runtime staging;
- G1 build harness;
- G2 Windows proof dependency allow-list.

Acceptance:
- CI GREEN;
- G1 GREEN;
- G2 GREEN;
- G3 GREEN;
- no application/runtime source change unless separately justified.

### EH-2 — regression-matrix unification

Define one machine-readable test matrix specifying:
- authoritative gate;
- inherited gates;
- OS;
- runtime resources;
- allowed host dependencies;
- expected artifacts;
- whether a failure is product, harness or historical-only.

Goal: prevent future false-red runs caused by obsolete assumptions.

### EH-3 — future provider-integration seam hardening

Current provider architecture is correctly synthetic-only but is mock-specific.

Before SEOPA/Quotezone or another provider is connected:
- introduce a versioned `ProviderAdapter` interface and registry;
- preserve provider/channel/adapter/mapping versions in quote fingerprints;
- move provider-specific normalisation behind canonical contracts;
- add sandbox-only activation configuration;
- add a secret/credential broker outside browser/static assets;
- define response-retention, redaction and comparison/display rules;
- certify each provider adapter independently;
- keep `MIQO_LIVE_PROVIDERS_ENABLED=false` until an explicit production-authority gateway.

No external provider integration is authorised by EH-3 itself.

## Current future integration status

SEOPA/Quotezone:
- initial enquiry sent 20 Sep 2026;
- follow-up sent 29 Sep 2026;
- no confirmed provider reply, sandbox or credentials at this snapshot.

Existing code already has useful future-facing identity fields:
- provider key;
- channel key;
- adapter version;
- mapping version;
- request fingerprint;
- raw payload hash;
- normalisation fingerprint.

The main future-compatibility gap is that execution/normalisation is currently bound directly to the mock provider rather than a provider registry.

## Collaboration Control Centre phases

### CC-0 — static control plane
- visual roadmap;
- execution matrix;
- failure/root-cause register;
- integration readiness;
- approval/reject/defer ledger;
- roadmap-delta register;
- exportable action package.

### CC-1 — GitHub read-only sync
Use GitHub API/webhooks to populate:
- branch/head;
- workflow status;
- PRs/issues;
- artifacts;
- exact SHAs and evidence.

### CC-2 — action queue
User buttons create signed/traceable action requests, not direct writes.

### CC-3 — trusted GitHub action broker
A GitHub App or trusted local/server broker executes permitted actions:
- workflow dispatch;
- issue/PR comments;
- branch creation;
- approved bounded commits.

Never expose GitHub tokens in browser HTML.

### CC-4 — ChatGPT/Codex handoff
Export structured action packets containing:
- current head;
- authorised scope;
- prohibited scope;
- next action;
- acceptance criteria;
- required evidence.

Later this can be consumed through connected tooling/Work without manual copying.

### CC-5 — notifications and immutable audit
- webhook-driven status updates;
- notifications for GREEN/FAIL/BLOCKED;
- decision ledger;
- roadmap-change history;
- closure snapshot.

## Change-colour model

- GREEN — certified/passed
- BLUE — active
- AMBER — pending/awaiting dependency
- RED — failed/open blocker
- PURPLE — deferred/not authorised
- CYAN — newly added roadmap item
- VIOLET — changed from original roadmap

## Separation rule

The Control Centre and EH planning must not directly alter the frozen G3 branch or production authority.

Runtime remediation continues only through explicitly authorised bounded stages. Execution-harness harmonisation is performed in its own phase/thread so proof-system changes cannot be confused with product changes.
