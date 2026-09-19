# MIQO-SP4-GATE-CERT-008 — S4-G14 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-008  
**Increment:** MIQO-SP4-EXEC-001I — Customer Browser Journey  
**Certified implementation head:** `d446f79f50ed6d84c9fda6a8b5dc85b9d322fab5`  
**Authoritative CI:** #112 / `35472767209`  
**Result:** PASS

---

## 1. Gate decision

```text
S4-G14 — Customer browser journey    PASS
```

No later Sprint 4 gate is certified by this document.

---

## 2. Certified customer journey

The target-stack browser contract executes the real customer web application against the real Fastify/PostgreSQL stack and proves:

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

Authoritative browser test:

```text
e2e-target/sp4-customer-recommendation-journey.spec.ts
```

---

## 3. Browser evidence

The executable browser proof verifies:

- the journey starts from an exact LOCKED RiskProfileVersion;
- `LOWEST_ANNUAL_PREMIUM` is explicitly selected and persisted;
- the bounded choice matrix produces four scenarios;
- every visible ScenarioDelta is O-class;
- factual `annual_mileage` is absent from the optimisation deltas;
- more than one synthetic MarketRoute is executed;
- the resulting quote set is normalised before recommendation analysis;
- RecommendationSet identity, objective, rule version and surfaced quote are rendered from persisted evidence;
- RecommendationExplanation rule/version and customer-changeable controls are rendered;
- the customer selects the surfaced recommendation through the existing certified selection path;
- Final Integrity returns PASS;
- completion returns `PROTOTYPE_JOURNEY_COMPLETE`;
- data classification remains SYNTHETIC;
- live-provider activity remains DISABLED;
- no policy purchase, payment or binding action is exposed.

---

## 4. CI evidence

```text
run:  #112 / 35472767209
head: d446f79f50ed6d84c9fda6a8b5dc85b9d322fab5

locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

Within `target-stack-sprint1`:

```text
npm run test:api:postgres                         PASS
npx playwright test -c playwright.target.config.ts PASS
npm run build                                     PASS
```

The browser step includes all earlier target-stack journeys plus the new S4-G14 customer recommendation journey.

---

## 5. Scope boundary

EXEC-001I does not introduce or certify:

- admin Sprint 4 lineage/trace expansion;
- S4-G15;
- final Sprint 4 clean-environment certification;
- S4-G16;
- new recommendation or scenario algorithms;
- live providers;
- real customer data;
- policy purchase, payment or binding;
- ADJUSTED_COMPARABLE;
- premium-plus-excess scoring;
- commercial-remuneration ranking influence.

---

## 6. Sprint 4 gateway state

```text
S4-G0   PASS
S4-G1   PASS
S4-G2   PASS
S4-G3   PASS
S4-G4   PASS
S4-G5   PASS
S4-G6   PASS
S4-G7   PASS
S4-G8   PASS
S4-G9   PASS
S4-G10  PASS
S4-G11  PASS
S4-G12  PASS
S4-G13  PASS
S4-G14  PASS

S4-G15 → S4-G16  OPEN
```

**End of MIQO-SP4-GATE-CERT-008**
