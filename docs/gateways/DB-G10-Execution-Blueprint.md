# DB-G10 — Accessibility, Security & Cross-Stack Hardening

**Status:** OPEN — CONTROLLED EXECUTION  
**Branch:** `miqo/db-g10`  
**Baseline:** `main` at or after Sprint 4 certified merge `b6296e3cec5afbecccfdbd06da3f8d7ab8c2ae00`  
**Environment:** synthetic data only / non-production / no live providers

## Control boundary

DB-G10 authorises hardening, automated testing, CI evidence and documentation only.

The following remain explicitly prohibited unless separately authorised:

- merge to `main` or any protected/release branch;
- production signing, release or deployment;
- real-IdP activation or production identity credentials;
- non-synthetic customer or insurer data;
- live insurer/provider activation or credentials;
- production secrets or infrastructure mutation.

## Gate objective

Prove that the current MIQO cross-stack implementation is hardened across:

1. customer web accessibility;
2. admin web accessibility;
3. browser-facing security controls;
4. Fastify/API security controls;
5. input/error/data-boundary controls;
6. synthetic access-control boundaries;
7. dependency and CI security checks;
8. regression protection across customer web → API → domain/services → PostgreSQL.

DB-G10 must preserve the product invariants already certified in prior sprints, including immutable factual profile versions, O-class-only scenario deltas, deterministic quotation/recommendation behaviour, provenance and commercial independence.

## Entry conditions

- Sprint 4 certified baseline is present on `main`.
- Repository boundary remains `SYNTHETIC`.
- `MIQO_LIVE_PROVIDERS_ENABLED=false`.
- Target stack remains Next.js customer/admin + Fastify API + Drizzle/PostgreSQL 16.
- Existing CI, PostgreSQL contracts, API tests and target-stack Playwright journey remain mandatory regression controls.

## Phase structure

### G10.0 — Baseline inventory and test harness

Batchable.

- inventory customer/admin routes and interactive controls;
- inventory API routes and current Fastify plugins;
- record current HTTP headers, CORS behaviour, validation behaviour and error surfaces;
- establish DB-G10 test namespaces and scripts;
- preserve dependency pins and deterministic synthetic fixtures.

**Exit:** reproducible baseline evidence with no product-behaviour change.

### G10.1 — Accessibility hardening

Batchable.

Target WCAG 2.2 AA-aligned implementation/testing for the prototype surfaces without claiming formal external conformance certification.

Controls:

- valid landmarks and heading structure;
- explicit accessible names for form controls and buttons;
- labels/instructions/errors programmatically associated with controls;
- keyboard-only operability and visible focus;
- no keyboard traps;
- status/error messages exposed through appropriate live regions;
- semantic tables/lists where applicable;
- link/button purpose clarity;
- colour/contrast checks for implemented UI tokens;
- zoom/reflow resilience for primary journeys;
- automated accessibility scan in Playwright using a pinned accessibility scanner;
- browser assertions covering customer and admin critical paths.

**Exit:** no automated serious/critical accessibility violations in covered pages; keyboard journey passes; regressions fail CI.

### G10.2 — API security hardening

Batchable.

Controls:

- strict CORS allowlist from configured customer/admin origins;
- reject untrusted origins for browser CORS requests;
- security headers via Fastify security middleware;
- response-header assertions;
- request-body size limit;
- consistent schema validation and additional-property rejection on mutating endpoints;
- safe error responses without stack traces/internal database details;
- explicit JSON content expectations for mutating routes where applicable;
- rate limiting for mutation-heavy/sensitive prototype routes using deterministic test settings;
- request correlation identifier available to logs/responses without exposing secrets;
- retain `127.0.0.1` binding for the prototype runtime.

**Exit:** negative security tests pass and existing functional/API suites remain green.

### G10.3 — Browser/application security hardening

Batchable.

Controls:

- customer/admin security-header policy suitable for the synthetic prototype;
- restrictive framing policy;
- content-type sniffing protection;
- referrer policy;
- permissions policy;
- CSP compatible with the current Next.js implementation and local API connectivity;
- no secret-bearing client environment variables;
- safe external-link behaviour if/where external links exist;
- no production cookies, IdP sessions or real credentials introduced.

