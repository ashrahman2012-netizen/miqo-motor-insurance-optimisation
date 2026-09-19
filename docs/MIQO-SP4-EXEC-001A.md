# MIQO-SP4-EXEC-001A — Optimisation Policy Domain Foundation

**Status:** IMPLEMENTED — certification pending  
**Parent:** MIQO-SP4-EXEC-001  
**Branch:** `miqo/sprint4`

## Purpose

Establish the first bounded Sprint 4 executable domain contract without changing any Sprint 1–3 persisted behaviour.

This increment implements the in-code, versioned foundations for:

- **S4-G1 — Optimisation Catalogue v2**
- **S4-G2 — Customer Objective Model v1**

It deliberately does **not** yet claim those gates complete because persistence/audit integration is reserved for the next bounded increment.

## Implemented

- `OPTIMISATION_CATALOGUE_VERSION = sp4-catalogue-v2`
- six explicit O controls;
- candidate vehicle restricted to `PRE_PURCHASE`;
- explicit factual fields prohibited from optimisation;
- provider and distribution channel explicitly classified as MarketRoute dimensions rather than ScenarioDelta controls;
- `CUSTOMER_OBJECTIVE_MODEL_VERSION = sp4-objectives-v1`;
- four executable objectives;
- `BALANCED_COST_AND_EXPOSURE` defined but dormant;
- deterministic policy fingerprint;
- dependency-light domain regression tests.

## Non-goals

This increment does not:

- change PostgreSQL schema;
- change existing Sprint 2 scenario persistence;
- activate candidate-vehicle ScenarioDelta persistence;
- create MarketRoute records;
- persist customer objectives;
- create RecommendationSets;
- change comparison ranking;
- activate ADJUSTED_COMPARABLE;
- connect live providers;
- use real customer data.

## Gate impact

| Gate | Impact |
|---|---|
| S4-G0 | Must remain PASS via CI regressions |
| S4-G1 | Domain contract established; persistence/audit still required |
| S4-G2 | Domain contract established; persistence still required |
| S4-G3–S4-G16 | No closure claimed in this increment |

## Governing invariant

```text
Change choices — not facts.

Optimiser READ:
F / V / D / I / O

Optimiser WRITE:
O only
```

**End of MIQO-SP4-EXEC-001A**
