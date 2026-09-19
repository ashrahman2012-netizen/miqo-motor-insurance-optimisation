# MIQO-SP4-EXEC-001J — Admin End-to-End Trace

**Status:** IMPLEMENTED — certification pending  
**Parent:** MIQO-SP4-EXEC-001 — Explainable Multi-Scenario Customer Optimisation  
**Target gate:** S4-G15 only  
**Baseline:** `99d8b04584231d84a6fd45d015d9155af128f56a`

## Purpose

Provide an exact read-only admin reconstruction of the Sprint 4 customer decision chain:

```text
CustomerObjective
        ↓
Scenario exploration
        ↓
MarketRoutes
        ↓
QuoteRequests
        ↓
RawProviderResponses
        ↓
NormalisedQuotes
        ↓
RecommendationSet + Explanation
        ↓
Selection
        ↓
Final Integrity
```

## Exact Recommendation→Selection provenance

The pre-001J selection model identifies the chosen NormalisedQuote, Scenario, QuoteRequest and RiskProfileVersion but does not itself identify which RecommendationSet the customer acted on. Multiple objectives could theoretically surface the same quote.

001J closes that ambiguity without changing legacy selection semantics:

- the Sprint 4 customer journey sends an optional `recommendationSetId` when selecting the surfaced recommendation;
- the selection service validates that the RecommendationSet belongs to the same RiskProfileVersion, surfaces the selected NormalisedQuote, and contains matching ordinal-1 eligible evidence for the exact Scenario and QuoteRequest;
- the validated recommendation identifiers are written into the existing append-only `quote_selected` audit event;
- the admin trace reads that immutable linkage and reconstructs the full persisted Sprint 4 lineage.

Legacy Sprint 3 selections remain valid because `recommendationSetId` is optional.

## Implementation boundary

This increment adds:

- validated optional RecommendationSet provenance on the existing selection request;
- append-only recommendation-selection linkage in audit metadata;
- `GET /admin/selections/:selectionId/sp4-trace`;
- a dedicated read-only Sprint 4 admin trace service;
- `/admin/selections/:selectionId/sp4-trace` in the admin web;
- a target-stack Playwright proof.

It does not add or certify:

- S4-G16 final clean-environment closure;
- a new database table or migration;
- new recommendation ranking;
- new scenario generation;
- live providers or real customer data;
- policy purchase, payment or binding.

## Gate decision rule

S4-G15 remains OPEN until the implementation commit passes all mandatory CI jobs, including the real PostgreSQL/API stack, Chromium admin trace journey, and production builds.

**End of MIQO-SP4-EXEC-001J**
