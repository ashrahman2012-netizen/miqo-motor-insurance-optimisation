# DB-G10 — Accessibility, Security & Cross-Stack Hardening — Closure Pack

**Gateway:** DB-G10  
**Branch:** `miqo/db-g10`  
**Execution evidence head before this closure record:** `4984ed18486acc1b6842520eaddfdeffc0cf8750`  
**Execution CI:** run **#856 / 36007313008 — GREEN**  
**Status at creation:** G10.0–G10.7 PASS; G10.8 pending GREEN CI on this closure-pack commit.

## 1. Governing boundary

DB-G10 was executed under the following hard controls:

- synthetic data only;
- live insurer/provider activity disabled;
- no merge to `main` or any release/protected branch;
- no production signing, release or deployment;
- no real identity-provider activation;
- no production identity/provider credentials;
- no production secrets or infrastructure mutation.

The branch remains an isolated hardening branch. This closure record does not authorise promotion.

## 2. Gate outcomes

| Sub-gate | Outcome | Evidence |
|---|---|---|
| G10.0 Baseline inventory | PASS | stack/surface/security/accessibility inventory committed and tracker established |
| G10.1 Accessibility hardening | PASS | deterministic accessibility scanner, keyboard-focus check, reflow/focus styling and target-stack test |
| G10.2 API security hardening | PASS | CORS-origin rejection, body limit, security headers, request IDs, rate limiting, schema tightening, error redaction and negative API tests |
| G10.3 Browser/application security | PASS | Next.js security-header configuration and browser header assertions for customer/admin apps |
| G10.4 Synthetic access boundary | PASS | deterministic synthetic-only admin UI/API gate; fail-closed behaviour tested |
| G10.5 Dependency/supply chain | PASS | exact pins, clean `npm ci`, lockfile checks and `npm audit --audit-level=high` GREEN |
| G10.6 Abuse/cross-stack regression | PASS | malformed/oversized/content-type/origin/access/XSS-like cases plus inherited functional regression |
| G10.7 CI certification | PASS | run #856 GREEN across all four jobs |
| G10.8 Closure | PENDING FINAL CI | this closure record must itself receive GREEN branch CI |

## 3. CI evidence — run #856

Exact execution head:

```text
4984ed18486acc1b6842520eaddfdeffc0cf8750
```

Workflow:

```text
ci #856
run id: 36007313008
conclusion: success
```

Jobs:

- `locked-dependencies` — PASS
- `postgres-contract` — PASS
- `target-stack-sprint1` — PASS
- `db-g10-hardening` — PASS

The DB-G10 hardening job passed:

```text
npm ci
npm audit --audit-level=high
npm run verify:pins
npm run verify:boundary
npm run db:migrate
npm run db:seed:syn001
npm run test:security:api
npm run test:a11y
npm run test:security:browser
npm run test:e2e:target
npm run build
```

The locked-dependencies job additionally passed the existing domain/package/invariant test suites and build. PostgreSQL contracts covering Sprint 1 through Sprint 4 all passed. The inherited target-stack PostgreSQL/API/Playwright/build path also passed.

## 4. Accessibility hardening evidence

Implemented controls include:

- shared visible `:focus-visible` treatment;
- responsive/reflow safeguards at narrow viewport width;
- semantic root document language and page metadata;
- one-main/one-h1, accessible-name, heading-order, duplicate-ID, table-header and horizontal-overflow checks on the covered critical path;
- keyboard focus assertion;
- customer → lock → admin → optimisation accessibility journey in Playwright;
- CI script `test:a11y`.

### Accessibility closure statement

The covered prototype surfaces pass the deterministic DB-G10 accessibility contract in CI.

This is **not** a claim of formal WCAG 2.2 AA certification. The DB-G10 scanner is a bounded automated regression contract, not a substitute for independent accessibility audit, assistive-technology testing or comprehensive manual WCAG evaluation.

## 5. API security hardening evidence

Implemented controls include:

- configured customer/admin origin allowlist;
- explicit rejection of unknown browser origins;
- 128 KiB request-body limit;
- request correlation identifier;
- mutation rate limiting;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- restricted `Permissions-Policy`;
- frame denial;
- restrictive API CSP;
- `Cache-Control: no-store`;
- additional schema restrictions for factual writes/corrections;
- protocol-safe 400/413/415 responses;
- redacted generic internal error response;
- deterministic negative tests for hostile origin, payload size, rate limit, extra properties, malformed JSON and unsupported content types.

## 6. Browser/application security evidence

Customer and admin Next.js applications now assert:

- Content Security Policy;
- frame-ancestor denial;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- no-referrer policy;
- restricted permissions policy;
- Cross-Origin-Opener-Policy;
- Cross-Origin-Resource-Policy;
- removal of the `X-Powered-By` header.

