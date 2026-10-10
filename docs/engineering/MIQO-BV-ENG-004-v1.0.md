# MIQO-BV-ENG-004 v1.0 — Controlled Product Candidate Handoff

**Gateway:** BV-GATE-004. **As at:** 10 October 2026.
**Base:** BV-GATE-003 synthetic UAT certified source `21dde8b4b0b9fd61167816e49578b8e04d5f8bc7`. Its parent was security-validated `main` `5488d29735983d1c2a7f09f283e7adb0a2fe138a`.
**Authority:** implementation + synthetic proofs + review. **Not** merge/activation/deployment/SEOPA integration.
**Product classification:** DORMANT_CANDIDATE.

## Implemented boundary

- `packages/balanced-value` is an independent npm workspace package and candidate product domain module. It has **exact direct dependencies** on `ajv@8.20.0`, `ajv-formats@3.0.1` and existing `@miqo/comparison@0.1.0`. Its lockfile integrity is regenerated with pinned Node 22.16.0/npm 10.9.2 in the dedicated CI; no fabricated checksums.
- `src/engine.mjs` conservatively ports the BV-GATE-003 deterministic eligibility and constraints model: locked factual profile, scenarios, verification flags, finance breakdown, explicit customer thresholds, stable sorting, exclusions, Pareto alternatives, hashes.
- `src/gate.mjs` only exposes `runCandidateEvaluation`, requires a **bounded synthetic-only execution context** and explicit environment flags, and refuses SEOPA credentials; it exports a `BV4_PRODUCT_STATE` status of **NOT_REGISTERED**. The synthetic test authority literal is not authentication, a security system or substitute for operating permissions.
- `src/explanation.mjs` constructs English-language, currency-formatted text fields for consumer-comprehension review: constraints, selected option, absolute cheapest reference, annual cash vs financed total, compulsory/voluntary excess, telematics and genuine named-driver count, reason for no match, signed price/excess trade-off and synthetic disclaimers. The information is not displayed in the production UI.
- `test/product-candidate.test.mjs` verifies backward compatibility against BV3 UAT, reason-code exclusions, blocked provider operations, exact trade-off arithmetic, unconfirmed preferences, controlled fields, stable hashes and no customer personal facts leaking into explanation.
- `scripts/bv-gate-004/run.mjs` emits deterministic JSON decision, copy and governance receipts under CI only.
- This branch makes **no modification** to `packages/optimisation/src/index.ts`, `packages/comparison/src/index.ts`, the Fastify API router, Next customer/admin apps, or the SQL database eligibility constraints. The four existing authorised Sprint 4 objectives remain unchanged.

## Integration map (deliberately disconnected)

```
LockedRiskProfile facts + fingerprint (validated)
         |
         v
Existing synthetic scenario/normalisation
         |
         v
BV-GATE-003 strict JSON Schema and referential profile controls
         |
         v
[ BV-GATE-004 candidate workspace package ]
         |-- deterministic constraint evaluator (non-routable)
         |-- customer copy/evidence presenter (non-routable)
         |-- bounded UAT/CI access only
         v
Synthetic evidence JSON in Actions (not live offers)

X /apps/api Sprint 4 objective routes — NOT CONNECTED
X /apps/customer-web UI — NOT CONNECTED
X /packages/db migration — NOT CHANGED
X SEOPA / insurer provider APIs — NOT CONNECTED
X quote bind / payments / customer information — NOT CONNECTED
```

## Release readiness matrix

| Requirement | Candidate disposition |
|---|---|
| Exact package dependencies | Implemented in isolated package; CI lockfile must verify |
| Existing BV3 52-test contract | Regression requirement |
| BV4 candidate behaviour tests | Dedicated UAT requirement |
| Existing repository security and DB regression | 4 independent CI jobs on same HEAD required |
| Actual insurer price, restrictions, cover parity, partner permissions | BLOCKED |
| FCA insurance distribution perimeter and permissions | Unreviewed externally — BLOCKED |
| UK GDPR/DUAA safeguards and DPIA for actual personal data | Unreviewed externally — BLOCKED |
| Live/API/quote arrangements, UI integration and objective flag | EXPLICITLY DORMANT |
| Release ownership, monitoring, error handling, rollback and consumer suitability | Requires next separately authorised design |
| Merging into certified `main` | NOT AUTHORISED |

## Non-negotiable acceptance

BV-GATE-004 can be **IMPLEMENTATION_CANDIDATE_UAT_PASS** when locked dependencies, BV3 UAT, BV4 UAT and all applicable four baseline CI jobs pass on a single immutable source HEAD. This is not licence to present the engine as a UK-compliant insurance advice service. Unresolved product/regulatory/partner gates listed in `docs/governance/MIQO-BV-GOV-004-v1.0.md` remain NO-GO regardless of successful code tests.

**Future activation requires fresh authority** for objective versioning and non-retroactive SQL migrations, display and accessibility design, actual policy-benefit schema and source provenance, provider contract certification, privacy controls, user rights, regulatory analysis and deployment UAT.
