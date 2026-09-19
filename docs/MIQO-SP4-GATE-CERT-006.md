# MIQO-SP4-GATE-CERT-006 — S4-G11 / S4-G12 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-006
**Increment:** MIQO-SP4-EXEC-001G — Persisted Recommendation Explainability & Commercial Independence
**Certified implementation head:** `63242bad02af63d3f871041a7648eef0039fff31`
**Authoritative CI:** #107 / `35469309092`
**Result:** PASS

---

## 1. Gate decision

```text
S4-G11 — Explainability contract      PASS
S4-G12 — Commercial independence     PASS
```

No later Sprint 4 gate is certified by this document.

---

## 2. S4-G11 — PASS

Every persisted RecommendationSet has deterministic, immutable explanation evidence containing:

- objective ID and objective version;
- recommendation and explanation rule versions;
- catalogue version and policy fingerprint;
- surfaced NormalisedQuote, Scenario and MarketRoute lineage;
- eligible and excluded evidence;
- material recommendation reasons;
- relevant controls;
- baseline and scenario values;
- provider/channel applicability;
- deterministic parent and control-level explanation fingerprints.

The API exposes persisted evidence through:

```text
GET /recommendations/:recommendationSetId/explanation
```

Replay returns the same explanation fingerprint and control evidence. Direct UPDATE or DELETE of explanation evidence is rejected by PostgreSQL.

Migration:

```text
0013_sp4_explainability_commercial_independence.sql
```

Explanation rule version:

```text
sp4-explainability-v1
```

---

## 3. S4-G12 — PASS

Synthetic commercial evidence is isolated in:

```text
synthetic_commercial_metadata
```

Provider remuneration, introducer remuneration and referral revenue are unavailable to:

- Scenario generation;
- comparison eligibility;
- objective metrics;
- RecommendationSet fingerprints;
- recommendation ordering;
- surfaced-quote selection.

Executable tests change the synthetic commercial values while requiring identical customer-facing outcomes. Schema inspection also proves that scenario, quote, normalisation, comparison, recommendation and explanation tables contain no commission, remuneration, referral-revenue or margin columns.

---

## 4. PostgreSQL contract

Authoritative contract:

```text
scripts/postgres-sprint4-explainability-commercial-independence-contract.sql
```

The dedicated `postgres-contract` CI job applies migration `0013` and executes the contract directly. It proves:

- valid explanation parent/child persistence;
- exact RecommendationSet/Scenario/MarketRoute lineage;
- rejection of invalid cross-scenario evidence;
- immutable explanation evidence;
- isolated synthetic commercial metadata;
- absence of commercial fields from customer-outcome schemas.

Contract marker:

```text
POSTGRES_SPRINT4_EXPLAINABILITY_COMMERCIAL_INDEPENDENCE_CONTRACT_PASS
```

---

## 5. CI evidence

```text
run:  #107 / 35469309092
head: 63242bad02af63d3f871041a7648eef0039fff31

locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

The run preserves all earlier Sprint 1–4 regressions, PostgreSQL contracts, API integration tests, Playwright journeys and production builds.

---

## 6. Scope boundary

EXEC-001G does not introduce or certify:

- browser expansion for recommendation explanations;
- restart persistence for RecommendationSet/explanation provenance;
- G13–G16 behaviour;
- live providers;
- real customer data;
- policy binding or payment;
- remuneration-driven ranking;
- active ADJUSTED_COMPARABLE ranking;
- universal premium-plus-excess scoring.

---

## 7. Sprint 4 gateway state

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
S4-G11  PASS
S4-G12  PASS

S4-G13 → S4-G16  OPEN
```

**End of MIQO-SP4-GATE-CERT-006**
