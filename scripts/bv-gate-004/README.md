# BV-GATE-004 Product Candidate — Controlled UAT

**Status:** isolated engineering candidate. **Not merged**, not callable from the customer API and not SEOPA-connected.

## Run locally (synthetic-only)

Use Node 22.16.0 / npm 10.9.2, and from repository root:

```sh
npm ci
npm audit --audit-level=high
MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_LIVE_PROVIDERS_ENABLED=false npm test -w @miqo/balanced-value
MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_LIVE_PROVIDERS_ENABLED=false node --experimental-strip-types --test scripts/bv-gate-003/test.mjs
MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_LIVE_PROVIDERS_ENABLED=false node --experimental-strip-types scripts/bv-gate-004/run.mjs
```

## Exact dependencies

`@miqo/balanced-value` declares exact Ajv and ajv-formats pins; the package-lock was regenerated with authenticated npm registry integrity metadata by the dedicated `bv-gate-004-lockfile-certification` workflow. That workflow verified **18/18 BV4 candidate tests and 52/52 original BV3 synthetic tests** against the regenerated workspace lockfile.

The special lockfile change is committed by GitHub Actions using a repository workflow token, which does not automatically trigger normal push workflows. This README commit is a **distinct, explicit GitHub API commit** that launches the dedicated BV4 synthetic UAT and original full repository regression on one final HEAD.

## Scope

- New independent workspace product package and exact dependency lock.
- Candidate non-routable synthetic-only evaluator.
- English plain-language total-payable and contingent-excess explanation model.
- Official-source FCA, ICO/DUAA governance review and unresolved release-blocker register.
- Reproducible hypothetical input and audit receipts.

**Never** activate `BALANCED_COST_AND_EXPOSURE`, edit the SQL objective eligibility constraint, call insurer/SEOPA production APIs, bind insurance, redirect for purchase or handle live customer data under this gate.

The next integration gate is subject to distinct authority, legal/partner review, and passing CI on this final source commit.
