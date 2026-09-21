# G0 Evidence — Baseline & Dependency Freeze

**Gateway:** G0  
**Result:** PASS  
**Execution branch:** `miqos/desktop-prep-001`  
**Certified upstream SHA:** `ce211bf4e23643f1eab75e865210f4de121841fb`

## 1. Certified baseline

Repository source records:

- programme: `MIQOS-APP-BUILD-001`;
- increment: `BUILD-001J`;
- status: `CERTIFIED`;
- programme status: `COMPLETE`;
- certification decision: `PASS`;
- data classification: `SYNTHETIC`;
- live provider activity: `DISABLED`;
- production go-live: not authorised.

The final certification record identifies the bounded application increments 001A–001J and states that later source changes invalidate operational closing-head evidence until CI is green again.

The certified branch head is `ce211bf4e23643f1eab75e865210f4de121841fb`, commit message:

`APP-BUILD 001J: record final certification decision`.

The certified branch is 166 commits ahead of `main`; therefore Desktop PREP is deliberately based on the certified branch head, not `main`.

## 2. Repository/build baseline

Root workspace:

- package: `miqo`;
- version: `0.2.1`;
- package manager: `npm@10.9.2`;
- Node: `22.16.0`;
- workspaces: `apps/*`, `packages/*`;
- lockfile: `package-lock.json` lockfileVersion 3.

Primary application workspaces observed:

- `apps/admin-web` — Next.js 16.3.5 / React 19.3.0;
- `apps/customer-web` — Next.js 16.3.5 / React 19.3.0;
- `apps/api` — Fastify 5.12.5 / PostgreSQL/Drizzle;
- `apps/integration-harness`.

Relevant shared packages include:

- `@miqo/application-contracts`;
- `@miqo/application-adapters`;
- `@miqo/ui`;
- `@miqo/domain`;
- `@miqo/risk-profile`;
- `@miqo/audit`;
- database, optimisation, comparison, integrity, scenario, normalisation and quote-orchestration packages.

## 3. Existing verification contract

Root scripts include:

- `verify:boundary`;
- `verify:pins`;
- `test:invariants`;
- `test:sprint1`;
- `test:sprint1:persisted`;
- `test:api:postgres`;
- `test:e2e:target`;
- `certify:app-build-001`;
- `build`.

The existing CI workflow defines the three certification jobs named by the application certification manifest:

1. `locked-dependencies`;
2. `postgres-contract`;
3. `target-stack-sprint1`.

The workflow executes dependency pinning, repository-boundary checks, invariant suites, PostgreSQL contracts, adapter/UI checks, API PostgreSQL tests, target-stack Playwright, deterministic application certification and production builds.

### CI evidence visibility note

The connected GitHub interface used during G0 returned no legacy combined-status entries for the closing SHA, and its commit workflow-run helper exposes pull-request-triggered runs only. Accordingly, this G0 record does not invent a run ID or a run result that the interface did not return. The source certification record/manifest and exact certified SHA remain the upstream authority; run-level Desktop CI evidence is mandatory later under G7.

## 4. Reuse classification

### Reusable unchanged — candidate

- typed application contracts;
- application adapter interfaces/implementations where transport assumptions remain valid;
- domain/risk-profile invariants;
- backend API capability;
- audit semantics;
- deterministic environment boundary and certification controls.

### Reusable behind Desktop adapter — candidate

- web-oriented application adapters where browser transport/runtime assumptions need isolation;
- shared React UI components where Windows shell/runtime compatibility must be proven;
- admin information architecture and ViewModel semantics.

### Desktop-specific

- Windows host/runtime;
- application process lifecycle;
- installer/package identity;
- OS credential/secure storage integration;
- update/uninstall mechanism;
- desktop diagnostics/support bundle;
- signing integration;
- Windows CI packaging jobs.

### Frozen / prohibited from opportunistic modification

- certified factual immutability and scenario-control semantics;
- backend-owned objective/comparison/recommendation/integrity rules;
- synthetic/live-provider boundary;
- provider-response versus normalised-quote evidence separation;
- certified application invariants and audit semantics.

### Unresolved — assigned to later gateways

- Windows UI/runtime technology: G1;
- Desktop capability/trust boundary: G2;
- production identity integration: G3;
- installer/package/signing technology: G4;
- environment/configuration implementation: G5;
- Desktop observability: G6;
- Windows CI/release mechanics: G7.

## 5. G0 exit-criteria matrix

| Criterion | Result |
|---|---|
| Certified upstream revision unambiguously identified | PASS |
| Repository state reproducible from exact SHA and lockfile | PASS |
| Existing build/test baseline known | PASS |
| Desktop PREP boundary explicit | PASS |
| Prohibited upstream modifications documented | PASS |
| Repository-access blocker resolved/classified | PASS |

## 6. Gateway decision

**G0 — PASS**

Next controlled execution point:

`MIQOS-DESKTOP-PREP-001 / BC-01 / G1 — Desktop Architecture Decision`
