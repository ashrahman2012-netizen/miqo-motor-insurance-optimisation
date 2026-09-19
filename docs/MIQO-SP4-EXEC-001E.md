# MIQO-SP4-EXEC-001E — Occupation Taxonomy Mapping & PRE_PURCHASE Vehicle Integrity

**Scope:** S4-G7 / S4-G8 only  
**Status:** IMPLEMENTED — certification pending

## S4-G7 — Occupation mapping integrity

Canonical occupation remains an F-class fact on the exact locked RiskProfileVersion.

Sprint 4 adds a separate, versioned synthetic provider-taxonomy translation:

```text
locked canonical occupation
        ↓
sp4-occupation-taxonomy-v1
        ↓
MarketRoute mapping version
        ↓
provider-specific occupation code
```

Occupation is not added to the optimisation catalogue, is not permitted as ScenarioDelta and cannot be changed by taxonomy translation.

Persisted evidence includes:

- exact RiskProfileVersion;
- exact MarketRoute;
- taxonomy version;
- canonical occupation snapshot;
- provider occupation code;
- rule fingerprint;
- mapping fingerprint.

The evidence is append-only.

## S4-G8 — PRE_PURCHASE vehicle integrity

Candidate vehicles are represented as separate candidate evidence, never as factual/current vehicle mutation.

```text
CURRENT_VEHICLE
→ candidate registration rejected

PRE_PURCHASE
→ CandidateVehicle evidence
→ candidate_vehicle O-class scenario choice
```

A candidate:

- belongs to the exact locked RiskProfileVersion;
- must not equal the factual/current vehicle ID;
- carries a synthetic snapshot and evidence fingerprint;
- is immutable after registration.

A `candidate_vehicle` ScenarioDelta is permitted only when:

- the parent scenario is `sp4-gen-v1`;
- Sprint 4 scenario lineage exists;
- the source profile has `vehicle_mode = PRE_PURCHASE`;
- matching CandidateVehicle evidence exists for that exact RiskProfileVersion.

The factual `vehicle_id` remains unchanged.

## Scope exclusions

This increment does not introduce:

- RecommendationSet or objective ranking;
- explainability output;
- commercial inputs;
- live providers;
- real customer data;
- policy binding/payment;
- ADJUSTED_COMPARABLE;
- universal premium-plus-excess scoring.

**Certification status:** pending clean CI.
