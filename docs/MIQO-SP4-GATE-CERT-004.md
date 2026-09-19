# MIQO-SP4-GATE-CERT-004 — S4-G7 / S4-G8 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-004  
**Increment:** MIQO-SP4-EXEC-001E — Occupation Taxonomy Mapping & PRE_PURCHASE Vehicle Integrity  
**Certified implementation head:** `351839f0e9fbabf94c67480715636a33bc6b68ed`  
**Authoritative CI:** #93 / `35442788168`  
**Result:** PASS

---

## 1. Gate decision

```text
S4-G7 — Occupation mapping integrity       PASS
S4-G8 — PRE_PURCHASE vehicle integrity     PASS
```

No later Sprint 4 gate is certified by this document.

---

## 2. S4-G7 — Occupation mapping integrity

The certified implementation preserves the controlling boundary:

```text
Locked canonical occupation (F)
        ↓
sp4-occupation-taxonomy-v1
        ↓
exact synthetic MarketRoute mapping version
        ↓
provider-specific occupation code

occupation ≠ O-class experiment
```

Certified properties:

- canonical occupation remains an F-class field on the exact locked RiskProfileVersion;
- occupation is not added to the optimisation catalogue;
- occupation remains prohibited as ScenarioDelta;
- taxonomy rules are versioned and deterministic;
- provider occupation codes are route/mapping-version specific;
- unsupported canonical occupations fail rather than being silently reclassified;
- persisted mapping evidence records RiskProfileVersion, MarketRoute, taxonomy version, canonical occupation, provider code, rule fingerprint and mapping fingerprint;
- direct SQL lineage guards require the persisted canonical occupation to equal the locked factual occupation;
- mapping evidence is append-only;
- mapping does not mutate occupation, mileage or any other factual field.

Domain evidence from CI #93:

```text
PASS S4-G7 occupation taxonomy mapping is deterministic, versioned and route-specific
PASS S4-G7 unsupported canonical occupation is not silently reclassified
```

Target-stack evidence:

```text
PASS S4-G7 locked canonical occupation maps through versioned provider taxonomy
     without becoming an O-class experiment
```

---

## 3. S4-G8 — PRE_PURCHASE vehicle integrity

The certified boundary is:

```text
CURRENT_VEHICLE
        ↓
candidate vehicle registration BLOCKED

PRE_PURCHASE
        ↓
immutable CandidateVehicle evidence
        ↓
candidate_vehicle O-class choice
        ↓
SP4 ScenarioDelta
```

Certified properties:

- CandidateVehicle evidence belongs to an exact locked RiskProfileVersion;
- CURRENT_VEHICLE profiles cannot register candidate vehicles;
- a factual/current vehicle ID cannot be reused as a candidate;
- candidate evidence carries a canonical snapshot and deterministic SHA-256 fingerprint;
- candidate evidence is append-only;
- `candidate_vehicle` is permitted in ScenarioDelta only for `sp4-gen-v1`;
- exact Sprint 4 scenario lineage is required;
- source `vehicle_mode` must be PRE_PURCHASE;
- matching CandidateVehicle evidence must exist on the same RiskProfileVersion;
- unknown candidates are rejected deterministically;
- accepted candidate_vehicle deltas remain `control_class = O`;
- the factual/current `vehicle_id` is never overwritten;
- `candidate_vehicle` never becomes a canonical factual field.

Domain evidence:

```text
PASS candidate vehicle remains policy-ineligible in CURRENT_VEHICLE mode
PASS candidate vehicle is accepted only from persisted PRE_PURCHASE evidence
```

Target-stack evidence:

```text
PASS S4-G8 candidate vehicle evidence is PRE_PURCHASE-only,
     O-class and never overwrites the factual vehicle
```

---

## 4. PostgreSQL evidence

Migration:

```text
0011_sp4_occupation_vehicle_integrity.sql
```

Contract marker:

```text
POSTGRES_SPRINT4_OCCUPATION_VEHICLE_CONTRACT_PASS
```

The direct database contract proves:

- canonical occupation reclassification is rejected;
- occupation cannot be persisted as an O-class ScenarioDelta;
- CURRENT_VEHICLE candidate registration is rejected;
- current factual vehicle reuse as a candidate is rejected;
- valid PRE_PURCHASE CandidateVehicle evidence can support an O-class candidate_vehicle delta;
- canonical occupation and current vehicle remain unchanged;
- no candidate vehicle is stored as a canonical fact;
- occupation mapping and candidate evidence reject UPDATE/DELETE.

---

## 5. Certification corrections

### 5.1 TypeScript value narrowing

CI #91 found a compile-only defect because Drizzle exposes JSONB `valueJson` as `unknown` even after a runtime `typeof === "string"` guard.

Correction:

- capture the validated canonical occupation as an explicit string before passing it to the taxonomy mapper;
- no runtime rule or database contract changed.

### 5.2 Inherited lock-page hydration

CI #92 passed domain, SQL, build and PostgreSQL API evidence but one inherited Sprint 3 Playwright journey timed out because the server-rendered confirmation checkbox could be checked before React hydration attached its `onChange`; hydration then restored `confirmed=false`.

Correction:

- wait for the lock page heading and network idle;
- check the confirmation checkbox;
- assert the checkbox is checked;
- assert the lock button is enabled;
- then click.

No MIQO factual-lock rule or Sprint 4 product behavior changed.

---

## 6. Full CI evidence

CI #93 passed on exact head:

```text
351839f0e9fbabf94c67480715636a33bc6b68ed
```

Jobs:

```text
locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

Relevant evidence:

```text
@miqo/scenarios                   13 passed / 0 failed
@miqo/quote-orchestration          4 passed / 0 failed
PostgreSQL occupation/vehicle      PASS
PostgreSQL API suite              36 passed / 0 failed
Playwright                         3 passed
workspace builds                   PASS
```

All inherited Sprint 1–3 and Sprint 4 G0–G6 controls remained green.

---

## 7. Scope boundary

EXEC-001E does not introduce:

- objective-specific RecommendationSet ranking;
- comparison methodology changes;
- explainability persistence;
- commercial/remuneration inputs;
- live providers;
- real customer data;
- policy binding/payment;
- active ADJUSTED_COMPARABLE;
- universal premium-plus-excess scoring.

---

## 8. Sprint 4 gateway state

```text
S4-G0  PASS
S4-G1  PASS
S4-G2  PASS
S4-G3  PASS
S4-G4  PASS
S4-G5  PASS
S4-G6  PASS
S4-G7  PASS
S4-G8  PASS

S4-G9 → S4-G16  OPEN
```

**End of MIQO-SP4-GATE-CERT-004**
