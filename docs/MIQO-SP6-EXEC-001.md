# MIQO-SP6-EXEC-001 — Controlled Sprint 6 Execution Programme

**Status:** ACTIVE — BATCH B PROVIDER-NEUTRAL PREPARATION COMPLETE / STOPPED AT S6-G3  
**Date:** 20 September 2026  
**Branch:** `miqo/sp6-exec-001`  
**PREP authority:** `MIQO-SP6-PREP-001 v1.0`  
**Acceptance authority:** `MIQO-SP6-ACCEPT-001 v1.0`  
**Gateway authority:** `MIQO-SP6-PREP-001-GATE-REVIEW-001`  
**Inherited closure:** `MIQO-SP5-CLOSE-001`

## 1. Execution rule

Sprint 6 executes in controlled batches. PASS requires the exact frozen evidence for the gate. Missing provider, regulatory, contractual, credential, activation or pilot evidence is BLOCKED and must not be substituted with synthetic placeholders.

Engineering defects are remediated automatically. External dependencies stop only the gates that genuinely require them.

## 2. Current controlled pointer

```text
MIQO-SP5-CLOSE-001
        CLOSED
          ↓
MIQO-SP6-PREP-001
        PASS
          ↓
MIQO-SP6-EXEC-001
          ↓
Batch A — S6-G0 → S6-G2
        CERTIFIED PASS — 3/3
          ↓
S6-G3 — NAMED PROVIDER CANDIDATE
        BLOCKED — EXTERNAL INPUT REQUIRED
```

## 3. Batch plan

| Batch | Gates | Domain | State |
|---|---|---|---|
| A | S6-G0–G2 | Sprint 5 inheritance, dependency freeze, provider-neutral control baseline | CERTIFIED PASS — 3/3 |
| B | S6-G3–G6 | named provider candidate, adapter/mapping, schemas, provenance | PROVIDER-NEUTRAL FRAMEWORK CERTIFIED / BLOCKED AT G3 |
| C | S6-G7–G10 | endpoints/credentials, resilience, certification-route execution | QUEUED |
| D | S6-G11–G13 | reconciliation, LIVE fail-closed gate, independent activation | QUEUED |
| E | S6-G14–G16 | pilot bounds, kill switch/rollback, operational evidence | QUEUED |
| F | S6-G17 | explicit pilot exit decision | QUEUED / EXTERNAL GOVERNANCE |

## 4. Batch A certification

| Gate | Result | Evidence |
|---|---|---|
| **S6-G0** | PASS | `MIQO-SP5-CLOSE-001` inheritance asserted exactly; 22 inherited PASS gates and S5-G20/S5-G21 BLOCKED state preserved; inherited CI/invariant regression remained green |
| **S6-G1** | PASS | executable negative tests prove unresolved S5-G20/S5-G21 block REAL_DATA, LIVE_PROVIDER and DISTRIBUTION even if a downstream capability record is artificially flipped to AUTHORISED; BIND_PAY remains out of Sprint 6 scope |
| **S6-G2** | PASS | `sp6-control-model-v1` provides versioned provider-neutral control state; activation decisions preserve one-record-per-capability independence; ProviderCandidate schema exists without fabricating an S6-G3 approval |

No provider-specific certification claim is made by Batch A.

## 5. Batch A implementation evidence

- `90088772ca8beb4005b9fc578c5584a1caa7c722` — initiate `MIQO-SP6-EXEC-001`;
- `3576e2520d8000554f070e2f1a98af0763a4c199` — provider-neutral Batch A control baseline;
- `0b42416ab755b6d51fec99684e6a4ae54145e63e` — S6-G0–G2 executable certification tests.

Primary implementation:
- `packages/quote-orchestration/src/sp6-control-baseline.ts`

Primary executable evidence:
- `packages/quote-orchestration/test/sp6-batch-a.test.ts`

## 6. Definitive CI certification

Definitive Batch A CI run: **35509674085**  
Certified code/test head: `0b42416ab755b6d51fec99684e6a4ae54145e63e`

| Job | Outcome |
|---|---|
| `locked-dependencies` | PASS |
| `postgres-contract` | PASS |
| `target-stack-sprint1` | PASS |

The definitive run includes the new Sprint 6 Batch A tests plus inherited invariant/boundary tests, PostgreSQL contracts, API/Postgres integration tests, Playwright target-stack journeys and final workspace build.

No remediation was required.

## 7. Batch B provider-neutral preparation

Batch B was advanced to the maximum point permitted without a genuine provider candidate.

Provider-neutral engineering completed:

