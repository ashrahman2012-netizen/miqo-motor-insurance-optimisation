# MIQO-SP6-PREP-001 — Controlled Production Activation & First Live Provider Certification v1.0

**Document ID:** MIQO-SP6-PREP-001  
**Version:** 1.0  
**Status:** FROZEN — PRE-EXECUTION CONTROL  
**Date:** 20 September 2026  
**Branch:** `miqo/sp6-prep-001`  
**Inherited baseline:** `MIQO-SP5-CLOSE-001` / Sprint 5 result 22 PASS / 2 BLOCKED  
**Acceptance control:** `MIQO-SP6-ACCEPT-001 v1.0`

## 0. Authority

Sprint 6 is a controlled provider-certification and production-activation programme. This PREP control authorises architecture and engineering preparation only.

It does **not** authorise:
- real customer data;
- a production provider route;
- customer distribution;
- policy binding, premium collection or policy issuance;
- substitution of engineering evidence for legal/regulatory or contractual authority.

## 1. Inherited closure state

Sprint 6 inherits Sprint 5 without reopening its evidence:

```text
S5-G0  → S5-G19    PASS
S5-G20              BLOCKED — external legal/regulatory approval
S5-G21              BLOCKED — provider contractual authority
S5-G22              PASS
S5-G23              PASS
```

Inherited capability decisions remain:

```text
REAL_DATA      NOT_AUTHORISED
LIVE_PROVIDER  NOT_AUTHORISED
DISTRIBUTION   NOT_AUTHORISED
BIND_PAY       NOT_AUTHORISED — OUT OF SCOPE
```

The governing invariant remains:

> **Change choices — not facts.**

Provider translation must not invent or mutate customer facts. Commercial remuneration remains unavailable to scenario generation, eligibility, comparison and recommendation ranking.

## 2. Sprint 6 purpose

Sprint 6 SHALL create the controlled path from production-capable architecture to a first provider-specific production certification and, only where all external conditions are satisfied, a tightly bounded initial live pilot.

The programme separates:

```text
Provider-neutral engineering
        ↓
Named provider candidate
        ↓
Provider-specific certification contract
        ↓
Certification environment / test evidence
        ↓
External authority + contract evidence
        ↓
Capability-specific activation decisions
        ↓
Bounded LIVE route
        ↓
Limited pilot
        ↓
Reconciliation / incident / rollback evidence
        ↓
Explicit pilot exit decision
```

No downstream state is inferred from an upstream pass.

## 3. Frozen Sprint 6 scope

### In scope
1. named-provider onboarding record and route identity;
2. provider-specific adapter/mapping certification;
3. request/response schema compatibility and provenance;
4. production endpoint/environment separation;
5. externalised production credential references and least-privilege scopes;
6. outbound network controls;
7. provider-specific timeout/retry/rate-limit/circuit policy;
8. raw-response, provider-reference and MIQO-request reconciliation;
9. certification-environment execution;
10. LIVE route activation control;
11. real-data and distribution activation controls;
12. bounded pilot population and traffic envelope;
13. kill switch / route rollback;
14. pilot observability, support, incident and reconciliation evidence;
15. explicit continue/hold/rollback pilot exit decision.

### Out of scope
- MIQOS policy binding;
- insurer-premium collection;
- policy issuance;
- silent expansion from pilot to general production;
- optimisation of factual customer data;
- commercial prioritisation of provider routes;
- using a provider contract as a substitute for legal/regulatory approval;
- using legal/regulatory approval as a substitute for provider contractual authority.

## 4. Provider candidate boundary

Provider-specific execution SHALL NOT start until a `ProviderCandidateRecord` exists containing at minimum:

- `provider_key`;
- legal/counterparty identity reference;
- intended channel: direct insurer or authorised intermediary;
- target provider environment(s);
- proposed MIQO `MarketRoute`;
- adapter owner;
- provider technical documentation version/reference;
- certification contact/owner;
- proposed credential reference names, never values;
- contractual-authority status;
- permitted test-data classification;
- provider certification prerequisites.

A candidate record may exist while contractual authority is pending, but the route remains non-LIVE.

## 5. Certification architecture

Each provider shall progress independently:

```text
ProviderCandidate
      ↓
ProviderAdapter(versioned)
      ↓
MappingSpecification(versioned)
      ↓
CertificationRoute
      ↓
Provider Contract Tests
      ↓
Raw Evidence Capture
      ↓
Normalisation Compatibility
      ↓
Recommendation Invariant Regression
      ↓
Provider Certification Result
```

Certification must prove:
- canonical request preservation;
- no invented factual values;
- deterministic field provenance;
- response-schema handling;
- raw-response immutability;
- exact provider/adaptor/mapping correlation;
- normalisation compatibility;
- explicit unsupported/unknown-field handling;
- failure/outage semantics;
- replay/idempotency behavior;
- commercial independence.

