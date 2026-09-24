# DESKTOP-G0 — Runtime Architecture & Executable Skeleton — Closure Pack

**Gateway:** DESKTOP-G0  
**Branch:** `miqo/desktop-app-001`  
**Certified platform base:** `245edbe261d3a1b66d07bd4edf618db98945a566`  
**Execution evidence head before closure record:** `155ccd17347a42d67e3db1169fd1779d6154c93f`  
**Tracker:** issue #10  
**Status at creation:** G0.0–G0.6 PASS; G0.7 pending GREEN CI on this closure commit.

## 1. Purpose

DESKTOP-G0 establishes the first native MIQO desktop runtime on top of the certified synthetic platform without rewriting the existing TypeScript/Fastify/Next/domain stack.

The native shell is implemented with Tauri 2 / Rust. It owns the local developer/test runtime lifecycle, loads the customer application in a native WebView, preserves the existing synthetic admin boundary, and proves orderly shutdown.

## 2. Runtime architecture proven

```text
Tauri 2 native desktop shell
        |
        +-- PostgreSQL 16 (Docker Compose, developer/test)
        +-- database migrations
        +-- Fastify API       127.0.0.1:4000
        +-- customer Next app 127.0.0.1:3000
        +-- admin Next app    127.0.0.1:3001
        |
        +-- native WebView -> http://127.0.0.1:3000/prototype
                         |
                         +-- customer journey
                         +-- synthetic-gated admin diagnostics
```

The shell's navigation policy permits only loopback HTTP navigation to the customer/admin ports used by this prototype.

## 3. G0 acceptance outcomes

| Requirement | Result | Evidence |
|---|---|---|
| Native desktop window starts | PASS | native Tauri lifecycle proof; page-load marker emitted |
| Customer UI loads inside native window | PASS | `native-ready.txt` = `loaded=http://127.0.0.1:3000/prototype` |
| Local Fastify API starts automatically | PASS | shell-owned runtime and API health evidence |
| Synthetic prototype boundary preserved | PASS | API health reports `SYNTHETIC`; live providers false; boundary verifier GREEN |
| Local persistence starts/connects | PASS | shell-managed PostgreSQL developer/test service + migrations + journey persistence |
| Customer profile creation works | PASS | selected full customer journey GREEN |
| Facts can be entered and locked | PASS | selected journey and runtime trace show factual writes, validation and lock |
| Optimisation/recommendation journey works | PASS | Sprint 4 customer recommendation journey GREEN under shell-owned stack |
| Admin/diagnostic surface works under synthetic gate | PASS | Sprint 4 admin trace + synthetic-admin tests GREEN |
| Clean shutdown/no owned orphan services | PASS | shutdown proof and post-exit listener/container assertions |
| Existing domain/integrity regressions remain GREEN | PASS | inherited `ci` #865 all four jobs GREEN |
| No live insurer/real IdP/production path activated | PASS | synthetic boundary and scope controls retained |

## 4. Dedicated desktop certification evidence

Execution head:

```text
155ccd17347a42d67e3db1169fd1779d6154c93f
```

Dedicated workflow:

```text
desktop-g0 #5
run id: 36022867348
event: push
conclusion: success
job: native-runtime-proof — success
```

The workflow passed:

- Node `22.16.0` check;
- npm `10.9.2` check;
- clean `npm ci`;
- exact dependency-pin verification;
- prototype-boundary verification;
- Tauri Linux prerequisite installation;
- exact Rust `1.98.1` selection;
- `cargo check --locked`;
- Playwright Chromium setup;
- `scripts/desktop-g0-proof.sh`;
- proof artifact upload.

Artifact:

- name: `desktop-g0-155ccd17347a42d67e3db1169fd1779d6154c93f`
- id: `10818641189`
- digest: `sha256:b2a6a0af6453a8c4a150abd258a7f61e9d3a04b61934e909fb5a79c10174ce4d`
- retention expiry recorded by GitHub: 2026-10-08.

## 5. Artifact evidence

The uploaded proof contains:

### `native-ready.txt`

```text
loaded=http://127.0.0.1:3000/prototype
```

This marker is written by the Tauri native WebView page-load callback after the customer application finishes loading.

### `api-health.json`

```json
{"status":"ok","dataClassification":"SYNTHETIC","liveProvidersEnabled":false}
```

### `desktop-g0-proof.json`

```json
{"nativeWindow":"PASS","customerJourney":"PASS","adminDiagnostics":"PASS","shutdown":"PASS","boundary":"SYNTHETIC_ONLY"}
```

### `shutdown.json`

```json
{"clean":true,"services":"stopped"}
```

The runtime log additionally records the factual-profile workflow, profile lock, admin profile access, optimisation/recommendation calls, completion path, then orderly admin → customer → API termination and shell-owned PostgreSQL stop.

