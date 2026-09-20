# MIQO-SP6-PROVIDER-CANDIDATE-001 — Provider Candidate Control Record

**Document ID:** MIQO-SP6-PROVIDER-CANDIDATE-001  
**Version:** 0.2-DRAFT  
**Status:** CANDIDATE IDENTIFIED — EXTERNAL CERTIFICATION ACCESS / TECHNICAL PACK PENDING — S6-G3 BLOCKED  
**Sprint:** MIQO-SP6-EXEC-001  
**Gate:** S6-G3 — Named Provider Candidate  
**Onboarding workstream:** MIQO-SP6-PROVIDER-ONBOARD-001  
**Date:** 20 September 2026

## 1. Purpose

This record captures the genuine provider candidate selected for Sprint 6 and distinguishes publicly supportable facts from external technical evidence still required for S6-G3.

Completing public candidate discovery does **not** authorise provider certification execution, LIVE operation, real customer data, customer distribution, policy binding, payment or policy issuance.

## 2. Provider / counterparty identity

| Field | Current value | Evidence state |
|---|---|---|
| Provider key | `SEOPA` | MIQO-controlled identifier |
| Legal provider/counterparty name | **Seopa Ltd** | Publicly evidenced |
| Counterparty reference / internal vendor ID | `SEOPA` pending internal vendor registration | MIQO-controlled / not provider-issued |
| Intended channel | **AUTHORISED_INTERMEDIARY** | MIQO classification of proposed route; final contractual role remains subject to agreement |
| Primary provider relationship owner | **MIQO Provider Partnerships / Sprint 6 Owner** | MIQO assignment |
| Provider technical/certification contact | **TBD — request from Seopa partnerships/onboarding team** | External input required |

Public candidate basis:
- Seopa operates the comparison platform behind Quotezone/CompareNI and offers partner routes;
- Quotezone is publicly identified as a trading style of Seopa Ltd;
- Seopa publicly states FCA FRN 313860.

The actual permissions and suitability for the proposed MIQO integration remain subject to current register checks, specialist perimeter analysis and contractual/provider confirmation.

## 3. Certification environment

| Field | Current value | Evidence state |
|---|---|---|
| Target environment | **CERTIFICATION** | MIQO requirement |
| Provider certification/sandbox environment name | **TBD** | Not publicly supplied |
| Certification base endpoint/reference | **TBD** | No partner certification endpoint evidenced publicly |
| Environment access status | **NOT_REQUESTED** | Must move through external outreach |
| Permitted test-data classification | **SYNTHETIC** proposed | Provider confirmation required |
| Provider restrictions on test data | **TBD** | Provider technical/governance input required |

Production endpoints must not be used to satisfy this section.

## 4. Proposed MIQO MarketRoute

| Field | Current value | Evidence state |
|---|---|---|
| Proposed route key | `SEOPA_UK_CAR_COMPARISON_CERT_V1` | MIQO-controlled identifier |
| Provider key | `SEOPA` | MIQO-controlled identifier |
| Channel | **AUTHORISED_INTERMEDIARY** | Proposed MIQO classification |
| Initial route mode | **CERTIFICATION** | Frozen Sprint 6 requirement |
| Proposed adapter identifier/version | `seopa-adapter-v1` | Provisional MIQO identifier; cannot be provider-certified yet |
| Proposed mapping identifier/version | `seopa-mapping-v1` | Provisional MIQO identifier; cannot be provider-certified yet |
| Supported product / quotation scope | **UK private-car insurance comparison — subject to provider confirmation** | Public proposition supports car comparison; interface scope unconfirmed |

The route remains non-LIVE.

## 5. Technical documentation

| Field | Current value | Evidence state |
|---|---|---|
| Provider API/integration documentation reference | **TBD — request Seopa partner technical pack** | External input required |
| Documentation version/date | **TBD** | External input required |
| Request schema reference | **TBD** | External input required |
| Response schema reference | **TBD** | External input required |
| Authentication method reference | **TBD** | External input required |
| Provider error/retry/rate-limit documentation | **TBD** | External input required |
| Provider idempotency/correlation semantics | **TBD** | External input required |
| Provider certification/test-case pack reference | **TBD** | External input required |

Public references to partner integrations and API/reporting access do not establish the headless quote API required by MIQO.

## 6. MIQO ownership

