# MIQO-SP4-ACCEPT-001 — Sprint 4 Acceptance Matrix v1.0

**Document ID:** MIQO-SP4-ACCEPT-001  
**Version:** 1.0  
**Status:** FROZEN  
**Parent:** MIQO-SP4-PREP-001 v1.0  
**Purpose:** Close P4-G12 by fixing the Sprint 4 implementation scope and acceptance gates before feature execution begins.

---

## 1. Sprint 4 title and objective

**MIQO Sprint 4 — Explainable Multi-Scenario Customer Optimisation**

Sprint 4 shall extend the certified Sprint 1–3 prototype by adding:

- versioned Optimisation Catalogue v2;
- explicit customer objectives;
- deterministic multi-scenario exploration;
- multiple synthetic provider/channel MarketRoutes;
- objective-specific analysis;
- persisted explainable RecommendationSets;
- recommendation provenance through selection and final integrity.

Sprint 4 shall **not** introduce:

- live insurers or live comparison sites;
- real customer data;
- policy binding or payment;
- arbitrary provider scraping;
- commercial-remuneration influence on recommendations;
- a universal premium-plus-excess score;
- active ADJUSTED_COMPARABLE ranking;
- factual optimisation.

---

## 2. Frozen Sprint 4 acceptance gates

| Gate | FROZEN v1.0 acceptance requirement |
|---|---|
| **S4-G0 — Certified baseline protection** | All Sprint 1–3 certified regression behaviour remains green. No Sprint 4 path may weaken factual immutability, O-only scenario writes, raw-response preservation, normalisation separation, selection lineage or final-integrity semantics. |
| **S4-G1 — Optimisation Catalogue v2** | Optimisation Catalogue v2 is persisted, versioned and auditable. Every control has an explicit classification, permitted values, dependencies, constraints and applicability metadata. |
| **S4-G2 — Customer Objective Model v1** | The customer's selected objective is persisted and versioned. Executable objectives are explicit decision lenses rather than hidden ranking assumptions. `BALANCED_COST_AND_EXPOSURE` remains non-executable until separately approved. |
| **S4-G3 — Multi-scenario generation** | The generator produces multiple deterministic scenarios using only permitted O-class controls. Every scenario references the exact locked RiskProfileVersion and catalogue version that produced it. |
| **S4-G4 — Invalid-combination rejection** | Contradictory, impossible or policy-ineligible O combinations are rejected deterministically with persisted reasons; rejection never mutates the locked profile. |
| **S4-G5 — MarketRoute separation** | Provider/channel optimisation is represented through MarketRoute / QuoteRequest metadata and is not stored as a factual customer field or forced into ScenarioDelta. |
| **S4-G6 — Multi-route synthetic quotation lineage** | Multiple deterministic synthetic provider/channel routes can be executed for eligible scenarios. Every quote preserves exact RiskProfileVersion → Scenario → MarketRoute → QuoteRequest → RawProviderResponse → NormalisedQuote lineage. |
| **S4-G7 — Occupation mapping integrity** | Provider occupation taxonomy mapping is versioned and may translate the locked canonical occupation into a legitimate provider code, but cannot mutate the factual occupation or treat occupation as an O-class pricing experiment. |
| **S4-G8 — PRE_PURCHASE vehicle integrity** | Candidate-vehicle optimisation is permitted only when `vehicle_mode = PRE_PURCHASE`. Candidate vehicles remain separate from the customer's factual/current vehicle and cannot overwrite it. |
| **S4-G9 — Objective-specific recommendation determinism** | Objective-specific analysis and RecommendationSet are persisted, deterministic and versioned; eligible and excluded quote sets and exclusion reasons are reproducible. |
| **S4-G10 — Comparison-methodology boundary** | Universal premium-plus-excess scoring remains impossible **AND** `ADJUSTED_COMPARABLE` cannot participate in Sprint 4 recommendation ranking. Premium, finance, excess and relevant coverage/restriction dimensions remain separately represented. |
| **S4-G11 — Explainability contract** | Every recommendation has a persisted explanation identifying the objective, relevant controls, baseline/scenario values, provider/channel applicability, rule versions, eligible evidence and material reasons for the surfaced result. |
| **S4-G12 — Commercial independence** | Provider remuneration, introducer remuneration, referral income or other commercial economics are unavailable to scenario generation, comparison eligibility, objective analysis and recommendation ranking. An executable invariance test proves this. |
| **S4-G13 — Restart persistence / exact provenance** | Objective, catalogue version, scenarios, MarketRoutes, QuoteRequests, raw responses, normalised quotes, RecommendationSet and explanation survive restart with exact identifiers and provenance intact. |
| **S4-G14 — Customer browser journey** | The real target-stack customer journey demonstrates: **objective → multi-scenario exploration → recommendations → customer selection → final integrity**. The browser flow uses synthetic data only and does not expose purchase/bind/pay. |
| **S4-G15 — Admin end-to-end trace** | Admin trace reconstructs: **objective → scenarios → MarketRoutes → QuoteRequests → raw responses → normalised quotes → recommendation → selection → final integrity**, including catalogue/rule/adapter/mapping versions where applicable. |
| **S4-G16 — Full clean CI** | From a clean checkout/database: deterministic dependency install, migrations/contracts, Sprint 1–3 regressions, Sprint 4 domain/API/PostgreSQL tests, target-stack browser journey and production builds all pass GREEN. |

