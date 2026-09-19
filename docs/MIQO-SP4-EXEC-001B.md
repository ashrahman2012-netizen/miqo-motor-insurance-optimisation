# MIQO-SP4-EXEC-001B — Catalogue & Customer Objective Persistence

**Status:** Implementation increment  
**Parent:** MIQO-SP4-EXEC-001 — Explainable Multi-Scenario Customer Optimisation  
**Target gates:** S4-G1 and S4-G2

## Scope

This increment persists the already-certified Sprint 4 optimisation policy domain without entering multi-scenario generation.

It introduces:

- `OptimisationCatalogueVersion` persistence;
- append-only `CustomerObjective` selections against an exact locked `RiskProfileVersion`;
- exact catalogue/objective-model/policy-fingerprint lineage;
- audit events for policy registration and objective selection;
- read APIs for persisted catalogue and objective selections;
- PostgreSQL guards preventing dormant objectives, non-locked source profiles, policy-lineage mismatch and mutation.

## Non-scope

This increment does not introduce multi-scenario generation, candidate-vehicle ScenarioDelta persistence, MarketRoute persistence, multi-route quotation, RecommendationSet, occupation taxonomy persistence, recommendation ranking, UI/browser changes, live providers, real customer data, ADJUSTED_COMPARABLE or any premium-plus-excess composite score.

## Persistence model

```text
LOCKED RiskProfileVersion
        ↓
CustomerObjective
  objective_id
  objective_version
  catalogue_version
  policy_fingerprint
        ↓
append-only audit
```

`OptimisationCatalogueVersion` stores the exact catalogue and objective-model snapshots associated with the policy fingerprint.

Customer objective selections are append-only. Repeating the same objective under the same policy is idempotent; selecting a different executable objective creates a separate auditable record that future Scenario/Recommendation objects can reference explicitly.

## Gate intent

A successful certification of this increment is sufficient to close:

- **S4-G1 — Optimisation Catalogue v2 persisted and versioned**
- **S4-G2 — Customer objective persisted and versioned**

It does not claim S4-G3 or later gates.
