# MIQO-SP4-GATE-CERT-005 — S4-G9 / S4-G10 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-005  
**Increment:** MIQO-SP4-EXEC-001F — Objective-Specific Recommendation Determinism & Comparison Boundary  
**Certified implementation head:** `5fcc534a25ea5cc626b2c824866ba531f59a7c00`  
**Authoritative CI:** #95 / `35468040370`  
**Result:** PASS

---

## 1. Gate decision

```text
S4-G9  — Objective-specific recommendation determinism   PASS
S4-G10 — Comparison-methodology boundary                PASS
```

No later Sprint 4 gate is certified by this document.

---

## 2. S4-G9 — PASS

Frozen requirement:

> Objective-specific analysis and RecommendationSet are persisted, deterministic and versioned; eligible and excluded quote sets and exclusion reasons are reproducible.

Certified implementation:

```text
CustomerObjective
        ↓
Scenario exploration
        ↓
Scenario × MarketRoute quotation evidence
        ↓
sp4-recommendation-v1
        ↓
RecommendationSet
        ↓
RecommendationQuoteEvidence
   ├─ ELIGIBLE + ordinal + objective metric
   └─ EXCLUDED + explicit reason
```

Every RecommendationSet persists:

- exact CustomerObjective;
- exact RiskProfileVersion;
- exploration fingerprint;
- objective ID/version;
- catalogue version;
- policy fingerprint;
- recommendation rule version;
- deterministic recommendation fingerprint;
- surfaced NormalisedQuote identity.

Every RecommendationQuoteEvidence row preserves:

- NormalisedQuote;
- QuoteRequest;
- Scenario;
- MarketRoute;
- evidence status;
- objective metric and value where eligible;
- explicit exclusion reason where excluded;
- separate premium / finance / excess dimensions;
- deterministic evidence fingerprint.

Replay of the same objective/exploration returns the same RecommendationSet identity and recommendation fingerprint.

Concurrent duplicate creation is serialized with a PostgreSQL advisory transaction lock.

API evidence from CI #95:

```text
PASS S4-G9 persists deterministic versioned RecommendationSet
     with reproducible eligible evidence

PASS S4-G9 monthly objective persists eligible monthly quotes
     and explicit annual exclusions

38 tests
38 passed
0 failed
```

Existing target-stack browser regressions remained:

```text
3 passed
```

---

## 3. Approved objective lenses

Recommendation rule version:

```text
sp4-recommendation-v1
```

Executable lenses:

| Objective | Metric |
|---|---|
| LOWEST_ANNUAL_PREMIUM | annual_cash_premium_pence |
| LOWEST_MONTHLY_COMMITMENT | monthly_commitment_pence |
| LOWEST_FINANCE_COST | finance_cost_pence |
| LOWER_EXCESS_EXPOSURE | total_excess_exposure_pence |

For LOWEST_MONTHLY_COMMITMENT:

- only MONTHLY scenarios are eligible;
- ANNUAL scenarios are retained as EXCLUDED evidence with reason `PAYMENT_STRUCTURE_NOT_MONTHLY`;
- monthly commitment is a transparent RecommendationSet analysis lens derived from `(annual premium + finance cost) / 12`;
- this does not add or rewrite a provider-declared NormalisedQuote field;
- excess is not included in that metric.

`BALANCED_COST_AND_EXPOSURE` remains dormant and non-executable.

---

## 4. S4-G10 — PASS

Frozen requirement:

> Universal premium-plus-excess scoring remains impossible AND ADJUSTED_COMPARABLE cannot participate in Sprint 4 recommendation ranking.

Certified controls:

1. recommendation metrics are restricted to:
   - `annual_cash_premium_pence`;
   - `monthly_commitment_pence`;
   - `finance_cost_pence`;
   - `total_excess_exposure_pence`;

2. no `effective_cost_pence` or equivalent premium-plus-excess metric exists in the domain result or persistence schema;

3. DIRECTLY_COMPARABLE is required for ELIGIBLE recommendation evidence;

4. ADJUSTED_COMPARABLE is explicitly classified as:
   `COMPARISON_STATE_ADJUSTED_NOT_ELIGIBLE`;

5. PostgreSQL rejects an attempt to persist ADJUSTED_COMPARABLE as eligible ranked evidence;

6. PostgreSQL rejects an attempt to persist `effective_cost_pence` as a recommendation metric;

7. premium, finance cost, compulsory excess and voluntary excess remain separately represented in evidence.

Domain evidence:

```text
PASS Sprint 4 recommendation analysis is deterministic and objective-specific
PASS Sprint 4 monthly commitment excludes annual scenarios and never includes excess
PASS Sprint 4 excess objective uses excess exposure only and ADJUSTED_COMPARABLE is excluded
PASS Sprint 4 balanced objective remains dormant

6 comparison-package tests
6 passed
0 failed
```

PostgreSQL contract marker:

```text
POSTGRES_SPRINT4_RECOMMENDATION_CONTRACT_PASS
```

---

## 5. Persistence and immutability

Migration:

```text
0012_sp4_recommendation.sql
```

New immutable evidence:

```text
recommendation_set
recommendation_quote_evidence
```

Direct database guards require exact:

```text
CustomerObjective
→ RiskProfileVersion
→ exploration
→ Scenario
→ MarketRoute
→ QuoteRequest
→ NormalisedQuote
→ RecommendationSet
```

Recommendation evidence rejects UPDATE/DELETE with:

```text
SP4_RECOMMENDATION_EVIDENCE_IMMUTABLE
```

---

## 6. CI evidence

Authoritative implementation CI:

```text
#95 / 35468040370
head: 5fcc534a25ea5cc626b2c824866ba531f59a7c00

locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

The run includes:

- all Sprint 1–3 regressions;
- Sprint 4 G0–G8 regressions;
- recommendation/comparison domain tests;
- migrations through 0012;
- direct PostgreSQL recommendation contract;
- 38 PostgreSQL API tests;
- 3 Playwright journeys;
- production builds.

---

## 7. Scope boundary

EXEC-001F does not introduce:

- recommendation explainability persistence beyond quote-evidence/reason provenance;
- commercial/remuneration inputs;
- remuneration-driven ranking;
- live providers;
- real customer data;
- policy binding/payment;
- active ADJUSTED_COMPARABLE;
- universal premium-plus-excess scoring;
- new customer browser recommendation journey;
- restart certification for RecommendationSet.

---

## 8. Sprint 4 gateway state

```text
S4-G0   PASS
S4-G1   PASS
S4-G2   PASS
S4-G3   PASS
S4-G4   PASS
S4-G5   PASS
S4-G6   PASS
S4-G7   PASS
S4-G8   PASS
S4-G9   PASS
S4-G10  PASS

S4-G11 → S4-G16  OPEN
```

## 9. Next authorised bounded increment

> **MIQO-SP4-EXEC-001G — Persisted Recommendation Explainability & Commercial Independence**

Target gates:

```text
S4-G11
S4-G12
```

The next increment must preserve:

- objective/rule/quote/scenario/MarketRoute provenance;
- separate economic dimensions;
- customer choice as the final decision;
- remuneration unavailable to scenario generation, comparison eligibility, objective analysis and recommendation ranking.

**End of MIQO-SP4-GATE-CERT-005**
