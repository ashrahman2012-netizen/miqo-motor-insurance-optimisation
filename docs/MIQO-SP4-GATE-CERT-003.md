# MIQO-SP4-GATE-CERT-003 — S4-G5 / S4-G6 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-003  
**Increment:** MIQO-SP4-EXEC-001D — MarketRoute Separation & Multi-Route Synthetic Quotation Lineage  
**Certified implementation head:** `fc95e8849af2308f7a3dfdd1869f41885bd274e8`  
**Authoritative CI:** #89 / `35415017730`  
**Result:** PASS

---

## 1. Gate decision

```text
S4-G5 — MarketRoute separation                         PASS
S4-G6 — Multi-route synthetic quotation lineage       PASS
```

No later Sprint 4 gate is certified by this document.

---

## 2. S4-G5 — MarketRoute separation

The certified implementation preserves the controlling distinction:

```text
Scenario
= customer-controllable O-class choices

MarketRoute
= provider
+ distribution channel
+ adapter version
+ mapping version
```

Certified properties:

- provider and distribution channel are not factual RiskProfileVersion fields;
- provider/channel are not permitted ScenarioDelta controls;
- MarketRoute is persisted independently as immutable synthetic orchestration evidence;
- MarketRoute carries provider, channel, adapter version, mapping version and route fingerprint;
- QuoteRequest metadata must match its exact MarketRoute;
- MarketRoute and subordinate Sprint 4 quote-lineage evidence are append-only;
- no live endpoint or commercial-remuneration field is introduced.

Domain evidence from CI #89:

```text
PASS Sprint 4 MarketRoutes are deterministic synthetic provider/channel metadata
PASS MarketRoute dimensions remain orchestration metadata rather than ScenarioDelta controls

2 passed
0 failed
```

PostgreSQL evidence:

```text
POSTGRES_SPRINT4_MARKET_ROUTE_CONTRACT_PASS
```

The SQL contract separately proves that a provider value cannot be inserted as a ScenarioDelta and that route metadata mismatches are rejected.

---

## 3. S4-G6 — Multi-route synthetic quotation lineage

The certified bounded route catalogue is:

```text
sp4-market-routes-v1
```

with orchestration version:

```text
sp4-route-orchestrator-v1
```

Routes:

| Route | Provider | Channel | Adapter | Mapping |
|---|---|---|---|---|
| MOCK-001-DIRECT | MOCK-PROVIDER-001 | DIRECT_SYNTHETIC | mock-adapter-v1 | mock-mapping-v1 |
| MOCK-001-PCW | MOCK-PROVIDER-001 | PCW_SYNTHETIC | mock-adapter-v1 | mock-mapping-pcw-v1 |

Both are deterministic, in-process, synthetic routes.

For the certified API fixture:

```text
2 accepted O-only scenarios
        ×
2 synthetic MarketRoutes
        ↓
4 QuoteRequests
        ↓
4 immutable RawProviderResponses
        ↓
4 versioned NormalisedQuotes
```

Each chain retains:

```text
RiskProfileVersion
→ CustomerObjective
→ Scenario
→ MarketRoute
→ QuoteRequest
→ RawProviderResponse
→ NormalisedQuote
```

The API suite explicitly proves:

- two distinct scenarios;
- two distinct MarketRoutes per scenario;
- four distinct QuoteRequest identities and request fingerprints;
- four distinct raw-response identities and SHA-256 hashes;
- four distinct NormalisedQuote identities;
- exact provider/channel/adapter/mapping agreement between MarketRoute and QuoteRequest;
- exact source RiskProfileVersion and CustomerObjective lineage;
- raw evidence remains immutable;
- normalisation remains versioned and separate from raw;
- repeated execution is idempotent and returns the same persisted identities.

Target-stack evidence from CI #89:

```text
PASS S4-G5 MarketRoute remains separate from facts and ScenarioDelta while preserving route metadata
PASS S4-G6 multi-route synthetic quotation preserves exact scenario route request raw and normalised lineage

34 tests
34 passed
0 failed
```

Existing browser regressions also remained:

```text
3 passed
```

---

## 4. Compatibility and certification corrections

Certification intentionally surfaced and corrected only standalone proof-fixture issues.

### 4.1 Generated-scenario immutability

The first SQL fixture attempted to add a forbidden route field to an already GENERATED scenario. The inherited immutable-scenario guard correctly rejected the write before the approved-O-field constraint was reached.

Correction:

- use an isolated DRAFT scenario solely to prove provider/channel cannot be ScenarioDelta fields;
- do not weaken GENERATED scenario immutability.

### 4.2 PostgreSQL DO-block delimiter

A string-replacement step accidentally reduced `$$` to `$` in the contract fixture.

Correction:

- restore the literal PostgreSQL `DO $$ ... END $$;` delimiter;
- no runtime/domain change.

### 4.3 Prior discrepancy fixture contamination

The historical PostgreSQL fixture `RPV-PG-001-V2` carries intentional blocking discrepancy evidence. Reusing it caused the certified pre-quote integrity guard to reject the route QuoteRequest with `UNRESOLVED_DISCREPANCY`.

Correction:

- create a separate synthetic route-contract profile;
- preserve the earlier discrepancy evidence unchanged;
- do not bypass the pre-quote integrity guard.

### 4.4 Factual lock lifecycle

The isolated route fixture initially created a profile version already LOCKED and then attempted factual inserts. Sprint 1 correctly rejected that with `LOCKED_PROFILE_IMMUTABLE`.

Correction:

```text
DRAFT
→ insert required facts
→ LOCKED
```

This aligns the contract with the certified factual lifecycle rather than bypassing it.

---

## 5. Full CI evidence

CI #89 passed on exact head:

```text
fc95e8849af2308f7a3dfdd1869f41885bd274e8
```

Jobs:

```text
locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

Relevant evidence includes:

```text
@miqo/quote-orchestration        2 passed / 0 failed
PostgreSQL route contract        PASS
PostgreSQL API suite             34 passed / 0 failed
Playwright                       3 passed
workspace builds                 PASS
```

All earlier Sprint 1–3 and Sprint 4 G0–G4 contracts remained green.

---

## 6. Scope boundary

EXEC-001D does not introduce:

- live insurer/provider connectivity;
- real customer data;
- policy binding or payment;
- recommendation ranking;
- occupation taxonomy mapping;
- PRE_PURCHASE candidate-vehicle persistence;
- ADJUSTED_COMPARABLE;
- premium-plus-excess universal scoring;
- remuneration inputs or remuneration-driven ranking.

---

## 7. Sprint 4 gateway state

```text
S4-G0  PASS
S4-G1  PASS
S4-G2  PASS
S4-G3  PASS
S4-G4  PASS
S4-G5  PASS
S4-G6  PASS

S4-G7 → S4-G16  OPEN
```

**End of MIQO-SP4-GATE-CERT-003**
