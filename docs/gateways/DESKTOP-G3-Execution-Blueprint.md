# DESKTOP-G3 — Local Data Protection, Secrets & Production-Security Architecture

**Branch:** `miqo/desktop-g3`  
**Entry:** certified DESKTOP-G2 SHA `e42cfb1dd9d57195606352973b125d210263f509`  
**Tracker:** issue #13  
**Status:** CONTROLLED EXECUTION  
**Boundary:** `SYNTHETIC_ONLY`

## 1. Purpose

DESKTOP-G3 addresses the security controls that remain after DESKTOP-G2 proved a self-contained Windows x64 installer/runtime.

The gateway focuses on:

- local data protection;
- secret/key storage and lifecycle;
- local packaged-service authentication;
- Tauri/WebView and local-origin hardening;
- diagnostic/log redaction;
- negative security evidence;
- fail-closed recovery behaviour.

G3 must preserve the certified MIQO domain model, immutable factual-profile semantics, provider evidence lineage, integrity controls and recommendation authority.

A G3 PASS is **not** production authorisation. It certifies the local Windows security architecture under synthetic execution only.

## 2. Certified inherited baseline

DESKTOP-G2 certified:

```text
Tauri 2 native host
Windows x64 / MSVC
NSIS current-user install
Node 22.23.3 packaged
Next.js standalone customer/admin
Fastify packaged API
PGlite 0.5.8 embedded persistence
host Node/npm required           false
Docker required                  false
external PostgreSQL required     false
boundary                         SYNTHETIC_ONLY
```

DESKTOP-G2 final certified head:

```text
e42cfb1dd9d57195606352973b125d210263f509
```

That head remains the G3 fallback baseline.

## 3. Current security inventory at entry

The following are accepted G3 entry risks, not certified production controls:

1. PGlite currently persists through its Node filesystem backend in the Tauri application-local data directory without MIQO-controlled at-rest encryption.
2. G2 intentionally preserves that local data directory across uninstall/reinstall.
3. No production key hierarchy, key rotation or recovery policy is certified.
4. `apps/desktop-runtime/src-tauri/tauri.conf.json` currently records `csp: null`.
5. The packaged runtime contains a static synthetic admin-gate string inherited from the DB-G10 synthetic test boundary.
6. The packaged services listen on loopback HTTP ports 3000, 3001 and 4000.
7. Loopback location alone is not treated as an authentication or authorisation boundary.
8. Fastify logs and child-process stdout/stderr must be re-proven not to expose secrets or protected customer/provider payloads.
9. No production secret store exists.
10. Signing, production identity, live credentials and real customer/provider data remain outside G3 authority.

## 4. Security architecture principles

### 4.1 No security theatre

G3 must not call data "encrypted at rest" merely because a plaintext database is encrypted only during orderly shutdown.

Any selected protection mechanism must prove that the authoritative persistent representation does not expose protected plaintext during normal persistence, restart or crash-recovery operation.

### 4.2 Key material

The preferred Windows key architecture is:

```text
Windows current-user protection
          ↓
protected MIQO master-key blob
          ↓
in-memory master key after authorised startup
          ↓
domain-separated derived keys
          ↓
data encryption / local-session capability use
```

The key-protection implementation must be current-user scoped and fail closed.

Machine-wide protection is not an acceptable substitute for current-user protection.

No plaintext master key may be committed, persisted in configuration, written to logs, exposed through diagnostics or embedded into the application binary.

### 4.3 PGlite protection decision

PGlite remains preferred because it preserves the already certified PostgreSQL-oriented schema and domain behaviour.

G3 must evaluate a real encryption mechanism behind the database boundary. Candidate approaches may include:

- a correctly implemented encrypted filesystem/storage adapter compatible with PGlite durability semantics;
- application-level authenticated encryption of sensitive persisted payloads where this can be comprehensive and domain-transparent;
- a controlled fallback persistence technology only if PGlite cannot meet the frozen security requirement.

A fallback cannot be adopted without full schema, migration, integrity, restart and recommendation parity evidence.

### 4.4 Cryptographic properties