## 6. Desktop-owned journey coverage

The lifecycle proof starts the runtime first, then runs the existing Playwright suites against those shell-owned services rather than allowing Playwright to create its own web servers.

The proof includes:

- Sprint 4 customer recommendation journey;
- Sprint 4 admin end-to-end trace;
- DB-G10 accessibility critical path;
- DB-G10 browser security;
- DB-G10 synthetic admin access;
- DB-G10 script-like input / abuse regression.

This demonstrates that native hosting did not bypass the previously certified customer/admin/security boundaries.

## 7. Inherited repository certification

On the same execution head, inherited workflow `ci`:

```text
ci #865
run id: 36022867330
event: push
conclusion: success
```

Jobs:

- `locked-dependencies` — PASS
- `postgres-contract` — PASS
- `db-g10-hardening` — PASS
- `target-stack-sprint1` — PASS

Therefore the native desktop bootstrap did not require weakening the existing domain, persistence, API, security, accessibility or browser regression gates.

## 8. Lifecycle and shutdown model

The native runtime:

1. fails closed if data classification is not `SYNTHETIC`;
2. fails closed if live-provider activity is enabled;
3. optionally starts the existing PostgreSQL Docker Compose service in controlled developer/test execution;
4. waits for PostgreSQL readiness;
5. applies current migrations;
6. starts the existing Fastify API;
7. starts the customer and admin Next applications;
8. waits for local health/readiness;
9. opens the native customer window;
10. terminates owned child process trees in reverse order during shutdown;
11. stops PostgreSQL when the shell started it;
12. exposes deterministic proof markers used by CI.

The CI proof additionally verifies that API/customer/admin endpoints no longer respond after shutdown and that shell-owned PostgreSQL is not left running.

## 9. Security/network boundary

The desktop shell does not create a new production network surface.

For this gateway:

- application URLs are loopback only;
- Tauri navigation accepts only HTTP loopback hostnames and ports 3000/3001;
- API remains on loopback port 4000;
- existing Fastify synthetic/live-provider startup checks remain authoritative;
- existing synthetic admin marker remains required;
- no real identity-provider integration exists;
- no live insurer/provider endpoint or credential is introduced;
- no production infrastructure is contacted by application logic.

## 10. Persistence decision and limitation

DESKTOP-G0 deliberately retains PostgreSQL 16.

For the certified proof, PostgreSQL is provided through the repository's existing Docker Compose developer/test service. This minimises architectural change and preserves the already-certified PostgreSQL constraints.

This is **not yet the final distributable desktop persistence architecture**. A future gateway must decide whether the installable product:

- bundles/manages PostgreSQL;
- uses an embedded database such as SQLite/SQLCipher;
- or adopts another controlled local persistence model.

Any persistence change must re-prove migrations, integrity, locking, audit and restart behaviour.

## 11. Packaging limitation

DESKTOP-G0 proves a real native executable/runtime, but it does **not** certify a consumer installer or distributable production package.

Specifically, G0 does not certify:

- Windows NSIS/MSI packaging;
- macOS bundle/DMG packaging;
- Linux AppImage/deb/rpm packaging;
- code signing;
- notarisation;
- auto-update;
- installation lifecycle on a clean end-user machine.

These are subsequent desktop gateways.

## 12. Residual risks / deferred controls

1. PostgreSQL currently depends on the local Docker developer/test environment.
2. Next.js and Node remain runtime dependencies for this skeleton; final sidecar/static packaging is deferred.
3. Real authentication/authorisation is not implemented; the existing synthetic admin mechanism remains test-only.
4. No production CSP/TLS/HSTS/secret-management architecture is claimed for the desktop product.
5. No external network-deny sandbox/firewall is installed by the shell; the proof relies on loopback configuration, native navigation restriction, existing prototype boundary and absence of live-provider code paths.
6. Cross-platform native certification beyond the Linux CI runtime has not yet been performed.
7. Installer signing, notarisation and release provenance are explicitly outside scope.

## 13. Boundary confirmation

During DESKTOP-G0 execution:

- `MIQO_DATA_CLASSIFICATION` remained `SYNTHETIC`;
- live-provider enablement remained false;
- existing mock/synthetic provider flows only were exercised;
- no real IdP was activated;
- no real customer/provider credential was added;
- no production deployment was performed;
- no release or signing action was performed;
- no merge to `main` was performed.

## 14. Final closure rule

This closure document changes the branch head. The exact closure commit must independently receive:

1. GREEN dedicated `desktop-g0` workflow; and
2. GREEN inherited `ci` workflow.

Only after both are GREEN may the tracker be closed as:

```text
DESKTOP-G0 — PASS
```

That PASS certifies an executable **synthetic developer/test native runtime** only. It does not authorise merge, release, deployment, signing, real-IdP activation, non-synthetic operation or live-provider activation.
