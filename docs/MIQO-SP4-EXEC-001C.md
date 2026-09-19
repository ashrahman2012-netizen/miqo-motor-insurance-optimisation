# MIQO-SP4-EXEC-001C — Deterministic Multi-Scenario Generation & Rejection Evidence

**Status:** IMPLEMENTED — certification pending  
**Parent:** MIQO-SP4-EXEC-001 — Explainable Multi-Scenario Customer Optimisation  
**Target gates:** S4-G3 and S4-G4

## Purpose

Extend the certified Sprint 4 policy foundation into deterministic multi-scenario exploration while preserving the governing invariant:

```text
Change choices — not facts.

Optimiser READ:
F / V / D / I / O

Optimiser WRITE:
O only
```

## Scope

This increment introduces:

- deterministic Cartesian exploration over explicit customer-choice sets;
- exact lineage to `RiskProfileVersion`, `CustomerObjective`, catalogue version and policy fingerprint;
- deterministic scenario and rejection identifiers;
- accepted O-only scenario persistence;
- persisted rejection evidence for invalid, contradictory and policy-ineligible candidates;
- immutable Sprint 4 scenario-lineage evidence;
- immutable rejection evidence;
- API endpoints for creating and reading an objective-bound exploration;
- transaction rollback proof;
- PostgreSQL contract and target-stack API tests.

## Persisted model

```text
LOCKED RiskProfileVersion
        ↓
CustomerObjective
        ↓
choice-set exploration
        ↓
candidate matrix
   ┌────┴────┐
   ↓         ↓
VALID       INVALID
   ↓         ↓
Scenario    ScenarioGenerationRejection
+ O-only    rule/category/reason
Delta       candidate evidence
   ↓         ↓
immutable Sprint 4 evidence
```

Sprint 4 scenario policy lineage is deliberately stored in a subordinate append-only record:

```text
Scenario
  ↓
SP4ScenarioLineage
  customer_objective_id
  risk_profile_version_id
  catalogue_version
  policy_fingerprint
  generation_version
  exploration_fingerprint
  candidate_fingerprint
```

This avoids rewriting the certified Sprint 2/3 scenario storage contract.

## Determinism

Generator version:

```text
sp4-gen-v1
```

The exploration fingerprint binds:

- exact RiskProfileVersion;
- exact CustomerObjective;
- catalogue version;
- policy fingerprint;
- choice sets;
- factual applicability context.

Equivalent unordered input produces the same deterministic exploration and candidate identifiers.

A PostgreSQL advisory transaction lock serialises equivalent concurrent generation requests.

## Invalid-combination evidence

Rejected candidates are not silently discarded.

Each rejection persists:

```text
candidate
rule_id
category
reason
objective/profile/catalogue lineage
generation version
exploration fingerprint
candidate fingerprint
```

Categories:

- `POLICY_INELIGIBLE`
- `IMPOSSIBLE`
- `CONTRADICTORY`
- `NOT_ENABLED`

Examples certified by the test contract include:

- factual `annual_mileage` presented as an optimisation candidate;
- voluntary excess outside the approved catalogue;
- factual main driver reintroduced as a named-driver optimisation choice;
- candidate vehicle offered in `CURRENT_VEHICLE` mode.

No rejection path mutates the locked factual profile.

## Candidate vehicle boundary

`candidate_vehicle` remains catalogued as an O control for `PRE_PURCHASE`, but persisted candidate-vehicle ScenarioDelta execution is intentionally not activated in this increment.

That remains reserved for **S4-G8**.

## Non-scope

This increment does not introduce:

- MarketRoute persistence or multi-provider/channel execution;
- occupation taxonomy mapping;
- PRE_PURCHASE candidate-vehicle persistence;
- RecommendationSet;
- recommendation ranking;
- explainability UI;
- commercial inputs;
- live providers;
- real customer data;
- policy binding/payment;
- `ADJUSTED_COMPARABLE`;
- universal premium-plus-excess scoring.

## Gate intent

A successful clean certification of this increment is sufficient to close:

- **S4-G3 — Multi-scenario generation**
- **S4-G4 — Invalid-combination rejection**

It does not claim S4-G5 or later gates.

**End of MIQO-SP4-EXEC-001C**