- `sp6-provider-certification-v1` certification contract model;
- explicit field provenance with CUSTOMER_FACT / CUSTOMER_OPTION / PROTOCOL_CONSTANT semantics;
- negative controls preventing factual values from being invented as constants;
- versioned request/response schema policy with explicit unknown-field semantics;
- deterministic mapping/schema/contract/evidence fingerprints;
- external ProviderCandidate approval guard before any provider-ready contract can be bound;
- PostgreSQL provider-candidate, certification-contract and certification-evidence controls;
- database guards preventing TEST_FIXTURE candidates from promotion to `APPROVED_FOR_CERTIFICATION`;
- database guards preventing TEST_FIXTURE contracts from promotion to `READY_FOR_PROVIDER_CERTIFICATION`;
- append-only/immutable certification evidence;
- reconnect persistence verification of certification evidence;
- CI integration of Sprint 6 migration and PostgreSQL contract.

Implementation lineage:

- `dbe0ed5a5f08c581df78af9837387cb8105567fa` — provider-neutral certification framework;
- `0d6cfb7c0e4adce5f3541592b61df1478a6fbe1d` — G4–G6 framework tests;
- `7ce3cbe14d189ccd68323e03857765faba6ba6d4` — certification persistence migration;
- `9a439d3561fd9c661a94a77170e3563f00e554db` — PostgreSQL contract;
- `3442293cdee65b76c179524fd3a999a279af0b6a` — reconnect/immutability API/Postgres test;
- `822f6fb9b15d68fa6355885a3d3b7fd285b277f2` — CI integration;
- `f710b3519bb6e7f246856b2b322d2704397839a2` — SQL trigger variable disambiguation remediation.

Remediation history:

- CI run `35510464132` identified an ambiguous PL/pgSQL variable reference in the new certification-contract guard;
- the defect was corrected in `f710b35` without changing the control design;
- definitive remediated CI run `35510510071` completed SUCCESS across `locked-dependencies`, `postgres-contract`, and `target-stack-sprint1`.

### Batch B gate state

| Gate | State | Reason |
|---|---|---|
| **S6-G3** | **BLOCKED** | genuine named ProviderCandidateRecord not supplied |
| **S6-G4** | **BLOCKED — FRAMEWORK READY** | provider-neutral mapping/provenance controls are green, but provider-specific adapter/mapping certification requires S6-G3 |
| **S6-G5** | **BLOCKED — FRAMEWORK READY** | schema/version/unknown-field controls are green, but actual provider schemas require S6-G3/provider documentation |
| **S6-G6** | **BLOCKED — FRAMEWORK READY** | immutable persistence/reconnect primitives are green, but provider-specific DB/API reconstruction requires actual provider certification evidence after S6-G3 |

No provider-specific PASS is inferred from TEST_FIXTURE or provider-neutral evidence.

## 8. External dependency state after Batch B

| Dependency | State |
|---|---|
| S5-G20 production legal/regulatory operating-model approval | BLOCKED |
| S5-G21 provider contractual authority | BLOCKED |
| **S6-G3 named ProviderCandidateRecord** | **BLOCKED — NOT SUPPLIED** |
| Production credentials | NOT SUPPLIED / NOT YET APPLICABLE |
| REAL_DATA | NOT_AUTHORISED |
| LIVE_PROVIDER | NOT_AUTHORISED |
| DISTRIBUTION | NOT_AUTHORISED |
| BIND_PAY | NOT_AUTHORISED / OUT OF SCOPE |

## 9. S6-G3 stop condition

The next provider-specific gate requires a genuine `ProviderCandidateRecord`. The record must identify at minimum:

- provider/counterparty;
- intended channel;
- target certification environment;
- proposed MarketRoute;
- technical documentation/reference available for implementation;
- adapter/certification owner;
- credential reference names, never secret values;
- contractual-authority status;
- permitted certification/test-data classification.

Synthetic placeholders or example provider identities cannot satisfy S6-G3.

Canonical intake record: `MIQO-SP6-PROVIDER-CANDIDATE-001`. It remains DRAFT / non-satisfying until populated with genuine provider-specific external evidence.

## 10. Current execution position

```text
S6-G0   PASS
S6-G1   PASS
S6-G2   PASS
────────────────────────
BATCH A CERTIFIED PASS — 3/3

S6-G3   BLOCKED — GENUINE PROVIDER CANDIDATE REQUIRED
S6-G4   BLOCKED — FRAMEWORK READY / PROVIDER-SPECIFIC EVIDENCE REQUIRED
S6-G5   BLOCKED — FRAMEWORK READY / PROVIDER-SPECIFIC SCHEMAS REQUIRED
S6-G6   BLOCKED — FRAMEWORK READY / PROVIDER-SPECIFIC RECONSTRUCTION REQUIRED
```

The execution pointer is stopped at S6-G3 in accordance with the frozen acceptance matrix and PREP gateway.

**End of MIQO-SP6-EXEC-001**