| Field | Current value |
|---|---|
| Adapter engineering owner | **MIQO Engineering** |
| Mapping/canonical-model owner | **MIQO Data / Canonical Model Control** |
| Certification execution owner | **MIQO Sprint 6 Certification Owner** |
| Security/credential owner | **MIQO Security / Secrets Control Owner** |
| Operational/provider incident owner | **MIQO Production Operations — to be formally assigned before LIVE consideration** |

## 7. Credential references

Credential **values must never be entered in this document**.

| Field | Current value | Evidence state |
|---|---|---|
| Certification credential reference name(s) | **TBD after provider issuance** | Not provisioned |
| Production credential reference name(s) | **NOT PROVISIONED / NOT AUTHORISED** | Not applicable to S6-G3 |
| Credential store / secret-management reference | `secret://miqos/certification/seopa/car-comparison` | MIQO-planned reference name only |
| Scope / permissions description | **TBD from provider** | External input required |

## 8. Contractual authority

| Field | Current value | Evidence state |
|---|---|---|
| Contractual-authority status | **PENDING** | No executed provider authority supplied |
| Agreement / authority reference | **TBD** | External input required if/when approved |
| Permitted certification access | **PENDING** | Decisive S6-G3 dependency |
| Permitted production access | **PENDING / NOT AUTHORISED BY MIQO** | Later gate only |
| Restrictions / conditions | **TBD** | External input required |

Contractual authority may remain PENDING for S6-G3 only if Seopa explicitly permits the certification activity and supplies/authorises the necessary environment/materials.

S6-G12/LIVE activation cannot pass without exact contractual and other required authority.

## 9. Data classification

| Field | Current value | Evidence state |
|---|---|---|
| Certification data classification | **SYNTHETIC proposed** | Provider confirmation required |
| Real customer data permitted at certification stage | **NO — MIQO NOT_AUTHORISED** | Frozen control |
| Provider test-data constraints | **TBD** | External input required |
| Data retention/deletion requirements supplied by provider | **TBD / PENDING** | External input required |

REAL_DATA remains independently NOT_AUTHORISED.

## 10. Public evidence references

1. `PUBLIC-SEOPA-001` — Seopa corporate/partner platform: https://www.seopa.com/
2. `PUBLIC-SEOPA-002` — Seopa partnership process: https://www.seopa.com/how-to-partner-with-an-insurance-comparison-platform/
3. `PUBLIC-SEOPA-003` — Seopa white-label/co-branded proposition: https://www.seopa.com/services/white-label/
4. `PUBLIC-SEOPA-004` — Quotezone/Seopa corporate and public FCA information: https://www.seopa.com/quotezone/
5. `PUBLIC-FCA-001` — Financial Services Register entry point for current regulatory verification: https://www.fca.org.uk/firms/financial-services-register

Non-public evidence still required:
- provider-issued or provider-authorised technical integration pack;
- certification/sandbox access permission;
- certification endpoint/reference;
- request/response schemas;
- authentication and resilience requirements;
- test-data rules;
- certification pack/test cases if applicable;
- provider confirmation on raw-response retention, MIQO normalisation and independent objective-based comparison;
- provider/contact ownership;
- contractual/authority evidence when available.

## 11. S6-G3 validation checklist

- [x] provider/counterparty is real and named;
- [x] intended channel is recorded as proposed MIQO classification;
- [ ] certification environment is identified by provider;
- [x] proposed MarketRoute is identified by MIQO;
- [ ] provider technical documentation/reference is available;
- [x] MIQO adapter and certification ownership are assigned;
- [ ] credential reference names are recorded following provider issuance where applicable;
- [x] contractual-authority status is explicitly PENDING;
- [ ] permitted certification/test-data classification is provider-confirmed;
- [x] no secret value is stored in the record;
- [x] no LIVE/REAL_DATA/DISTRIBUTION authority is inferred from candidate status.

## 12. Decisive compatibility question

Before S6-G3 can pass, Seopa must confirm whether MIQO can use a certification interface that returns machine-readable UK private-car quote evidence which MIQO may preserve, normalise and independently compare using a customer-selected objective.

Affiliate redirect alone does not satisfy the current MIQO quote-engine architecture.

## 13. Current gate state

```text
Provider discovery              PASS
ProviderCandidateRecord         CREATED / INCOMPLETE
External technical outreach     REQUIRED
Certification permission        PENDING
Technical pack                  PENDING
        ↓
S6-G3                           BLOCKED
        ↓
Provider-specific G4–G6         NOT YET EXECUTABLE
```

**End of MIQO-SP6-PROVIDER-CANDIDATE-001**
