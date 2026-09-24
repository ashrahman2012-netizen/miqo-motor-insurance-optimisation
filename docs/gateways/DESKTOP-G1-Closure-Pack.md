# DESKTOP-G1 — Distributable Runtime & Local Persistence Architecture — Closure Pack

**Gateway:** DESKTOP-G1  
**Branch:** `miqo/desktop-g1`  
**Tracker:** issue #11  
**Entry baseline:** DESKTOP-G0 certified SHA `6e6da34f5e1f802ad62a70d69724b34de2f813ba`  
**Certified executable evidence head:** `520e788b774b941494a6e097507a893a06ae7c78`  
**Status at creation:** G1.0–G1.7 PASS; G1.8 pending GREEN CI on this closure commit.

## 1. Purpose

DESKTOP-G1 removes DESKTOP-G0 developer-machine runtime dependencies while preserving the certified MIQO domain, integrity, persistence, recommendation and synthetic/live-provider boundaries.

This gateway certifies a self-contained **synthetic distributable runtime architecture** only. It does not authorise merge to `main`, public release, deployment, signing/notarisation, real IdP, real customer/provider data, live insurer/provider activation or production infrastructure mutation.

## 2. Frozen runtime architecture

### Web applications

- Next.js production runtime uses `output: "standalone"`.
- Static export remains rejected because MIQO uses runtime dynamic routes and admin middleware.
- Customer and Admin applications are staged as standalone production servers.

### Node runtime

- Exact bundled Node runtime: **22.23.3**.
- The Node executable is staged into the distributable runtime and validated against the official Node distribution checksum.
- End users are not required to install Node or npm.

### API

- The existing Fastify TypeScript API is bundled for Node sidecar execution.
- MIQO domain/service code remains authoritative.
- No insurance decision logic is moved into the Tauri shell.

### Desktop host

- Tauri 2 remains the authoritative native host.
- Tauri owns the bundled runtime process/resource lifecycle.
- The packaged runtime remains constrained to the existing synthetic boundary.

## 3. Frozen persistence architecture

**Selected embedded backend:** PGlite **0.5.8** with filesystem persistence.

The embedded path is introduced behind the controlled database adapter and has passed migration, restart/persistence and domain/invariant proof.

External PostgreSQL remains the reference backend for parity/regression evidence. It is not required by the certified distributable runtime.

SQLite/SQLCipher remains a fallback only if a later controlled gateway finds that PGlite cannot satisfy a newly introduced certified requirement.

At-rest encryption is not certified by DESKTOP-G1 and remains deferred because it introduces separate packaging, key-management and cryptographic-distribution controls.

## 4. Host dependency result

The certified distributable runtime proves:

| Host dependency | Required by certified G1 runtime |
|---|---|
| Node | **NO** |
| npm | **NO** |
| Docker | **NO** |
| External PostgreSQL | **NO** |

The runtime packages its own Node executable and uses embedded PGlite persistence.

## 5. Gateway outcomes

| Sub-gate | Requirement | Result |
|---|---|---|
| G1.0 | Runtime/persistence architecture inventory and decision | PASS |
| G1.1 | Production Next standalone outputs for customer/admin | PASS |
| G1.2 | Bundled Fastify API + exact Node runtime sidecar layout | PASS |
| G1.3 | Embedded PGlite adapter/schema parity | PASS |
| G1.4 | PGlite migration, restart, immutability and recommendation contracts | PASS |
| G1.5 | Tauri distributable resource/sidecar integration | PASS |
| G1.6 | Dependency-independence proof | PASS |
| G1.7 | Inherited regression + distributable-runtime CI | PASS |
| G1.8 | Closure pack / immutable-head certification | PENDING FINAL GREEN CI ON CLOSURE HEAD |

## 6. Exact executable evidence

Executable evidence head:

```text
520e788b774b941494a6e097507a893a06ae7c78
```

### Dedicated DESKTOP-G1 workflow

Workflow:

```text
desktop-g1 #10
run id: 36038604996
conclusion: SUCCESS
```

Jobs:

- `embedded-pglite` — PASS
- `distributable-runtime` — PASS
- `tauri-distributable` — PASS

The runtime manifest on this head records:

```json
{
  "nodeVersion": "22.23.3",
  "pgliteVersion": "0.5.8",
  "runtimeBoundary": "SYNTHETIC_ONLY"
}
```

The PGlite proof records:

```json
{
  "g1_3": "PASS",
  "g1_4": "PASS",
  "databaseBackend": "PGLITE",
  "externalPostgresRequired": false,
  "dockerRequired": false,
  "restartPersistence": "PASS",
  "boundary": "SYNTHETIC_ONLY"
}
```

The Tauri distributable proof records:

```json
{
  "g1_5": "PASS",
  "g1_6": "PASS",
  "nativeWindow": "PASS",
  "packagedRuntime": "PASS",
  "hostNodeRequired": false,
  "hostNpmRequired": false,
  "dockerRequired": false,
  "externalPostgresRequired": false,
  "databaseBackend": "PGLITE",
  "boundary": "SYNTHETIC_ONLY"
}
```

## 7. Exact workflow artefacts

All artefacts below are tied to executable evidence head `520e788b774b941494a6e097507a893a06ae7c78`.

| Artefact | ID | SHA-256 digest |
|---|---:|---|
| `desktop-g1-runtime-520e788b774b941494a6e097507a893a06ae7c78` | `10826365297` | `d08b79654a8acf80427d1bfc56008b0cc9dbcbd91e8922c05c9813d7e11a975f` |
| `desktop-g1-pglite-520e788b774b941494a6e097507a893a06ae7c78` | `10826165193` | `7bb12a143cd25f3793778cc56e7ce67781efb070701f338aac4d38148415199f` |
| `desktop-g1-tauri-520e788b774b941494a6e097507a893a06ae7c78` | `10825936239` | `94987d60c853dd9a43ba75e533252db26416a8e7ff904eacdae33b992cf6142a` |

## 8. Inherited repository regression evidence

On the same executable evidence head:

```text
ci #877
run id: 36038605043
conclusion: SUCCESS
```

Jobs:

- `locked-dependencies` — PASS
- `postgres-contract` — PASS
- `db-g10-hardening` — PASS
- `target-stack-sprint1` — PASS

This preserves the inherited PostgreSQL reference contracts, security/hardening controls and target-stack/domain regressions while certifying the new embedded distributable path.

## 9. Migration and integrity evidence

The embedded runtime successfully applied migrations `0001` through `0013`, including:

- walking skeleton;
- optimisation preferences;
- scenario generation;
- pre-quote integrity;
- raw provider capture;
- quote normalisation;
- selection/final integrity;
- optimisation policy persistence;
- Sprint 4 multi-scenario generation;
- MarketRoute quotation;
- occupation/vehicle integrity;
- recommendation;
- explainability/commercial-independence controls.

The proof also exercised locked factual-profile persistence and restart behaviour without requiring external PostgreSQL or Docker.

No evidence in DESKTOP-G1 authorises a provider-specific, real-data or production path.

## 10. Boundary confirmation

The certified G1 evidence remains:

```text
MIQO_DATA_CLASSIFICATION = SYNTHETIC
liveProvidersEnabled     = false
runtimeBoundary          = SYNTHETIC_ONLY
databaseBackend          = PGLITE
```

DESKTOP-G1 does **not** certify or authorise:

- merge to `main`;
- public release/deployment;
- code signing/notarisation;
- real IdP or production RBAC;
- real customer data;
- provider credentials;
- live insurer/provider activation;
- production infrastructure mutation;
- production at-rest encryption/key management.

## 11. Residual risks / downstream controls

1. The certified native/distributable proof is not itself a public release or production installer certification.
2. At-rest encryption/key management remains deferred to a separately controlled gateway.
3. Real identity, authorisation and production secret handling remain outside DESKTOP-G1.
4. External PostgreSQL remains the reference backend for parity/regression until a later controlled decision changes that status.
5. Windows/macOS/Linux release packaging, signing, update lifecycle and clean-machine installation evidence remain downstream concerns unless explicitly certified by a later gateway.
6. Live provider and real-customer operation remain prohibited by the synthetic boundary.

## 12. Immutable-head closure rule

This closure document creates a new documentation-only branch head.

G1.8 may be marked PASS only after the exact closure commit independently receives:

1. GREEN inherited repository `ci`; and
2. GREEN dedicated `desktop-g1` workflow.

The executable runtime evidence remains tied to:

```text
520e788b774b941494a6e097507a893a06ae7c78
```

If the closure commit changes executable source, package/runtime versions, persistence code, build scripts, workflow semantics or security boundaries, the evidence must be reclassified and re-proven rather than inherited.

Only after both closure-head workflows are GREEN may issue #11 be closed as:

```text
DESKTOP-G1 — PASS
```

That PASS certifies a self-contained **synthetic distributable runtime architecture** only and grants no production authority.
