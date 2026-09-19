# MIQO-SP4-EXEC-001I — Customer Browser Journey

**Status:** IMPLEMENTED — certification pending  
**Parent:** MIQO-SP4-EXEC-001 — Explainable Multi-Scenario Customer Optimisation  
**Target gate:** S4-G14 only  
**Baseline:** `4ddffe127dfe0d4ea84c440d42443b5bc85facac`

## Purpose

Provide the bounded customer-browser proof required by S4-G14 without changing the already-certified Sprint 4 domain, persistence, recommendation, restart-provenance or admin-trace contracts.

The journey demonstrates:

```text
LOCKED RiskProfileVersion
        ↓
explicit CustomerObjective
        ↓
multi-scenario O-only exploration
        ↓
multiple synthetic MarketRoutes
        ↓
normalised quotation evidence
        ↓
persisted explainable RecommendationSet
        ↓
customer selection
        ↓
Final Integrity PASS
        ↓
PROTOTYPE_JOURNEY_COMPLETE
```

## Implementation boundary

This increment adds:

- a customer route at `/profile/:profileId/recommendations`;
- an entry point from the existing C-08 optimisation page;
- explicit executable customer-objective selection;
- deterministic four-scenario browser exploration using approved O-class controls only;
- synthetic multi-route execution through existing certified APIs;
- persisted recommendation and explanation presentation;
- customer selection of the surfaced quote through the existing shortlist/selection/final-integrity path;
- one target-stack Playwright acceptance test.

This increment does **not** add or certify:

- admin end-to-end trace expansion;
- S4-G15;
- S4-G16 final clean-environment certification;
- new backend ranking or scenario algorithms;
- live providers or real customer data;
- policy purchase, binding or payment;
- ADJUSTED_COMPARABLE;
- premium-plus-excess scoring;
- commercial remuneration inputs.

## Acceptance proof

Authoritative browser contract:

```text
e2e-target/sp4-customer-recommendation-journey.spec.ts
```

The test must prove:

1. the source profile is LOCKED;
2. `LOWEST_ANNUAL_PREMIUM` is explicitly selected and persisted;
3. four scenarios are produced from a bounded Cartesian O-only choice set;
4. no factual field appears in ScenarioDelta;
5. more than one synthetic MarketRoute is executed;
6. RecommendationSet and explanation are surfaced from persisted backend evidence;
7. the customer selects the surfaced recommendation;
8. final integrity returns PASS;
9. prototype completion remains SYNTHETIC with live providers DISABLED;
10. no policy purchase, payment or binding is exposed.

## Gate decision rule

S4-G14 remains OPEN until the implementation commit passes the pinned GitHub Actions target-stack browser job together with all mandatory regression jobs.

**End of MIQO-SP4-EXEC-001I**
