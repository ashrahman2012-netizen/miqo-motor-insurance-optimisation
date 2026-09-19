# MIQO-SP4-GATE-CERT-007 — S4-G13 Certification

**Certification ID:** MIQO-SP4-GATE-CERT-007  
**Increment:** MIQO-SP4-EXEC-001H — Restart Persistence & Exact Provenance  
**Certified implementation head:** `8fc0acba920b32008b78bf1a66794fe27cd63973`  
**Authoritative CI:** #110 / `35472263290`  
**Result:** PASS

---

## 1. Gate decision

```text
S4-G13 — Restart persistence / exact provenance    PASS
```

No later Sprint 4 gate is certified by this document.

---

## 2. Certified restart contract

The PostgreSQL integration contract creates the complete synthetic Sprint 4 lineage, captures its canonical provenance snapshot, closes the Fastify application and its database pool, creates a new application/database client, and re-reads the same lineage.

Exact structural equality is required across:

- CustomerObjective and locked RiskProfileVersion identity;
- optimisation catalogue, objective model and policy fingerprint;
- exploration, Scenario, ScenarioDelta and candidate fingerprints;
- MarketRoute IDs, route fingerprints, adapter versions and mapping versions;
- QuoteRequest, RawProviderResponse and NormalisedQuote identities and fingerprints;
- RecommendationSet identity, rule version, evidence and recommendation fingerprint;
- RecommendationExplanation and OptimisationExplanation identities, rule versions, evidence and fingerprints.

The contract then replays scenario generation, market-route quotation and recommendation creation. Every operation must reuse the persisted lineage, and all relevant row counts must remain unchanged.

Authoritative test:

```text
apps/api/test/sprint4-restart-provenance-postgres.test.ts
```

---

## 3. Duplicate and replacement protection

After restart, the executable evidence proves there are no replacement or duplicate:

- scenarios or scenario deltas;
- market-route quote lineages;
- quote requests, raw responses or normalised quotes;
- recommendation sets or recommendation evidence;
- recommendation explanations or optimisation explanations.

The post-restart public API projection equals the pre-restart canonical snapshot exactly.

---

## 4. CI evidence

```text
run:  #110 / 35472263290
head: 8fc0acba920b32008b78bf1a66794fe27cd63973

locked-dependencies    PASS
postgres-contract      PASS
target-stack-sprint1   PASS
```

The target-stack job executes the restart contract against PostgreSQL after applying the full ordered migration chain. The run also preserves all earlier Sprint 1–4 contracts, API integration tests, browser regressions and production builds.

---

## 5. Scope boundary

EXEC-001H does not introduce or certify:

- customer recommendation browser expansion;
- admin end-to-end trace screens;
- new navigation;
- G14, G15 or G16 behaviour;
- production or live-provider work;
- final Sprint 4 clean-environment certification.

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

S4-G14 → S4-G16  OPEN
```

**End of MIQO-SP4-GATE-CERT-007**
