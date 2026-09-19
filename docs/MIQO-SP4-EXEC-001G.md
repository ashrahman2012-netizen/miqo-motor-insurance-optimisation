# MIQO-SP4-EXEC-001G — Persisted Recommendation Explainability & Commercial Independence

**Target gates:** S4-G11 / S4-G12
**Scope:** Persisted, deterministic explanation evidence for RecommendationSet outcomes and executable proof that synthetic commercial metadata is isolated from customer outcomes.

## Explainability boundary

```text
RecommendationSet
        ↓
RecommendationExplanation
        ↓
OptimisationExplanation[]
```

Every recommendation explanation preserves:

- objective ID and version;
- recommendation and explanation rule versions;
- catalogue and policy fingerprints;
- surfaced quote, Scenario and MarketRoute lineage;
- eligible and excluded evidence;
- material recommendation reasons;
- relevant controls with baseline and scenario values;
- provider/channel applicability;
- deterministic explanation fingerprints.

Explanation evidence is append-only and cannot be updated or deleted.

## Commercial-independence boundary

Synthetic commercial metadata is persisted in an isolated evidence table solely for invariance testing. It is unavailable to:

- Scenario generation;
- comparison eligibility;
- objective metrics;
- RecommendationSet fingerprints;
- recommendation ordering;
- surfaced-quote selection.

Executable domain, API and PostgreSQL tests vary provider remuneration, introducer remuneration and referral revenue while asserting identical customer outcomes.

## Versions

```text
recommendation rule: sp4-recommendation-v1
explanation rule:    sp4-explainability-v1
migration:           0013_sp4_explainability_commercial_independence.sql
SQL contract:        postgres-sprint4-explainability-commercial-independence-contract.sql
```

## Scope exclusions

This increment does not introduce browser expansion, restart certification, live providers, real customer data, policy binding/payment, remuneration-driven ranking, or G13–G16 work.

**End of MIQO-SP4-EXEC-001G**
