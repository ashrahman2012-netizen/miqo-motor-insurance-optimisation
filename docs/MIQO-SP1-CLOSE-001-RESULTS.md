# MIQO-SP1-CLOSE-001 — Target Stack Convergence & CI Closure Results

**Repository version:** 0.2.1  
**Date:** 18 September 2026  
**Sprint status:** **PARTIAL PASS — closure gates requiring npm registry + PostgreSQL runtime remain open**

## What changed in this increment

The existing Sprint 1 harness was retained as the regression oracle. The repository now also contains the target-stack implementation path:

`Next.js customer/admin → Fastify API → domain/application services → Drizzle repository → PostgreSQL`.

Implemented source includes:

- Fastify profile, validation, discrepancy, lock, correction, scenario and admin/audit routes;
- Drizzle PostgreSQL schema and connection layer;
- transactional profile locking + audit;
- transactional correction draft creation;
- deterministic/idempotent PostgreSQL `SYN-001` seed;
- Next.js C-01/C-03/C-05/C-07 and A-02 target-stack pages;
- named Playwright regression `SP1-IMMUTABILITY-001` for the target stack;
- PostgreSQL integration tests for API/service/SQL immutability, transaction rollback and restart persistence;
- strengthened SQL contract covering UPDATE, DELETE and INSERT rejection against locked profile values;
- correction-transaction rollback contract;
- one-current-LOCKED-version partial unique index;
- CI target-stack job for migrate → seed → SQL contract → API tests → Playwright → builds.

## Executed successfully in this environment

| Gate | Result |
|---|---|
| Node runtime `22.16.0` | PASS |
| npm manifest pin `10.9.2` | PASS |
| Exact dependency manifest pins | PASS |
| Prototype boundary verifier | PASS |
| Domain invariant tests | PASS — 4/4 |
| Sprint 1 risk-profile tests | PASS — 2/2 |
| Existing persisted harness tests | PASS — 7/7 |
| Domain walking-skeleton smoke | PASS |
| Existing browser-rendered Sprint 1 acceptance | PASS |
| Target API/DB TypeScript syntax parse | PASS |
| Target TSX syntax parse | PASS; module-resolution checks blocked by absent installed dependencies |

The existing executable harness still proves:

- locked factual API/service mutation rejected;
- F-class scenario mutation rejected;
- direct persisted mutation rejected;
- correction creates v2 while preserving v1;
- lock + audit is transactional;
- browser C-01 → C-03 → C-05 → C-07 → A-02 passes;
- persistence survives restart;
- audit history is retained.

## Strengthened PostgreSQL contract

The PostgreSQL contract now requires all of the following:

1. lock `RPV-v1` with `annual_mileage = 8000`;
2. direct `UPDATE` of the locked value → rejected;
3. direct `DELETE` of the locked value → rejected;
4. direct `INSERT` of a replacement fact into locked v1 → rejected;
5. F-class scenario delta → rejected;
6. O-class scenario delta → accepted;
7. approved correction creates v2 and preserves v1;
8. v1 → `SUPERSEDED`, v2 → `LOCKED`;
9. lock + audit failure rolls back;
10. correction + audit failure rolls back with no partial v3 transition;
11. raw provider response and normalised quote remain separate records.

## Gates not executable in this environment

### Real package-lock / npm ci

`npm install --package-lock-only` was attempted. Registry resolution timed out. The local npm cache is empty. Therefore:

- no fabricated `package-lock.json` has been created;
- `npm ci` cannot truthfully be marked PASS here;
- framework build/type-resolution cannot be truthfully marked PASS here.

### PostgreSQL 16 runtime

This execution environment contains no Docker/Podman/PostgreSQL binaries and no installable PostgreSQL package source. Therefore:

- the strengthened PostgreSQL migration/contract is implemented but not executed locally;
- target Fastify/Drizzle/PostgreSQL integration tests are implemented but not executed locally;
- target-stack Playwright test is implemented but cannot run without installed framework dependencies + PostgreSQL.

## CI closure path now encoded in repository

The GitHub Actions workflow now defines:

`checkout → Node/npm verification → package-lock required → npm ci → prototype guard → PostgreSQL 16 → migration → deterministic SYN-001 seed → PostgreSQL contract → target API/PostgreSQL tests → Playwright SP1-IMMUTABILITY-001 → customer/admin/API builds`.

No Sprint 2 work should begin until this target-stack job is green.

## Authoritative Sprint status

**Sprint 1 remains PARTIAL PASS.**

The repository is materially closer to closure: the target-stack code and CI contract now exist, while the two external-runtime gates (npm registry resolution and PostgreSQL 16 execution) remain the only blockers to executing the final convergence proof in this environment.
