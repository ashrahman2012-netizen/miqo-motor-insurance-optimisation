# MIQO-SP4-EXEC-001K — Full Clean CI & Final Sprint 4 Certification

**Status:** EXECUTED — final certification checkpoint pending  
**Parent:** MIQO-SP4-EXEC-001 — Explainable Multi-Scenario Customer Optimisation  
**Target gate:** S4-G16 only  
**Baseline:** `eb463edfa36db450e1025407840b4764d9d2167a`  
**Frozen acceptance source:** `MIQO-SP4-ACCEPT-001 v1.0`

---

## 1. Purpose

Close the final frozen Sprint 4 acceptance gate without changing product behaviour.

S4-G16 requires:

> From a clean checkout/database: deterministic dependency install, migrations/contracts, Sprint 1–3 regressions, Sprint 4 domain/API/PostgreSQL tests, target-stack browser journey and production builds all pass GREEN.

No new feature implementation is authorised by this increment.

---

## 2. Clean-environment evidence

The fully certified S4-G0 → S4-G15 branch head:

```text
eb463edfa36db450e1025407840b4764d9d2167a
```

was executed by GitHub Actions run:

```text
#115 / 35473478191
```

The workflow provisioned fresh GitHub-hosted runners and a fresh PostgreSQL service and executed:

```text
checkout
Node 22.16.0
npm ci
pin verification
synthetic/live-provider boundary verification
Sprint 1 regression suites
Sprint 2/3 inherited package regressions
Sprint 4 optimisation/scenario/orchestration/comparison/integrity suites
PostgreSQL migrations
PostgreSQL SQL contracts
synthetic seed
full API/PostgreSQL integration tests
Chromium target-stack Playwright journeys
production builds
```

Mandatory jobs:

```text
locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

Within the target-stack job:

```text
npm ci                                             PASS
verify:boundary                                    PASS
db:migrate                                         PASS
db:seed:syn001                                     PASS
postgres contract                                  PASS
test:api:postgres                                  PASS
Playwright Chromium                                PASS
npm run build                                      PASS
```

This satisfies the literal S4-G16 clean-checkout/database acceptance condition.

---

## 3. Regression coverage retained

The clean run includes the inherited certified baseline and all Sprint 4 additions, including:

- locked factual immutability;
- O-only ScenarioDelta writes;
- raw-response preservation;
- normalisation separation;
- shortlist/selection/final-integrity semantics;
- Optimisation Catalogue v2.1 and Customer Objective Model v1;
- deterministic multi-scenario generation and invalid-combination rejection;
- MarketRoute separation and multi-route synthetic quotation;
- occupation mapping and PRE_PURCHASE candidate-vehicle integrity;
- deterministic objective-specific RecommendationSets;
- comparison-methodology boundary;
- persisted explainability and commercial independence;
- restart persistence / exact provenance;
- customer Sprint 4 browser journey;
- admin Sprint 4 end-to-end trace.

---

## 4. Scope boundary

001K does not:

- alter application, domain or database logic;
- merge `miqo/sprint4` to `main`;
- create the post-merge Sprint 4 tag;
- enable live providers;
- introduce real customer data;
- enable purchase, binding or payment;
- activate `ADJUSTED_COMPARABLE`;
- introduce universal premium-plus-excess scoring;
- permit commercial remuneration to influence recommendations.

Promotion to `main`, post-merge main CI and final repository tag remain a separate controlled promotion phase, consistent with the Sprint 3 closure pattern.

---

## 5. Gate determination

```text
S4-G16 — Full clean CI    PASS
```

Authoritative clean execution: **GitHub Actions #115 / 35473478191 — GREEN**.

The documentation-only certification commit produced by this increment must itself receive a GREEN checkpoint CI before the certified Sprint 4 branch head is treated as final.

**End of MIQO-SP4-EXEC-001K**
