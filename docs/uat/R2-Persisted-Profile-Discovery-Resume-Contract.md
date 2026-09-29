# R2 / UAT-DESKTOP-002 — Persisted-Profile Discovery & Safe Resume Contract

**Workstream:** DESKTOP-UAT  
**Scope:** R2 only  
**Branch:** `miqo/desktop-uat-remediation`  
**Security reference:** frozen DESKTOP-G3 closure head `939e935d23753886a9697341764910333ccce3e7`  
**R1 implementation reference:** `09a69c226aa4ee2493b7a49c5749d214af6013bf`  
**Boundary:** `SYNTHETIC_ONLY`

## 1. Problem confirmed by physical UAT

After a clean desktop restart, the protected store and keyring survive and reopen successfully, but the customer shell always renders C-01 and offers only `Start synthetic profile`.

The existing customer entry page is stateless and the API exposes profile lookup only when a caller already knows a `profileId`. There is no profile-discovery route.

R2 must expose retained local profiles without changing protected persistence semantics.

## 2. Current source contract

### Customer entry

`apps/customer-web/app/page.tsx`

- renders C-01;
- performs `POST /profiles` only after the explicit `Start synthetic profile` action;
- does not query retained profiles;
- does not auto-resume.

### Existing customer profile read

`GET /profiles/:profileId`

Returns all risk-profile versions for a known profile, including:
- version ID;
- version number;
- status;
- locked timestamp;
- factual values.

### Existing profile persistence model

The protected database already persists:
- `profile.profile_id`;
- `profile.created_at`;
- `risk_profile_version`;
- canonical factual values;
- audit history.

No additional persistence mechanism is required for discovery.

### Existing lifecycle states

Current profile-version statuses are:
- `DRAFT`;
- `LOCKED`;
- `SUPERSEDED`.

Normal current-version flows resolve to `DRAFT` or `LOCKED`. A latest `SUPERSEDED` version is treated as a fail-closed/unsupported resume state.

## 3. Smallest safe R2 API addition

Add one read-only customer endpoint:

`GET /profiles`

Response:

```json
{
  "items": [
    {
      "profileId": "PRO-SYN-...",
      "createdAt": "2026-09-29T14:12:23.000Z",
      "currentVersion": {
        "versionId": "RPV-SYN-...",
        "versionNo": 1,
        "status": "LOCKED",
        "lockedAt": "2026-09-29T14:20:00.000Z"
      }
    }
  ]
}
```

Rules:

1. Read-only; it must not create, update, lock, validate or audit anything.
2. Query only the existing protected database.
3. Do not introduce localStorage, a plaintext sidecar/index, registry state, a new database, or a new migration.
4. Do not return canonical factual values in the discovery list.
5. Deterministic ordering: newest profile first; profile ID as a stable tie-breaker.
6. Every item represents one existing local profile and its latest version.
7. If a profile has no version despite the transactional invariant, fail closed rather than fabricate a resumable state.
8. The route remains protected by the existing local runtime capability/origin controls automatically applied to all non-health API requests.

## 4. Smallest safe customer entry behaviour

On C-01 load:

1. perform `GET /profiles`;
2. render an explicit loading state while discovery is pending;
3. render an explicit error state if discovery fails;
4. never create a profile during discovery;
5. preserve the existing explicit `Start synthetic profile` action.

### Zero profiles

Render only the new-profile action.

No automatic profile creation.

### One profile

Render:
- one explicit `Resume profile` action;
- the existing separate `Start synthetic profile` action.

Do not auto-redirect.

### Multiple profiles

Render a deterministic chooser using the discovery ordering.

Each row shows only:
- profile identifier;
- current version number;
- current status;
- created timestamp.

Do not expose factual values on C-01.

## 5. Safe-resume mapping

R2 is a **safe-state resume**, not exact last-screen restoration.

No attempt is made to infer the precise last visited page from audit history.

### Current status = DRAFT

Resume to:

`/profile/{profileId}/section/identity`