Any application-level encryption adopted by G3 must provide authenticated encryption, unique nonces, explicit format/version metadata and key separation.

The implementation must use maintained platform/library cryptographic primitives rather than custom cryptographic algorithms.

### 4.5 Local-service authentication

The Windows runtime must not rely on `127.0.0.1` as authority.

G3 must remove any future-production dependence on the static synthetic admin gate and introduce a per-launch local capability/session model that:

- is generated at runtime;
- is not hard-coded;
- is not persisted as a reusable secret;
- is not logged;
- expires with the owned desktop runtime;
- fails closed when absent or invalid;
- preserves the current synthetic-only authority boundary.

This is local runtime hardening only and does not replace future real user identity/RBAC.

### 4.6 Diagnostics and logs

Logs and support evidence may record bounded metadata such as:

- app/runtime version;
- environment classification;
- request/correlation ID;
- error code/category;
- component name;
- key identifier/fingerprint that is non-secret;
- security-control state.

They must not automatically contain:

- plaintext cryptographic keys;
- bearer/session capability values;
- raw provider payloads;
- customer factual payloads;
- passwords/tokens/credential material.

## 5. Controlled sequence

### G3.0 — Frozen security inventory, threat model and data classification

Required evidence:

- exact inherited G2 SHA;
- current local-data path and retention model;
- persisted sensitive-data inventory;
- static-secret inventory;
- local-process/listener inventory;
- logging/diagnostic inventory;
- threat actors and trust boundaries;
- fail-closed/non-authorised states.

### G3.1 — Windows secret/key hierarchy architecture

Required evidence:

- current-user scoped key-protection decision;
- master-key generation/storage format;
- key-version and derivation model;
- recovery/rotation/revocation policy;
- wrong-user/wrong-machine behaviour;
- no secret in repo/config/logs/binary proof strategy.

### G3.2 — Encrypted PGlite persistence feasibility/parity decision

Required evidence:

- implementation spike against actual PGlite storage semantics;
- durability/restart/crash implications;
- migration compatibility;
- domain/integrity/recommendation parity;
- plaintext-at-rest inspection;
- explicit GO / FALLBACK decision.

No at-rest encryption PASS may be inferred from documentation alone.

### G3.3 — Local data-at-rest protection implementation

Required evidence:

- selected persistence protection implemented;
- existing synthetic database migration or controlled reinitialisation policy;
- restart persistence;
- immutable locked-profile preservation;
- raw evidence/recommendation lineage preservation;
- plaintext-negative scan.

### G3.4 — Secret-store lifecycle and fail-closed recovery

Required evidence:

- first-run key creation;
- reopen/reuse;
- key rotation;
- corrupted protected-key blob;
- missing key;
- wrong-user/wrong-machine access;
- reinstall retention semantics;
- no silent fallback to plaintext.

### G3.5 — Loopback API/session capability hardening

Required evidence:

- no packaged static admin/runtime secret used as authority;
- per-launch capability/session boundary;
- unauthorised loopback request rejection;
- origin/session binding;
- expiry at desktop shutdown;
- customer/admin journeys remain functional under the protected local runtime.

### G3.6 — Tauri/WebView/local-origin hardening

Required evidence:

- explicit CSP/security policy;
- remote executable UI remains prohibited;
- navigation remains controlled;
- devtools disabled in certified package;
- packaged-service listeners remain loopback only;
- no unexpected outbound packaged-service connection;
- browser security regression remains green.

### G3.7 — Logging, diagnostics and support-evidence redaction

Required evidence:

- sensitive-value test corpus;
- logs/support snapshot contain no secrets/customer payloads/raw-provider payloads;
- errors remain diagnosable through metadata/correlation IDs;
- crash/startup failures do not dump key material.

### G3.8 — Windows negative security proof

Required evidence:

- installed-package secret scan;
- application-local data plaintext scan;
- invalid/corrupt key tests;
- unauthorised local API tests;
- persistence/reinstall tests;
- security-control downgrade tests;
- fail-closed proof.

### G3.9 — Inherited regression + dedicated security CI

Required evidence:

- inherited repository CI GREEN;
- dedicated Windows G3 workflow GREEN;
- G2 installer/runtime regression GREEN;
- exact artefact/evidence SHA;
- no weakening of existing domain/integrity controls.

### G3.10 — Closure pack / immutable-head certification

Required evidence:

- exact certified executable/evidence head;
- residual-risk register;
- architecture decision records;
- workflow/artefact references and digests;
- hard-boundary confirmation;
- final GREEN runs on the closure head.

## 6. Threat model

G3 must address at minimum:

| Threat | Required control direction |
|---|---|
| User copies application-local data files | protected persisted representation must not reveal protected plaintext |
| Another local Windows user accesses copied data | current-user protected key must fail closed |
| Data directory copied to another machine | protected key/data must not silently decrypt under a different security context |
| Malicious local process calls loopback API | explicit per-launch local capability/session validation |
| Static secret extracted from package/repository | no static production authority secret |
| Logs/support bundle leak data | metadata-only/redacted diagnostics |
| Database/key file corruption | deterministic fail-closed state; no plaintext fallback |
| Uninstall/reinstall | certified retention policy preserved without weakening key protection |
| Runtime crash/restart | protected persistence remains recoverable and consistent |
| Remote/navigation injection | controlled Tauri navigation + explicit web security policy |

## 7. Data protection classification

The following payload classes are treated as protected for G3 design even though execution remains synthetic:

- canonical factual values;
- verified/discrepancy values;
- candidate-vehicle snapshots;
- optimisation/scenario values where they can identify or expose customer choices;
- raw provider response payloads;
- integrity/evidence payloads when they contain customer/provider-derived detail;
- audit metadata when it contains protected values;
- future provider credentials/tokens;
- local runtime capability/session secrets.

Opaque technical identifiers, timestamps, non-secret fingerprints and version metadata may remain plaintext where required for relational integrity and diagnostics, subject to the G3.0 inventory.

## 8. Cryptographic/key-management decision guard

G3 must not invent a production key-management scheme merely to pass a test.

For Windows, current-user platform protection is the preferred root of trust for local master-key wrapping. The implementation must not use a machine-wide scope as the normal key boundary.

A generated MIQO data key may be retained only as a protected blob; plaintext key material exists only in process memory for the minimum operational period.

Any derived keys must be domain-separated so that persistence encryption, local-session capability and other future uses do not share raw key material.

## 9. Persistence fallback guard

If G3.2 proves that PGlite cannot meet authenticated at-rest protection while preserving certified semantics, the gateway must STOP at the architecture decision and open a controlled fallback path.

SQLite/SQLCipher or another backend cannot be substituted silently.

A fallback requires:

```text
schema mapping
→ migration proof
→ lock/immutability proof
→ integrity proof
→ audit reconstruction
→ recommendation lineage
→ restart/reinstall proof
→ inherited regression
```

before it can replace PGlite.

## 10. Hard boundaries

DESKTOP-G3 does not authorise:

- merge to `main`;
- public release/deployment;
- signing/notarisation;
- auto-update;
- real IdP/RBAC activation;
- real customer data;
- real provider data/credentials;
- live insurer/provider activation;
- production infrastructure mutation.

Only synthetic fixtures and synthetic security-test secrets may be used.

## 11. External architecture basis

- PGlite exposes filesystem abstractions, including Node filesystem and alternative/custom filesystem integration: https://pglite.dev/docs/filesystems
- PGlite supports loading a data-directory representation at startup: https://pglite.dev/docs/api
- Windows DPAPI provides current-user data protection through `CryptProtectData` / `CryptUnprotectData`: https://learn.microsoft.com/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata

These references guide G3 architecture selection only. G3 PASS requires repository-specific executable evidence.

## 12. Entry rule

No G3 implementation may weaken or rewrite the DESKTOP-G2 certified head by convenience.

The G2 certified installer/runtime remains the fallback reference.

Security changes must proceed only on `miqo/desktop-g3` and must retain the `SYNTHETIC_ONLY` boundary until a separately authorised downstream programme changes it.
