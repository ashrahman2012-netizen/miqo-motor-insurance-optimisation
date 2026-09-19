# MIQO-SP4-EXEC-001D — MarketRoute Separation & Multi-Route Synthetic Quotation Lineage

**Increment:** MIQO-SP4-EXEC-001D  
**Sprint:** MIQO Sprint 4 — Explainable Multi-Scenario Customer Optimisation  
**Target gates:** S4-G5 / S4-G6  
**Scope:** Synthetic-only MarketRoute persistence and multi-route quotation lineage.  
**Out of scope:** recommendation analysis, occupation mapping, PRE_PURCHASE persistence, browser recommendation journey, live providers, remuneration, ADJUSTED_COMPARABLE.

---

## 1. Governing distinction

```text
Scenario
=
customer-controllable O-class choices

MarketRoute
=
provider
+
distribution channel
+
adapter version
+
mapping version
```

Provider and distribution channel remain unavailable as factual profile fields and unavailable as ScenarioDelta controls.

---

## 2. Synthetic MarketRoute catalogue

Version:

```text
sp4-market-routes-v1
```

Orchestration version:

```text
sp4-route-orchestrator-v1
```

Approved deterministic routes:

| Route key | Provider | Channel | Adapter | Mapping |
|---|---|---|---|---|
| MOCK-001-DIRECT | MOCK-PROVIDER-001 | DIRECT_SYNTHETIC | mock-adapter-v1 | mock-mapping-v1 |
| MOCK-001-PCW | MOCK-PROVIDER-001 | PCW_SYNTHETIC | mock-adapter-v1 | mock-mapping-pcw-v1 |

Both routes are in-process synthetic routes. No live endpoint or commercial-remuneration field exists in the route contract.

The use of one mock provider over two synthetic channels is deliberate for this increment: it proves MarketRoute separation and route-specific lineage without expanding the normalisation contract to an additional provider before that is required.

---

## 3. Persistence model

```text
MarketRoute
    ↓
SP4QuoteRequestLineage
    ↓
QuoteRequest
    ↓
RawProviderResponse
    ↓
NormalisedQuote
```

`market_route` is immutable evidence containing:

- deterministic MarketRoute ID;
- route key;
- route-catalogue version;
- provider key;
- channel key;
- adapter version;
- mapping version;
- route fingerprint;
- synthetic-only marker.

`sp4_quote_request_lineage` is subordinate immutable Sprint 4 evidence linking:

- exact QuoteRequest;
- exact MarketRoute;
- CustomerObjective;
- Scenario;
- RiskProfileVersion;
- route fingerprint;
- orchestration version.

The certified Sprint 2 `quote_request` table is not replaced.

---

## 4. Multi-route orchestration

For one accepted exploration:

```text
CustomerObjective
        ↓
Exploration
        ↓
Scenario A ─┬─ MarketRoute DIRECT
            └─ MarketRoute PCW

Scenario B ─┬─ MarketRoute DIRECT
            └─ MarketRoute PCW
        ↓
four QuoteRequests
        ↓
four immutable raw responses
        ↓
four normalised quotes
```

Equivalent replay reuses the same QuoteRequest, RawProviderResponse and NormalisedQuote identities.

---

## 5. S4-G5 acceptance evidence

The increment must prove:

1. provider/channel never appear as factual profile fields;
2. provider/channel cannot be inserted as ScenarioDelta;
3. MarketRoute is persisted independently from Scenario;
4. route metadata and QuoteRequest metadata match exactly;
5. MarketRoute evidence is immutable;
6. all approved routes are synthetic.

---

## 6. S4-G6 acceptance evidence

The increment must prove:

1. multiple accepted scenarios can execute over multiple synthetic routes;
2. each Scenario × MarketRoute pair has a distinct deterministic QuoteRequest fingerprint;
3. each QuoteRequest preserves exact RiskProfileVersion → Scenario → MarketRoute lineage;
4. each route execution preserves immutable raw payload text/hash;
5. each raw response produces a versioned NormalisedQuote without rewriting raw evidence;
6. replay is idempotent;
7. Sprint 1–3 and S4-G0–G4 regressions remain green.

---

## 7. Scope boundary

This increment does not introduce:

- live provider connectivity;
- a second live or synthetic provider contract;
- recommendation ranking;
- occupation taxonomy mapping;
- candidate-vehicle persistence;
- universal premium-plus-excess scoring;
- ADJUSTED_COMPARABLE;
- remuneration inputs;
- purchase, bind or payment capability.

**End of MIQO-SP4-EXEC-001D**
