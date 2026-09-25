# DESKTOP-G2 — Installer Packaging, Clean-Machine Execution & Platform Certification — Closure Pack

**Gateway:** DESKTOP-G2  
**Branch:** `miqo/desktop-g2`  
**Certified G1 entry:** `590aaf62da5148ecb3a255d1894ad19f0594ae14`  
**Execution evidence head before this closure record:** `9dfca421c9090065ceb3657861b00ca6f9ed005f`  
**Tracker:** issue #12  
**Primary platform:** Windows x64 / MSVC  
**Installer:** unsigned NSIS, current-user install  
**Status at creation:** G2.0–G2.8 PASS; G2.9 pending GREEN CI on this closure commit.

## 1. Purpose

DESKTOP-G2 turns the certified DESKTOP-G1 self-contained runtime into an actually installable Windows x64 desktop application and proves the installed lifecycle on a clean Windows CI host.

The gateway certifies an unsigned **synthetic** Windows installer/runtime only.

## 2. Frozen installer architecture

- Tauri 2 native desktop application.
- Windows x64 / MSVC target.
- NSIS current-user installer.
- Embedded WebView2 bootstrapper mode.
- Packaged Node 22.23.3 runtime.
- Next.js standalone customer/admin applications.
- Bundled Fastify API.
- Embedded PGlite 0.5.8 persistence.
- No host Node/npm/Docker/PostgreSQL runtime dependency.
- Code signing intentionally absent because signing is outside G2 authority.

## 3. Data-retention policy certified

Uninstall removes installed application binaries and installer registration but preserves the application-local MIQO PGlite data directory by default.

Rationale: user profile/audit state must not be silently destroyed by application removal.

DESKTOP-G2 proves that reinstall reconnects to the retained store and can read a previously locked synthetic profile.

## 4. Gateway outcomes

| Gate | Requirement | Result |
|---|---|---|
| G2.0 | Windows installer architecture and policy | PASS |
| G2.1 | Production Tauri NSIS bundle generation | PASS |
| G2.2 | Packaged runtime/resource inventory | PASS |
| G2.3 | Clean-machine dependency-independent installation/launch | PASS |
| G2.4 | First-run PGlite creation/migrations + customer journey | PASS |
| G2.5 | Restart persistence + synthetic admin diagnostics | PASS |
| G2.6 | Uninstall/reinstall retention-policy proof | PASS |
| G2.7 | Installer/runtime security inspection + SHA-256 inventory | PASS |
| G2.8 | Windows installer + inherited CI certification | PASS |
| G2.9 | Immutable-head closure | PENDING FINAL GREEN CI |

## 5. Exact executable evidence

Execution evidence head:

```text
9dfca421c9090065ceb3657861b00ca6f9ed005f
```

Dedicated workflow:

```text
desktop-g2 #21
run id: 36159275084
conclusion: SUCCESS
```

Job:

- `windows-x64-installer` — PASS

Generated installer:

```text
MIQO Desktop [SYNTHETIC]_0.2.0_x64-setup.exe
```

The job successfully passed production build, NSIS generation, install, clean-machine launch, first-run journey, restart persistence, uninstall/reinstall retention, security inspection and evidence upload.

## 6. Clean-machine runtime proof

The installed application is launched with a poisoned/minimal PATH that makes host development commands fail if invoked.

Poisoned commands include:

- `node`
- `npm`
- `npx`
- `docker`
- `psql`
- `postgres`
- `pg_ctl`

The installed application nevertheless starts and passes.

The certified runtime therefore requires:

| Host dependency | Required |
|---|---|
| Host Node | NO |
| Host npm | NO |
| Docker | NO |
| External PostgreSQL | NO |

Test-driver Node/Playwright on the CI host remains separate from application runtime dependency.

## 7. Installed application proof

The clean-machine proof passed:

- installed executable discovery from real NSIS installation inventory;
- unsigned installer inspection;
- unsigned installed executable inspection;
- packaged Node version verification;
- installed runtime-manifest verification;
- native application start;
- SYNTHETIC-only API health;
- PGlite backend verification;
- loopback-only service listeners;
- packaged MIQO Node process inventory;
- no non-loopback established connections from packaged MIQO Node services during proof;
- no poisoned host dependency invocation;
- customer recommendation journey;
- admin end-to-end trace;
- clean shutdown with no remaining application listeners.

