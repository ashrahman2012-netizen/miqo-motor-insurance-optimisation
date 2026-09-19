# MIQO-SP4-GATE-CERT-009 — S4-G15 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-009  
**Increment:** MIQO-SP4-EXEC-001J — Admin End-to-End Trace  
**Certified implementation head:** `751cb3f1df7d9c8675bf795bb4a4f4791b69f12a`  
**Authoritative CI:** #114 / `35473337554`  
**Result:** PASS

---

## 1. Gate decision

```text
S4-G15 — Admin end-to-end trace    PASS
```

No later Sprint 4 gate is certified by this document.

---

## 2. Certified trace chain

The target-stack admin trace reconstructs the exact persisted Sprint 4 customer decision lineage:

```text
LOCKED RiskProfileVersion
        ↓
CustomerObjective
        ↓
Scenario exploration
        ↓
Scenarios + O-only ScenarioDeltas
        ↓
MarketRoutes
        ↓
QuoteRequests
        ↓
RawProviderResponses
        ↓
NormalisedQuotes
        ↓
RecommendationSet + RecommendationExplanation
        ↓
validated Recommendation→Selection audit link
        ↓
Selection
        ↓
Final Integrity
        ↓
PROTOTYPE_JOURNEY_COMPLETE
```

Authoritative browser contract:

```text
e2e-target/sp4-admin-end-to-end-trace.spec.ts
```

---

## 3. Exact recommendation-selection provenance

001J identified and closed a provenance ambiguity in the pre-G15 customer selection surface: a selected quote already carried exact Scenario, QuoteRequest and RiskProfileVersion lineage, but did not identify which RecommendationSet the customer acted upon if multiple customer objectives could surface the same quote.

The certified implementation now:

- accepts an optional `recommendationSetId` only on the Sprint 4 selection path;
- validates the RecommendationSet against the exact RiskProfileVersion;
- validates that the selected NormalisedQuote is the RecommendationSet's surfaced quote;
- validates matching ordinal-1 eligible RecommendationQuoteEvidence for the exact Scenario and QuoteRequest;
- persists the validated RecommendationSet, CustomerObjective, exploration and recommendation fingerprints in the existing append-only `quote_selected` audit event;
- uses that immutable event as the exact Recommendation→Selection join for the admin reconstruction;
- leaves legacy Sprint 3 selection semantics unchanged when no RecommendationSet is supplied.

No new database table or migration was required.

---

## 4. Admin reconstruction evidence

The admin endpoint and UI expose:

- profile and exact LOCKED RiskProfileVersion;
- CustomerObjective ID, objective version, catalogue version and policy fingerprint;
- exploration fingerprint and scenario-generation version;
- every scenario and its O-only deltas;
- every recommendation evidence route;
- MarketRoute catalogue, provider/channel, adapter/mapping versions and route fingerprint;
- QuoteRequest identity, request fingerprint and orchestration version;
- RawProviderResponse identity and payload SHA-256;
- NormalisedQuote identity, normalisation version/fingerprint and comparison state;
- RecommendationSet identity, recommendation rule/fingerprint and surfaced quote;
- RecommendationExplanation rule/fingerprint;
- exact audit event linking RecommendationSet to Selection;
- Selection status;
- Final Integrity outcome and rule version;
- prototype completion state.

The browser contract also proves that factual `annual_mileage` is absent from ScenarioDelta and every rendered optimisation delta remains O-class.

---

## 5. CI evidence

```text
run:  #114 / 35473337554
head: 751cb3f1df7d9c8675bf795bb4a4f4791b69f12a

locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

Within `target-stack-sprint1`:

```text
verify:boundary                                     PASS
db:migrate                                          PASS
test:api:postgres                                   PASS
npx playwright test -c playwright.target.config.ts PASS
npm run build                                       PASS
```

The Chromium run includes the new S4-G15 admin trace journey together with the previously certified browser regressions.

---

## 6. Scope boundary

EXEC-001J does not introduce or certify:

- S4-G16 final clean-environment certification;
- Sprint 4 completion/promotion;
- live providers;
- real customer data;
- policy purchase, payment or binding;
- a new ranking methodology;
- ADJUSTED_COMPARABLE;
- premium-plus-excess scoring;
- commercial remuneration influence.

---

## 7. Sprint 4 gateway state

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
S4-G15  PASS

S4-G16  OPEN
```

**End of MIQO-SP4-GATE-CERT-009**
