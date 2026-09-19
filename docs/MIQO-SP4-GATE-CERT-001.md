# MIQO-SP4-GATE-CERT-001 — S4-G0 / S4-G1 / S4-G2 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-001  
**Branch:** `miqo/sprint4`  
**Certified head:** `0daa6c42f8b15f273c5d8dda9e42a5bb07eb19d3`  
**CI evidence:** GitHub Actions **#64 — GREEN**  
**Status:** CERTIFIED

---

## 1. Scope

This record formally evaluates the first three frozen Sprint 4 gates after `SP4-EXEC-001A` and `SP4-EXEC-001B`.

The certification is against `MIQO-SP4-ACCEPT-001 v1.0`.

---

## 2. Gate determinations

| Gate | Result | Certification basis |
|---|---|---|
| **S4-G0 — Certified baseline protection** | **PASS** | CI #64 reran the inherited dependency, boundary, Sprint 1–3, PostgreSQL, API, Playwright and production-build paths successfully. No Sprint 1–3 invariant was weakened. |
| **S4-G1 — Optimisation Catalogue v2** | **PASS** | The catalogue is persisted, versioned and auditable. The executable catalogue now carries explicit O classification, permitted-value specification, dependencies, constraints and applicability metadata for every control. The pre-certification metadata completion is versioned as `sp4-catalogue-v2.1`; its exact snapshot and policy fingerprint are persisted immutably. |
| **S4-G2 — Customer Objective Model v1** | **PASS** | Customer objective selections are persisted append-only against an exact LOCKED RiskProfileVersion and exact catalogue/objective-model/policy fingerprint. Four objectives are executable; `BALANCED_COST_AND_EXPOSURE` remains rejected/dormant. |

---

## 3. Material certification evidence

### S4-G1

The certified catalogue contains:

- `policy_start_date`
- `voluntary_excess`
- `payment_structure`
- `telematics_preference`
- `genuine_named_driver_inclusion`
- `candidate_vehicle` — PRE_PURCHASE only

Every control is:

```text
controlClass = O
```

and contains:

```text
permittedValues
dependencies
constraints
applicability
factualBoundary
```

Factual fields such as mileage, occupation, parking, ownership, claims, convictions, main-driver status and modifications remain outside the catalogue.

Provider and distribution channel remain MarketRoute dimensions, not ScenarioDelta controls.

### S4-G2

The persisted objective lineage is:

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

The following remain executable:

```text
LOWEST_ANNUAL_PREMIUM
LOWEST_MONTHLY_COMMITMENT
LOWEST_FINANCE_COST
LOWER_EXCESS_EXPOSURE
```

The following remains dormant:

```text
BALANCED_COST_AND_EXPOSURE
```

---

## 4. CI evidence

GitHub Actions run **#64** completed successfully on:

```text
0daa6c42f8b15f273c5d8dda9e42a5bb07eb19d3
```

Mandatory jobs:

```text
locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

The run includes:

- optimisation domain tests;
- PostgreSQL migration through `0008`;
- Sprint 4 policy-persistence SQL contract;
- full PostgreSQL API tests;
- inherited Sprint 1–3 tests;
- Playwright target-stack journeys;
- final production build.

---

## 5. Formal decision

```text
S4-G0  PASS
S4-G1  PASS
S4-G2  PASS
```

The next authorised bounded increment is:

> **MIQO-SP4-EXEC-001C — Deterministic Multi-Scenario Generation & Rejection Evidence**

Target gates:

```text
S4-G3
S4-G4
```

No later Sprint 4 gate is certified by this record.

**End of MIQO-SP4-GATE-CERT-001**
