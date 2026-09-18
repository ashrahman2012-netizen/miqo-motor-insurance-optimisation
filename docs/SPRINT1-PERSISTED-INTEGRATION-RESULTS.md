# Sprint 1 — Persisted Walking Skeleton Integration Results

**Status:** Partial PASS — executable invariant/browser/persistence proof complete; PostgreSQL/network-dependent gates remain open.  
**Date:** 18 September 2026

## Executed successfully in this build environment

- prototype boundary verification passes;
- environment rejection occurs before database creation when the data classification is not `SYNTHETIC`;
- exact dependency versions are pinned in manifests and Node/npm runtime versions are pinned;
- domain invariant tests pass;
- Sprint 1 risk-profile validation/locking tests pass;
- persisted integration tests pass using the dependency-light Node `node:sqlite` harness;
- direct SQL mutation of a locked factual value is rejected by a database trigger in the executable harness;
- customer/application-service mutation of a locked factual value is rejected;
- scenario creation rejects an F-class delta;
- incomplete profiles cannot lock;
- profile lock + audit event behaves transactionally under simulated audit failure;
- approved correction creates v2 while preserving the v1 factual value;
- browser-rendered C-01 → C-03 → C-05 → C-07 → A-02 journey passes using Chromium;
- locked fields render read-only and the correction/versioning action is visible;
- persisted state survives server restart;
- SYN-001 seed is deterministic/idempotent in the executable harness;
- audit history retains both lock and correction events.

## PostgreSQL implementation now present in source

`packages/db/migrations/0001_walking_skeleton.sql` now includes:

- required foreign keys;
- `scenario.risk_profile_version_id`;
- `scenario_delta.control_class = 'O'` database check;
- separate raw-provider-response and normalised-quote tables;
- discrepancy persistence;
- database triggers preventing inserts/updates/deletes against locked/superseded factual values;
- profile-version mutation guard permitting only `LOCKED → SUPERSEDED` for an existing locked version.

`scripts/postgres-sprint1-contract.sql` exercises:

- empty-database fixture creation;
- factual lock;
- rejected direct mutation;
- rejected F-class scenario delta;
- accepted O-class delta;
- v1 preservation + v2 correction/lock;
- lock/audit rollback behaviour;
- raw/normalised quote separation.

The GitHub Actions workflow contains a PostgreSQL 16 service job to run the migration and this contract.

## Open gates before Sprint 1 can be called complete

1. A real `package-lock.json` must be generated in a network-enabled environment and committed. This execution environment blocks npm-registry network access, so the lockfile could not be generated or `npm ci` verified here.
2. PostgreSQL/Docker are not installed in this execution environment. The PostgreSQL migration and contract are implemented but could not be executed locally here.
3. The target Next.js/Fastify/Drizzle applications remain framework stubs. The currently executable integrated browser/API/domain/persistence proof is the dependency-light Node harness; the final target adapters still need dependency installation and convergence onto PostgreSQL.
4. The full CI install → PostgreSQL migrate/contract → browser test → build path therefore remains intentionally gated by the missing lockfile.

## Current engineering decision

Do **not** enter Sprint 2 yet.

The architectural invariant has now survived an executable persisted application path and aggressive mutation/versioning tests. Sprint 1 closes only when the same behaviour is green on the pinned Next.js/Fastify/PostgreSQL stack through the repository CI gate.
