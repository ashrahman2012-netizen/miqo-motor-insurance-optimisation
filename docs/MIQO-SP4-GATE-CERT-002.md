# MIQO-SP4-GATE-CERT-002 — S4-G3 / S4-G4 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-002  
**Parent:** MIQO-SP4-EXEC-001C  
**Frozen acceptance source:** MIQO-SP4-ACCEPT-001 v1.0  
**Certified branch:** `miqo/sprint4`  
**Certified head:** `24bd1461f0ef1ecb316855a0d2e1ddda1bc5d10a`  
**Authoritative CI:** GitHub Actions **#83 — GREEN**  
**Status:** CERTIFIED

---

## 1. Formal gate result

```text
S4-G3 — Multi-scenario generation          PASS
S4-G4 — Invalid-combination rejection     PASS
```

No later Sprint 4 gate is certified by this record.

---

## 2. S4-G3 — PASS

Frozen requirement:

> The generator produces multiple deterministic scenarios using only permitted O-class controls. Every scenario references the exact locked RiskProfileVersion and catalogue version that produced it.

Certification evidence:

- generator version: `sp4-gen-v1`;
- deterministic canonical choice-set expansion;
- deterministic exploration fingerprint;
- deterministic scenario IDs;
- equivalent reordered input returns the same exploration and scenario identity;
- four scenarios are generated for a two-by-two synthetic choice matrix;
- every persisted ScenarioDelta remains `control_class = O`;
- factual controls are excluded from accepted generation;
- exact lineage is persisted through `sp4_scenario_lineage`:
  - scenario;
  - CustomerObjective;
  - RiskProfileVersion;
  - catalogue version;
  - policy fingerprint;
  - generation version;
  - exploration fingerprint;
  - candidate fingerprint;
- source RiskProfileVersion must be `LOCKED`;
- policy/objective/catalogue mismatch is rejected at PostgreSQL level;
- Sprint 2 generated-scenario lineage semantics remain unchanged;
- equivalent concurrent exploration requests are serialised by a PostgreSQL advisory transaction lock;
- transaction failure rolls scenario, lineage and deltas back together.

The Sprint 4 lineage is subordinate evidence rather than a rewrite of the certified Sprint 2 scenario model.

---

## 3. S4-G4 — PASS

Frozen requirement:

> Contradictory, impossible or policy-ineligible O combinations are rejected deterministically with persisted reasons; rejection never mutates the locked profile.

Certification evidence:

Rejected candidate evidence persists:

```text
candidate_json
rule_id
category
reason
customer_objective_id
risk_profile_version_id
catalogue_version
generation_version
exploration_fingerprint
candidate_fingerprint
```

Certified rejection categories:

- `POLICY_INELIGIBLE`
- `IMPOSSIBLE`
- `CONTRADICTORY`
- `NOT_ENABLED`

Certified examples:

| Candidate | Expected result |
|---|---|
| `annual_mileage = 6000` as an optimisation choice | `CONTROL_NOT_IN_OPTIMISATION_CATALOGUE` / POLICY_INELIGIBLE |
| `voluntary_excess = 999` | `VALUE_OUTSIDE_CATALOGUE` / IMPOSSIBLE |
| factual main driver included as named-driver delta | `MAIN_DRIVER_CANNOT_BE_NAMED_DRIVER_DELTA` / CONTRADICTORY |
| `candidate_vehicle` in CURRENT_VEHICLE mode | `CONTROL_NOT_APPLICABLE` / POLICY_INELIGIBLE |

The rejection records are deterministic and append-only.

The PostgreSQL contract verifies that the certified Sprint 1 corrected v2 factual mileage remains exactly:

```text
9000
```

after a rejected mileage optimisation attempt.

No rejection path mutates a locked factual field.

---

## 4. Regression preservation

During certification two compatibility issues were surfaced and corrected without weakening earlier invariants:

1. the original Sprint 2 lineage guard expected `SCENARIO_PREFERENCE_PROFILE_MISMATCH` before a locked-profile check for mismatched legacy scenarios;
2. the original generated-scenario provenance constraint required an `optimisation_preference_id`, whereas Sprint 4 scenarios are objective/catalogue-bound and intentionally use subordinate `sp4_scenario_lineage`.

The final migration preserves the original Sprint 2 semantics and permits preference-less generated scenarios **only** when:

```text
generation_version = sp4-gen-v1
```

with the separate Sprint 4 lineage guard requiring exact locked-profile/objective/catalogue/policy provenance.

---

## 5. CI evidence

GitHub Actions run **#83** completed successfully on:

```text
24bd1461f0ef1ecb316855a0d2e1ddda1bc5d10a
```

Mandatory jobs:

```text
locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

The run includes:

- Sprint 1–3 regression suites;
- `@miqo/optimisation` tests;
- `@miqo/scenarios` including Sprint 4 deterministic candidate tests;
- PostgreSQL migrations through `0009_sp4_multiscenario_generation.sql`;
- `postgres-sprint4-policy-persistence-contract.sql`;
- `postgres-sprint4-multiscenario-contract.sql`;
- all PostgreSQL API tests including Sprint 4 G3/G4 integration tests;
- target-stack Playwright journeys;
- production builds.

---

## 6. Sprint 4 certified matrix after this record

| Gate | Status |
|---|---|
| S4-G0 — Certified baseline protection | **PASS** |
| S4-G1 — Optimisation Catalogue v2 | **PASS** |
| S4-G2 — Customer Objective Model v1 | **PASS** |
| S4-G3 — Multi-scenario generation | **PASS** |
| S4-G4 — Invalid-combination rejection | **PASS** |
| S4-G5 → S4-G16 | **OPEN** |

---

## 7. Next authorised bounded increment

> **MIQO-SP4-EXEC-001D — MarketRoute Separation & Multi-Route Synthetic Quotation Lineage**

Target gates:

```text
S4-G5
S4-G6
```

The next increment must preserve the existing rule:

```text
Scenario = O-class customer choices
MarketRoute = provider/channel orchestration metadata
```

No live-provider activity is authorised.

**End of MIQO-SP4-GATE-CERT-002**