---

## 3. Mandatory cross-gate invariants

The following apply to **every** S4 gate:

```text
Change choices — not facts.

Optimiser READ:
F / V / D / I / O

Optimiser WRITE:
O only
```

Additionally:

1. ScenarioDelta may contain only O-class controls.
2. Provider/channel belongs to MarketRoute / QuoteRequest metadata.
3. Raw provider responses remain immutable and separate from normalised quotes.
4. RecommendationSet is derived evidence, not a replacement for customer choice.
5. Customer selection remains linked to the exact recommendation/quote/scenario/profile lineage.
6. Final integrity remains mandatory after the Sprint 4 recommendation layer.
7. IntegritySignal does not automatically mean fraud.
8. Commercial remuneration cannot affect recommendation ordering.
9. `ADJUSTED_COMPARABLE` remains dormant.
10. No fabricated universal premium-plus-excess metric may be introduced.

---

## 4. Executable Sprint 4 objectives

The following Customer Objective Model v1 objectives are approved for implementation subject to objective-specific rule definitions:

- `LOWEST_ANNUAL_PREMIUM`
- `LOWEST_MONTHLY_COMMITMENT`
- `LOWEST_FINANCE_COST`
- `LOWER_EXCESS_EXPOSURE`

The following remains **defined but non-executable**:

- `BALANCED_COST_AND_EXPOSURE`

Activation of `BALANCED_COST_AND_EXPOSURE` requires a separately approved methodology defining weights, assumptions, customer preference capture, explainability and fairness controls.

---

## 5. Recommendation eligibility

A quote may participate in a Sprint 4 recommendation only when:

- it has an intact certified lineage;
- its source RiskProfileVersion is the applicable locked factual version;
- its Scenario contains O-only deltas;
- its MarketRoute is an approved synthetic route;
- its raw response is preserved;
- its NormalisedQuote is valid under the active normaliser;
- its comparison state is eligible for the specific objective;
- no blocking integrity condition invalidates the quote;
- the objective rule can evaluate the quote without inventing missing economic dimensions.

Quotes excluded from a RecommendationSet must retain an explicit exclusion reason.

---

## 6. Definition of Done for Sprint 4

Sprint 4 is COMPLETE only when **S4-G0 → S4-G16 are all PASS** on the target stack and the certified journey can be reproduced from a clean environment.

No partial gate set may be promoted as Sprint 4 COMPLETE.

---

## 7. Freeze decision

**P4-G12 — Sprint 4 implementation scope and acceptance gates frozen: PASS**

The matrix in this document is declared:

> **S4-G0 → S4-G16 — FROZEN v1.0**

Any change to these gates after `SP4-EXEC-001` begins requires an explicit approved change record and must not silently weaken an existing acceptance condition.

**End of MIQO-SP4-ACCEPT-001 v1.0**