Browser security tests pass in the DB-G10 hardening job.

## 7. Synthetic admin-access boundary

The admin UI and `/admin/*` API paths are protected by a deterministic synthetic-only gate.

Verified behaviours:

- UI gate fails closed when the synthetic configuration is absent;
- unauthorised synthetic admin access is rejected;
- configured synthetic handoff enables the controlled browser journey;
- admin API requests require the configured synthetic marker;
- no external IdP is contacted;
- no real identity credentials are used.

### Important limitation

The synthetic gate is **not authentication** and must never be treated as a production security control. Its marker is intentionally available to the synthetic browser harness to keep deterministic prototype testing possible. Real IdP/session/authorisation architecture remains explicitly outside DB-G10.

## 8. Abuse and regression evidence

DB-G10 adds deterministic coverage for:

- hostile browser Origin values;
- oversized request bodies;
- malformed JSON;
- unsupported content types;
- unexpected request properties;
- mutation bursts/rate limiting;
- missing/invalid synthetic admin access;
- script/HTML-like factual input rendered as text rather than executable markup;
- generic internal-error redaction.

Existing regression controls also remained GREEN, including factual-profile immutability, O-only optimisation/scenario boundaries, PostgreSQL contracts, target-stack customer journeys, admin trace reconstruction and builds.

## 9. Dependency and supply-chain result

At execution head `4984ed18486acc1b6842520eaddfdeffc0cf8750`:

- Node `22.16.0` pin passed;
- npm `10.9.2` pin passed;
- repository lockfile was accepted by clean `npm ci`;
- exact dependency-pin verification passed;
- `npm audit --audit-level=high` passed in both hardening and locked-dependencies jobs.

This means no audit finding at the configured **high-or-higher blocking threshold** caused the run to fail. It does not assert absence of lower-severity advisories or replace broader software-supply-chain assurance.

## 10. Material changed-file inventory

DB-G10 changes include:

- `.github/workflows/ci.yml`
- `package.json`
- `playwright.target.config.ts`
- `apps/api/src/server.ts`
- `apps/api/test/db-g10-security-postgres.test.ts`
- customer/admin application layouts, shared CSS and client helper changes;
- customer/admin `next.config.ts` security-header configurations;
- admin `middleware.ts` synthetic access gate;
- admin surface API-header integration;
- `e2e-target/db-g10-a11y-scanner.ts`
- `e2e-target/db-g10-accessibility.spec.ts`
- `e2e-target/db-g10-browser-security.spec.ts`
- `e2e-target/db-g10-synthetic-admin.spec.ts`
- `e2e-target/db-g10-abuse-regression.spec.ts`
- DB-G10 blueprint, baseline inventory and this closure pack.

The branch also includes small compatibility/stability edits to existing target-stack tests needed to keep the previously certified journeys green under the new synthetic admin boundary.

## 11. Residual risks / deferred controls

These are deliberate non-production residuals, not hidden PASS assumptions:

1. **Real authentication/authorisation:** not implemented. The synthetic admin gate is test-only.
2. **CSP production tightening:** the Next.js prototype policy currently permits `'unsafe-inline'` and `'unsafe-eval'` for compatibility with the present local Next.js execution path. A production policy would require nonce/hash-based design and verification.
3. **Rate limiting:** in-memory/process-local only; not distributed and not suitable as production abuse prevention.
4. **HSTS/TLS:** not implemented because DB-G10 operates only on loopback HTTP prototype services; production TLS/HSTS is outside scope.
5. **Accessibility:** no independent manual/assistive-technology audit and no formal conformance certification.
6. **Supply-chain assurance:** no release signing, provenance attestation, SBOM publication or deployment verification was authorised.
7. **Operational security:** no production secrets, secret manager, production logging/SIEM, WAF or infrastructure policy was introduced.
8. **Real provider/customer operation:** deliberately prohibited and untested.

None of these residuals authorise bypassing the next governance boundary.

## 12. Boundary confirmation

During DB-G10:

- data classification remained `SYNTHETIC`;
- live-provider activation remained disabled;
- mock/synthetic provider paths only were exercised;
- no real IdP was activated;
- no production deployment occurred;
- no release signing occurred;
- no provider activation occurred;
- no merge to `main` was performed by DB-G10 execution.

## 13. Final closure rule

After this document is committed, the resulting exact branch head must receive GREEN CI with all required jobs.

Only then may DB-G10 be recorded as:

```text
DB-G10 — PASS
```

That PASS certifies the hardening branch only.

It does **not** authorise merge, release, deployment, real-IdP activation, non-synthetic operation or provider activation. Any promotion requires a separate explicit controlled gateway.
