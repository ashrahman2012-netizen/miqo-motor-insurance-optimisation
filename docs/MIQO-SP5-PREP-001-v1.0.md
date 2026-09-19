# MIQO-SP5-PREP-001 — Production-Readiness & Controlled Provider Integration Architecture v1.0

**Document ID:** MIQO-SP5-PREP-001  
**Version:** 1.0  
**Status:** FROZEN — PRE-EXECUTION CONTROL  
**Date:** 20 September 2026  
**Branch:** `miqo/sp5-prep-001`  
**Inherited baseline:** certified Sprint 4 / `main`  
**Regulatory control:** MIQO-SP5-REG-001 v1.0  
**Acceptance control:** MIQO-SP5-ACCEPT-001 v1.0

## 0. Authority
Sprint 5 is authorised as a controlled production-readiness programme. This provision defines the architecture and acceptance boundary; it does not itself authorise real customers, live provider quotation, policy binding, payment or production operation.

## 1. G0 baseline discovery — PASS
Repository discovery confirms the inherited Sprint 4 architecture contains customer/admin web applications, API services, PostgreSQL migrations through `0013_sp4_explainability_commercial_independence.sql`, deterministic synthetic provider infrastructure, scenario/quotation/normalisation/comparison/recommendation services, end-to-end provenance tests and CI prototype-boundary guards.

The inherited invariant remains non-negotiable:

```text
Truthful Customer Facts → LOCKED RiskProfileVersion → O-only choices
→ Scenario → MarketRoute → QuoteRequest → RawProviderResponse
→ NormalisedQuote → CustomerObjective → Recommendation → Selection → Integrity
```

```text
Optimiser READ: F / V / D / I / O
Optimiser WRITE: O only
```

> Change choices — not facts.

Commercial remuneration remains unavailable to scenario generation, eligibility, comparison and recommendation ranking.

## 2. Sprint 5 purpose
Design and prove the controlled boundary by which MIQO can become production-capable without weakening Sprint 1–4 invariants.

Sprint 5 SHALL establish:
1. provider-adapter and route certification architecture;
2. secrets/credential isolation and provider trust boundaries;
3. real-data readiness controls without activating real data by default;
4. controller/processor, lawful-basis, retention, deletion, DSAR and DPIA control points;
5. regulatory operating-model decision points;
6. commercial-ledger separation from recommendation logic;
7. resilience, retry, timeout, idempotency, replay and outage semantics;
8. production observability, incident and audit controls;
9. explicit activation gates for real customers, live quotes and transactions.

## 3. Architectural boundary
Sprint 5 separates capability from activation:

```text
CERTIFIED CORE (Sprint 4)
        ↓
Provider Integration Boundary
        ↓
ProviderAdapter(versioned)
        ↓
Credential/Secret Boundary
        ↓
Request Policy + Rate Limit + Timeout
        ↓
Live-capable MarketRoute
        ↓
Raw immutable response capture
        ↓
Existing normalisation/comparison/recommendation lineage
```

A route may be `SYNTHETIC`, `CERTIFICATION`, or `LIVE`. Only `LIVE` can contact a production provider, and `LIVE` requires a separate activation decision.

## 4. Provider integration contract
Every provider adapter SHALL define and persist:
- `provider_key`, `adapter_version`, `mapping_version`;
- environment classification;
- credential reference (never credential value);
- request/response schema versions;
- supported products/controls;
- timeout, retry and rate-limit policy versions;
- idempotency strategy;
- provider correlation/reference IDs;
- certification status and evidence;
- effective dates and rollback version.

Adapters MUST NOT mutate locked F/V data or reinterpret O-class boundaries. Provider-specific occupation/vehicle mappings remain versioned translations with provenance.

## 5. Secrets and trust boundary
No provider secret may be committed to source control, persisted in quotation/audit payloads, emitted to customer UI, or included in logs. Runtime secret retrieval must be environment-scoped and least-privilege. Credential rotation and revocation must not alter historical quote provenance.

## 6. Data architecture
The synthetic-to-real transition SHALL be controlled by a `DataEnvironmentClass` and deployment policy. Production personal data is prohibited until the regulatory/data activation gate passes.

Required production controls include purpose metadata, lawful-basis record, controller/processor role record, retention schedule, deletion/legal-hold policy, DSAR retrieval/export path, correction/versioning, access logging, encryption, incident handling and DPIA status.

## 7. Commercial separation
Commercial records SHALL exist in a separate bounded context/ledger. Recommendation computation accepts no commission, referral fee, provider margin or commercial-priority input. Any customer fee or provider remuneration must be separately calculated, auditable and disclosed where required. Regression tests SHALL prove commercial-value perturbation cannot change scenario generation, quote eligibility or recommendation order.

## 8. Operational resilience
Production-capable routes SHALL implement bounded timeout/retry policies, exponential/backoff strategy where appropriate, idempotency, duplicate suppression, circuit/open-route state, provider outage handling, deterministic replay controls, correlation IDs and recovery evidence. Retries must never create silent duplicate customer actions.

## 9. Observability and audit
Telemetry must distinguish operational metrics from customer decision evidence. Logs must be minimised and redacted. Audit evidence remains append-only and reconstructs exact adapter/mapping/request-policy versions, provider response, normalisation, comparison and recommendation lineage.

## 10. Activation boundaries
The following are independent gates and MUST NOT be conflated:

```text
A. PRODUCTION-CAPABLE CODE
B. REAL-DATA AUTHORISATION
C. LIVE-PROVIDER AUTHORISATION
D. CUSTOMER-DISTRIBUTION AUTHORISATION
E. BIND/PAY AUTHORISATION
```

Passing A does not imply B–E.

## 11. Execution decomposition
Subject to the pre-execution gateway, `MIQO-SP5-EXEC-001` should execute in controlled blocks:

- **001A** production environment/configuration boundary;
- **001B** provider adapter contract + certification harness;
- **001C** secrets/credentials + outbound network controls;
- **001D** resilience/idempotency/replay controls;
- **001E** production data-governance primitives;
- **001F** regulatory/disclosure/support control interfaces;
- **001G** commercial ledger separation and invariance proof;
- **001H** observability/incident/audit reconstruction;
- **001I** production-readiness end-to-end certification.

No block may activate live operation merely because its code passes.

## 12. Frozen decisions requiring governance input
The following cannot be inferred from software architecture and require explicit business/legal governance before the corresponding activation gate:
1. intended FCA operating model and regulated role;
2. whether MIQO gives a personal recommendation/advice or operates a non-advised comparison/distribution journey;
3. contractual provider/distributor relationships;
4. controller/joint-controller/processor allocation for each production data flow;
5. lawful basis and retention schedule by purpose;
6. complaints/support ownership and customer redress route;
7. whether MIQO will bind/take payment or hand off to a regulated provider/intermediary.

## 13. PREP determination
Architecture definition: **PASS**.  
Acceptance freeze: **PASS**.  
Production activation: **NOT AUTHORISED BY THIS DOCUMENT**.

**End of MIQO-SP5-PREP-001 v1.0**