# MIQO

UK Motor Insurance Quotation Optimisation System — MVP Prototype.

> **SYNTHETIC DATA ONLY · NON-PRODUCTION · NON-CUSTOMER · NON-LIVE-PROVIDER**

This repository is the engineering bootstrap and Sprint 1 persisted walking-skeleton integration for MIQO.

## Core invariant

```text
RiskProfileVersion = immutable factual input
Scenario           = permitted O-class delta only
QuoteRequest        = RiskProfileVersion + Scenario
```

A scenario cannot write to a locked factual profile version. The executable harness enforces this in the domain layer, application service and database trigger.

## Runtime pins

- Node `22.16.0`
- npm `10.9.2`
- exact dependency versions in workspace manifests (`npm run verify:pins`)

A repository `package-lock.json` is still required before the full framework build is reproducible with `npm ci`.

## Dependency-light verification

These commands run without downloading framework dependencies:

```bash
npm run verify:boundary
npm run verify:pins
npm run test:invariants
npm run test:sprint1
npm run test:sprint1:persisted
npm run smoke:domain
npm run test:sprint1:browser
```

The browser acceptance driver renders the real Sprint 1 harness screens in Chromium and submits their values to the real local API. Chromium network access is administratively blocked in the build environment, so the test driver bridges browser control values to the API out-of-browser; the same repository also contains a normal `@playwright/test` E2E test for a network-enabled CI runner.

## Synthetic seed

```bash
MIQO_HARNESS_DB=data/local.sqlite npm run seed:syn001
```

`SYN-001` is deterministic and idempotent.

## PostgreSQL target

```bash
npm run db:up
psql "$DATABASE_URL" -f packages/db/migrations/0001_walking_skeleton.sql
psql "$DATABASE_URL" -f scripts/postgres-sprint1-contract.sql
```

The migration contains database-level locked-profile guards and O-only scenario-delta enforcement. A PostgreSQL 16 contract job is defined in `.github/workflows/ci.yml`.

## Full stack after lockfile generation

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
```

Do not begin Sprint 2 until the full locked-dependency/PostgreSQL/browser/build CI path is green.

## Sprint 1 closure convergence (v0.2.1)

The target path is now implemented in source as:

```text
customer-web / admin-web
        ↓
Fastify API
        ↓
domain/application services
        ↓
Drizzle
        ↓
PostgreSQL 16
```

Run in a network/Docker-enabled environment:

```bash
npm install                    # first authorised lockfile generation only
npm ci                         # all subsequent clean installs
npm run db:up
npm run db:migrate
npm run db:seed:syn001
PGPASSWORD=miqo psql -h 127.0.0.1 -U miqo -d miqo -f scripts/postgres-sprint1-contract.sql
npm run test:api:postgres
npx playwright install --with-deps chromium
npm run test:e2e:target
npm run build
```

`SP1-IMMUTABILITY-001` is implemented under `e2e-target/` and must be green before Sprint 1 is declared complete.