Before allowing save, the section page must hydrate any existing values from the latest DRAFT version returned by `GET /profiles/:profileId`.

Persisted values must replace UI defaults for fields that already exist.

Opening/resuming the page itself must not write data or append audit events.

### Current status = LOCKED

Resume to:

`/profile/{profileId}/optimisation`

That route already identifies the locked version and reads any existing optimisation preferences.

Opening/resuming the page itself must not alter factual profile state.

### Current status = SUPERSEDED

Do not provide an active resume action.

Render the profile as unavailable for resume and expose no mutation path from C-01.

This is fail-closed handling for an unexpected latest-version state.

## 6. DRAFT hydration constraint

The existing C-03 section currently initializes synthetic default values in React state and only reads profile status.

R2 must additionally hydrate existing current-version factual values.

Required properties:

- read latest version only;
- only populate fields actually present in persisted data;
- do not mutate on hydration;
- do not create a new version;
- do not change control class/source lineage;
- do not unlock a locked version;
- preserve existing correction-version semantics.

R2 does not redesign the questionnaire or default-value policy beyond preventing persisted DRAFT values from being hidden/overwritten by stale UI defaults during resume.

## 7. Security and integrity invariants

R2 must preserve:

- AES-256-GCM protected persistence;
- no authoritative plaintext PGDATA;
- checkpoint-before-ACK durability;
- DPAPI user+machine key lifecycle;
- per-launch runtime capability;
- same-origin/loopback access controls;
- locked-profile immutability;
- correction-by-new-version semantics;
- factual source lineage;
- audit reconstruction;
- no live providers;
- `SYNTHETIC_ONLY`.

Discovery and resume must not weaken or bypass any mutation control.

## 8. Explicit non-goals

R2 does **not** implement:

- exact last-screen restoration;
- browser/localStorage resume markers;
- a plaintext profile index;
- production user identity or authentication;
- account sync;
- cross-machine profile recovery;
- profile deletion/archive;
- profile naming;
- automatic selection of a “most likely” profile;
- automatic navigation when exactly one profile exists;
- changes to admin authority;
- application-shell visual redesign;
- installer redesign.

Those belong to later product work where separately authorised.

## 9. Required regression tests

### API

1. `GET /profiles` returns zero items on an empty database.
2. Multiple profiles are returned in deterministic newest-first order.
3. Each summary identifies the exact latest version and status.
4. Listing profiles creates no audit event and performs no mutation.
5. Listing still works after API/protected-store restart.
6. Existing profile lock/correction/immutability tests remain GREEN.

### Customer

1. zero profiles → C-01 shows new-profile action and no resume action;
2. one DRAFT → explicit resume + explicit new-profile actions;
3. one LOCKED → explicit resume + explicit new-profile actions;
4. multiple profiles → deterministic chooser;
5. C-01 load does not issue `POST /profiles`;
6. resuming a DRAFT hydrates persisted values;
7. DRAFT page load creates no mutation/audit event;
8. resuming a LOCKED profile routes to optimisation without altering facts;
9. latest SUPERSEDED state exposes no active resume path.

### Desktop physical UAT

After creating and locking a profile:

1. close MIQOS Desktop;
2. confirm owned runtime terminates;
3. relaunch;
4. retained profile appears on C-01;
5. choose Resume;
6. locked profile opens through the safe LOCKED resume route;
7. original locked facts and audit remain unchanged;
8. no new profile is created merely by relaunch/discovery.

## 10. R2 completion condition

R2 may close only when:

- discovery is read-only and capability-protected;
- zero/one/many profile states are deterministic;
- DRAFT resume hydrates persisted facts;
- LOCKED resume enters the existing locked optimisation path;
- no automatic profile creation/navigation occurs;
- no new plaintext persistence/index exists;
- targeted API/customer tests pass;
- inherited repository CI passes;
- inherited DESKTOP-G3 security workflow passes;
- physical Windows restart/resume UAT passes.

