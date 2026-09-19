# MIQO-SP4-EXEC-001F — Objective-Specific Recommendation Determinism & Comparison Boundary

**Target gates:** S4-G9 / S4-G10  
**Scope:** Persisted deterministic RecommendationSet analysis over certified Sprint 4 Scenario × MarketRoute quote evidence.

## Governing rules

- RecommendationSet is derived evidence; it does not replace customer choice.
- Only the selected CustomerObjective determines the ranking lens.
- Only DIRECTLY_COMPARABLE quotes can be ranked.
- ADJUSTED_COMPARABLE remains excluded and cannot participate in Sprint 4 ranking.
- Premium, finance cost and excess exposure remain separate dimensions.
- No universal premium-plus-excess effective-cost score is created or persisted.
- BALANCED_COST_AND_EXPOSURE remains dormant.

## Recommendation rule version

```text
sp4-recommendation-v1
```

## Objective lenses

| Objective | Ranking metric |
|---|---|
| LOWEST_ANNUAL_PREMIUM | annual_cash_premium_pence |
| LOWEST_MONTHLY_COMMITMENT | monthly_commitment_pence derived transparently from (annual premium + finance cost) / 12 for MONTHLY scenarios only |
| LOWEST_FINANCE_COST | finance_cost_pence |
| LOWER_EXCESS_EXPOSURE | total_excess_exposure_pence = compulsory excess + voluntary excess |

The monthly commitment lens is RecommendationSet analysis evidence only. It does not overwrite or fabricate a provider-declared NormalisedQuote field.

## Persistence

```text
RecommendationSet
    ↓
RecommendationQuoteEvidence
    ├─ ELIGIBLE + ordinal + objective metric
    └─ EXCLUDED + explicit reason
```

Every set persists objective/catalogue/policy/exploration/rule versions and a deterministic SHA-256 recommendation fingerprint.

Every evidence row preserves exact NormalisedQuote → QuoteRequest → Scenario → MarketRoute lineage and is append-only.

**End of MIQO-SP4-EXEC-001F**