## 6. Production endpoint and credential boundary

Provider environments must remain distinct:

```text
CERTIFICATION endpoint/credentials
            ≠
PRODUCTION endpoint/credentials
```

Production credentials:
- are referenced by identifier only;
- are environment and provider scoped;
- must support rotation/revocation;
- must not appear in source, logs, customer-facing payloads, quote evidence or audit payloads;
- cannot be loaded unless the associated capability gate is authorised.

Outbound access must fail closed unless the exact provider/environment endpoint is approved.

## 7. Activation dependency graph

### LIVE_PROVIDER
Requires all of:
- provider candidate approved for LIVE consideration;
- provider certification PASS;
- inherited S5-G20 resolved to approved production operating-model evidence;
- inherited S5-G21 resolved for the exact route/counterparty;
- production credential reference provisioned;
- operational readiness PASS;
- explicit LIVE_PROVIDER activation decision.

### REAL_DATA
Requires all of:
- S5-G20 resolved;
- approved purpose/lawful-basis/data-role records for the actual production flow;
- approved retention/deletion/legal-hold schedule;
- DPIA/ADM controls where required by the approved model;
- production security/incident approval;
- explicit REAL_DATA activation decision.

### DISTRIBUTION
Requires all of:
- S5-G20 resolved;
- approved customer terms/disclosures;
- approved complaints/support/redress ownership;
- approved target-customer/pilot rules;
- explicit DISTRIBUTION activation decision.

### BIND_PAY
Remains NOT_AUTHORISED and outside Sprint 6. A separate future gateway is required.

## 8. Limited pilot architecture

No LIVE provider activation automatically creates a public customer journey.

Any first pilot SHALL define:
- named provider route;
- start/end or explicit stop conditions;
- maximum traffic/customer envelope;
- permitted data classification;
- distribution channel;
- monitoring thresholds;
- reconciliation frequency;
- support/escalation owner;
- incident stop criteria;
- kill-switch owner;
- rollback procedure;
- post-pilot evidence review.

Pilot expansion requires a separate decision.

## 9. Reconciliation control

Every provider interaction in a pilot must be reconstructable across:

```text
RiskProfileVersion
→ Scenario
→ MarketRoute
→ ProviderAdapter + MappingVersion
→ QuoteRequest
→ Provider correlation/reference
→ RawProviderResponse
→ NormalisedQuote
→ Recommendation evidence
→ Customer selection/handoff (if distribution authorised)
```

Reconciliation must detect missing, duplicate, stale, mismatched or materially inconsistent provider evidence without silently correcting historical records.

## 10. Kill switch and rollback

A provider route must be independently deactivatable without:
- deleting historical evidence;
- changing locked facts;
- mutating existing recommendation evidence;
- disabling synthetic/certification operation for unrelated routes.

Rollback must restore a previously certified adapter/mapping/policy version or disable the route entirely. Emergency disable must not require customer-data mutation.

## 11. Execution decomposition

Subject to the PREP gateway, `MIQO-SP6-EXEC-001` should execute in controlled batches:

- **Batch A — S6-G0–G2:** Sprint 5 inheritance, dependency freeze, provider-neutral control baseline;
- **Batch B — S6-G3–G6:** provider candidate, adapter/mapping certification contract, schemas and provenance;
- **Batch C — S6-G7–G10:** credentials, endpoint/network boundary, resilience and certification-route execution;
- **Batch D — S6-G11–G13:** reconciliation, LIVE-route fail-closed gate and independent activation linkage;
- **Batch E — S6-G14–G16:** bounded pilot controls, kill switch/rollback, operational evidence;
- **Batch F — S6-G17:** explicit pilot exit decision.

Engineering batches may proceed where their evidence is available. LIVE/pilot steps stop at unavailable external dependencies.

## 12. Genuine external dependencies

Sprint 6 MUST stop rather than infer:
1. specialist legal/regulatory production operating-model approval (inherited S5-G20);
2. named provider/intermediary contractual authority for a LIVE route (inherited S5-G21);
3. provider technical/certification materials that are not supplied or contractually accessible;
4. production credentials;
5. real-data governance approvals;
6. customer distribution approval;
7. pilot ownership and risk acceptance.

## 13. PREP determination

Architecture definition: **PASS**.  
Sprint 5 inheritance: **PASS / FROZEN**.  
Provider-neutral engineering preparation: **AUTHORISED**.  
Named-provider certification execution: **BLOCKED UNTIL PROVIDER CANDIDATE EXISTS**.  
LIVE activation: **BLOCKED UNTIL EXTERNAL DEPENDENCIES PASS**.  
Real-data activation: **NOT AUTHORISED**.  
Distribution activation: **NOT AUTHORISED**.  
Bind/pay: **OUT OF SCOPE / NOT AUTHORISED**.

**End of MIQO-SP6-PREP-001 v1.0**