The installed browser journey recorded:

```text
2 passed
```

## 8. Persistence and restart proof

The installed runtime:

1. created/applied the embedded PGlite data store;
2. created a synthetic profile;
3. wrote factual values;
4. validated the profile;
5. locked the profile;
6. shut down cleanly;
7. restarted from the same local data directory;
8. re-read the locked profile through the synthetic admin API.

Result:

```text
restartPersistence = PASS
databaseBackend = PGLITE
boundary = SYNTHETIC_ONLY
```

## 9. Uninstall/reinstall retention proof

The proof then:

1. uninstalled the application;
2. verified the application binary was removed;
3. verified application-local PGlite data remained;
4. reinstalled the same application;
5. relaunched it;
6. verified the previously locked profile remained readable;
7. shut down cleanly;
8. uninstalled again;
9. verified application data remained retained.

Result:

```text
uninstallDataPolicy = PRESERVE
reinstallPersistence = PASS
```

## 10. Security and artifact inspection

DESKTOP-G2 records:

- installer Authenticode state: expected unsigned;
- installed executable Authenticode state: expected unsigned;
- current-user install mode;
- WebView2 embedded-bootstrapper mode;
- loopback-only runtime services;
- packaged Node 22.23.3;
- PGlite embedded database backend;
- SHA-256 inventory for installer, installed executable, packaged Node and runtime manifest;
- packaged process inventory;
- absence of required host Node/npm/Docker/PostgreSQL.

Signing is deliberately not claimed or authorised.

## 11. Dedicated workflow artifact

Artifact:

- name: `desktop-g2-windows-x64-9dfca421c9090065ceb3657861b00ca6f9ed005f`
- id: `10875063572`
- size: `36830781` bytes
- digest: `sha256:c03866f760013ef26cd52a57fc68a0406e650d1a21aee41b2d0bd6297e49032e`
- retention expiry recorded by GitHub: 2026-10-09.

The artifact contains the generated installer and G2 evidence set.

## 12. Inherited repository certification

On the same executable evidence head:

```text
ci #904
run id: 36159275109
conclusion: SUCCESS
```

Jobs:

- `locked-dependencies` — PASS
- `postgres-contract` — PASS
- `db-g10-hardening` — PASS
- `target-stack-sprint1` — PASS

Therefore installer/platform work did not weaken the existing reference PostgreSQL, security, accessibility, browser or target-stack certification.

## 13. Evidence summary emitted by the Windows proof

```text
g2_1 = PASS
g2_2 = PASS
g2_3 = PASS
g2_4 = PASS
g2_5 = PASS
g2_6 = PASS
g2_7 = PASS
restartPersistence = PASS
uninstallDataPolicy = PRESERVE
reinstallPersistence = PASS
hostNodeRequired = false
externalPostgresRequired = false
databaseBackend = PGLITE
boundary = SYNTHETIC_ONLY
```

## 14. Residual risks / downstream controls

1. The installer and executable are unsigned. Signing remains a separate controlled gateway.
2. Windows x64 is the only platform certified by G2.
3. At-rest encryption/key management is not yet certified.
4. Real identity/authorisation remains outside scope.
5. Auto-update/release-channel architecture remains outside scope.
6. Live providers and real customer/provider data remain prohibited.
7. Production telemetry/secrets/infrastructure controls remain downstream concerns.
8. Installer testing uses GitHub-hosted Windows rather than a physical end-user device; this is sufficient for G2 platform certification but not public-release readiness by itself.

## 15. Boundary confirmation

During DESKTOP-G2:

- data classification remained `SYNTHETIC`;
- live-provider enablement remained false;
- no real customer/provider credentials were introduced;
- no real IdP was activated;
- no code signing/notarisation occurred;
- no public release/deployment occurred;
- no merge to `main` occurred;
- no production infrastructure mutation occurred.

## 16. Immutable-head closure rule

This closure document changes the branch head.

G2.9 may be marked PASS only after the exact closure commit independently receives:

1. GREEN `desktop-g2` Windows installer workflow; and
2. GREEN inherited repository `ci`.

Only after both are GREEN may issue #12 be closed as:

```text
DESKTOP-G2 — PASS
```

That PASS certifies an unsigned synthetic Windows x64 installer/runtime only and grants no release, signing or production authority.