**Exit:** customer/admin header tests pass in target-stack CI; primary journeys remain functional.

### G10.4 — Synthetic access-control boundary

Batchable with an explicit prohibition on real IdP activation.

- protect admin surfaces/API routes with a deterministic synthetic-only access mechanism if access control is not already present;
- fail closed when synthetic access configuration is missing or invalid;
- keep customer synthetic journey usable without real identity infrastructure;
- assert that real/prod auth modes are rejected by the prototype boundary.

**Exit:** authorised synthetic admin test passes; unauthorised access is rejected; no external identity system is contacted.

### G10.5 — Dependency and supply-chain checks

Batchable.

- preserve exact dependency pins and lockfile integrity;
- execute `npm ci` from a clean checkout;
- run high-severity dependency audit as an evidence-producing CI step;
- record, not suppress, unresolved advisories;
- prohibit unpinned runtime additions;
- keep GitHub Actions versions explicit.

**Exit:** dependency-install reproducibility remains green and unresolved high/critical findings are surfaced as gate blockers.

### G10.6 — Cross-stack regression and abuse cases

Batchable.

Add deterministic tests for:

- malformed/oversized payloads;
- unexpected properties;
- unsupported methods/content types where relevant;
- hostile/unknown Origin values;
- invalid synthetic admin access;
- HTML/script-like input safely treated as data and not executed by UI rendering;
- API error redaction;
- existing profile immutability and scenario restrictions;
- customer recommendation journey;
- admin trace journey;
- PostgreSQL contracts and restart persistence.

**Exit:** functional + security + accessibility suites pass together on the same branch head.

### G10.7 — CI certification

Batchable.

CI must execute, at minimum:

```bash
npm ci
npm run verify:pins
npm run verify:boundary
npm run test
npm run test:api:postgres
npm run test:e2e:target
npm run test:a11y
npm run test:security
npm run build
```

Exact script names may be refined during implementation, but DB-G10 must end with dedicated accessibility/security evidence and the pre-existing regression suite.

**Exit:** one immutable branch head with all required CI jobs green.

### G10.8 — Gateway closure

User-interaction checkpoint.

Produce a closure pack containing:

- branch head SHA;
- CI run IDs and conclusions;
- changed-file inventory;
- accessibility findings/resolution log;
- security findings/resolution log;
- residual risks and deferred controls;
- confirmation that synthetic-only and no-live-provider boundaries still hold;
- confirmation that no real IdP, release, deployment or production activation occurred.

**Important:** G10.8 may certify the branch, but it does **not** authorise merge, release or deployment.

## Batch execution policy

Execute all deterministic repository changes, tests and CI remediation in batches. Stop only when:

1. a required decision changes product/security policy;
2. credentials, external identity or provider access would be required;
3. a merge/release/deployment boundary would be crossed;
4. a discovered risk cannot be safely remediated without changing approved product semantics.

## Codex block-command pattern

Use one bounded command block per sub-gate. Each block must:

1. restate the exact gate scope and prohibited actions;
2. inspect before editing;
3. make the smallest coherent patch;
4. run the narrowest relevant tests first;
5. run full regression before marking the sub-gate complete;
6. output changed files, commands run, test results and residual risks;
7. never merge or activate production systems.

Example execution envelope:

```text
GATE: DB-G10.<n>
MODE: controlled batch execution
BRANCH: miqo/db-g10
BOUNDARY:
- synthetic only
- no live providers
- no real IdP
- no merge/release/deploy
TASK:
- inspect current implementation
- implement only this sub-gate
- add deterministic tests
- run narrow tests, then required regressions
OUTPUT:
- changed files
- test evidence
- unresolved findings
- next safe sub-gate
STOP if any prohibited boundary is required
```

## Closure rule

DB-G10 is PASS only when accessibility, security and cross-stack regression evidence are green on one branch head and all prohibited production/activation boundaries remain untouched.

A failing or unresolved high-impact security/accessibility finding yields PARTIAL/BLOCKED, not an inferred pass.
