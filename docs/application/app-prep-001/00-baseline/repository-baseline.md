# MIQOS-APP-PREP-001 — Repository Baseline

**Phase:** P0 — Baseline & Authority Freeze  
**Gate:** APP-G0  
**Repository:** `ashrahman2012-netizen/miqo-motor-insurance-optimisation`  
**Execution branch:** `miqos/app-prep-001`  
**Baseline parent:** `b6296e3cec5afbecccfdbd06da3f8d7ab8c2ae00`  
**Baseline source:** `main`  
**Baseline date:** 20 September 2026

## 1. Target-stack baseline

The repository is an npm-workspaces TypeScript monorepo with the production application boundaries already established:

- `apps/customer-web` — Next.js 16.3.5 / React 19.3 customer application.
- `apps/admin-web` — Next.js 16.3.5 / React 19.3 admin application.
- `apps/api` — Fastify 5.12.5 API/application boundary.
- `apps/integration-harness` — persisted integration harness.
- `packages/*` — domain, persistence, optimisation, scenario, quotation, integrity, comparison and UI package boundaries.

Pinned runtime/toolchain:

| Item | Baseline |
|---|---|
| Node.js | 22.16.0 |
| npm | 10.9.2 |
| TypeScript | 5.9.2 |
| Next.js | 16.3.5 |
| React | 19.3.0 |
| Fastify | 5.12.5 |
| Zod | 4.6.5 |
| PostgreSQL | 16-alpine in CI |
| Drizzle ORM | 0.45.2 |
| Playwright | 1.63.0 |
| Vitest | 5.0.1 |

## 2. Workspace/package boundary

Existing packages include:

`domain`, `canonical-model`, `questionnaire`, `validation`, `verification`, `risk-profile`, `integrity`, `optimisation`, `scenarios`, `quote-orchestration`, `mock-providers`, `normalisation`, `comparison`, `audit`, `db`, and `ui`.

The domain package contains the core F/V/D/O/I control classification and O-only scenario invariant. The database package contains explicit migrations and persistence schemas. `packages/ui` exists but is currently only a package boundary with a placeholder README; no production design-system implementation exists yet.

## 3. Existing application surface

Customer routes currently implement the prototype journey around a profile identifier, including review, lock, optimisation, generated scenarios, quote comparison, recommendations and completion.

Admin routes currently include profile inspection, audit history and end-to-end selection traces.

These pages are functional prototype screens, not the final application information architecture.

## 4. CI baseline

`.github/workflows/ci.yml` currently defines:

1. `locked-dependencies` — deterministic install, dependency pins, prototype boundary checks, domain/workspace tests, smoke test and workspace build.
2. `postgres-contract` — PostgreSQL 16 migration and SQL contract verification.
3. `target-stack-sprint1` — target-stack PostgreSQL/API/browser validation and production build.

CI enforces the synthetic prototype boundary through `MIQO_DATA_CLASSIFICATION=SYNTHETIC` and `MIQO_LIVE_PROVIDERS_ENABLED=false`.

## 5. Certified architecture baseline

The application preparation programme inherits:

- `MIQO-ENG-001 v1.0` as the engineering/technology baseline;
- the certified Sprint 1–4 repository behaviour;
- `MIQO-SP4-ACCEPT-001 v1.0` as the frozen Sprint 4 acceptance boundary;
- `MIQO-SP4-CLOSE-001` as the Sprint 4 certification record.

The certified Sprint 4 boundary explicitly excludes live-provider execution, real customer data, policy purchase/binding, factual optimisation, active `ADJUSTED_COMPARABLE` ranking and universal premium-plus-excess scoring.

## 6. P0 protection rule

APP-PREP may document, type, compose and prepare the application layer, but P0 does not authorise changes to certified domain behaviour, comparison methodology, provider activation, factual ownership, persistence lineage or integrity controls.
