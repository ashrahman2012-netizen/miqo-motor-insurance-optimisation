# MIQO-SP6-PROVIDER-CANDIDATE-001 — Provider Candidate Control Record

**Document ID:** MIQO-SP6-PROVIDER-CANDIDATE-001  
**Version:** 0.1-DRAFT  
**Status:** AWAITING EXTERNAL PROVIDER INPUT — DOES NOT SATISFY S6-G3  
**Sprint:** MIQO-SP6-EXEC-001  
**Gate:** S6-G3 — Named Provider Candidate  
**Date:** 20 September 2026

## 1. Purpose

This record captures the minimum genuine external information required before provider-specific Sprint 6 certification may begin.

Completing this document does **not** authorise LIVE operation, real customer data, customer distribution, policy binding, payment or policy issuance.

A placeholder, invented provider identity, synthetic counterparty, or assumed contractual status cannot satisfy S6-G3.

## 2. Provider / counterparty identity

| Field | Required value |
|---|---|
| Provider key | **REQUIRED** |
| Legal provider/counterparty name | **REQUIRED** |
| Counterparty reference / internal vendor ID | **REQUIRED** |
| Intended channel | **DIRECT_INSURER** or **AUTHORISED_INTERMEDIARY** |
| Primary provider relationship owner | **REQUIRED** |
| Provider technical/certification contact | **REQUIRED where available** |

## 3. Certification environment

| Field | Required value |
|---|---|
| Target environment | **CERTIFICATION** |
| Provider certification/sandbox environment name | **REQUIRED** |
| Certification base endpoint/reference | **REQUIRED — reference/approved hostname only; no secrets** |
| Environment access status | **NOT_REQUESTED / REQUESTED / AVAILABLE / BLOCKED** |
| Permitted test-data classification | **SYNTHETIC** or **CERTIFICATION_DATA** |
| Provider restrictions on test data | **REQUIRED if applicable** |

Production endpoints must not be used to satisfy the certification-environment requirement.

## 4. Proposed MIQO MarketRoute

| Field | Required value |
|---|---|
| Proposed route key | **REQUIRED** |
| Provider key | **REQUIRED — must match Section 2** |
| Channel | **DIRECT_INSURER / AUTHORISED_INTERMEDIARY** |
| Initial route mode | **CERTIFICATION** |
| Proposed adapter identifier/version | **REQUIRED or explicitly TO_BE_ASSIGNED** |
| Proposed mapping identifier/version | **REQUIRED or explicitly TO_BE_ASSIGNED** |
| Supported product / quotation scope | **REQUIRED** |

The initial provider-specific route remains non-LIVE.

## 5. Technical documentation

| Field | Required value |
|---|---|
| Provider API/integration documentation reference | **REQUIRED** |
| Documentation version/date | **REQUIRED where provider supplies one** |
| Request schema reference | **REQUIRED** |
| Response schema reference | **REQUIRED** |
| Authentication method reference | **REQUIRED — method only, no credential values** |
| Provider error/retry/rate-limit documentation | **REQUIRED where available** |
| Provider idempotency/correlation semantics | **REQUIRED where available** |
| Provider certification/test-case pack reference | **REQUIRED where applicable** |

If documentation is incomplete, the missing item remains an explicit provider-specific dependency.

## 6. MIQO ownership

| Field | Required value |
|---|---|
| Adapter engineering owner | **REQUIRED** |
| Mapping/canonical-model owner | **REQUIRED** |
| Certification execution owner | **REQUIRED** |
| Security/credential owner | **REQUIRED before credential provisioning** |
| Operational/provider incident owner | **REQUIRED before LIVE consideration** |

## 7. Credential references

Credential **values must never be entered in this document**.

| Field | Required value |
|---|---|
| Certification credential reference name(s) | **REQUIRED where authentication is needed** |
| Production credential reference name(s) | **NOT REQUIRED for S6-G3; required before LIVE consideration** |
| Credential store / secret-management reference | **REQUIRED where credentials are provisioned** |
| Scope / permissions description | **REQUIRED where credentials are provisioned** |

Example format: a secret-manager key/reference name, not the secret itself.

## 8. Contractual authority

| Field | Required value |
|---|---|
| Contractual-authority status | **PENDING / APPROVED** |
| Agreement / authority reference | **REQUIRED if APPROVED** |
| Permitted certification access | **YES / NO / PENDING** |
| Permitted production access | **YES / NO / PENDING** |
| Restrictions / conditions | **REQUIRED where applicable** |

A provider candidate may satisfy S6-G3 with contractual authority still **PENDING** only where the candidate and available documentation/access are genuine and any proposed certification activity is actually permitted.

S6-G12/LIVE activation cannot pass without the exact required contractual authority.

## 9. Data classification

| Field | Required value |
|---|---|
| Certification data classification | **SYNTHETIC / CERTIFICATION_DATA** |
| Real customer data permitted at certification stage | **NO unless separately authorised — default NO** |
| Provider test-data constraints | **REQUIRED where applicable** |
| Data retention/deletion requirements supplied by provider | **REFERENCE / PENDING** |

REAL_DATA remains independently NOT_AUTHORISED until its own activation dependencies pass.

## 10. Evidence attachments / references

List the actual evidence supporting this candidate record:

1. provider/counterparty identity reference;
2. technical integration documentation;
3. certification/sandbox access documentation;
4. schema references;
5. provider certification/test pack if supplied;
6. contractual/authority evidence if available;
7. credential reference metadata if provisioned;
8. any provider security or data-processing requirements relevant to certification.

Do not copy secret values into attachments intended for the repository.

## 11. S6-G3 validation checklist

S6-G3 may be marked PASS only when all required candidate fields are populated with genuine provider-specific information and the record is internally consistent.

- [ ] provider/counterparty is real and named;
- [ ] intended channel is recorded;
- [ ] certification environment is identified;
- [ ] proposed MarketRoute is identified;
- [ ] technical documentation/reference is available;
- [ ] adapter and certification ownership are assigned;
- [ ] credential reference names are recorded where applicable;
- [ ] contractual-authority status is explicitly recorded;
- [ ] permitted certification/test-data classification is explicit;
- [ ] no secret value is stored in the record;
- [ ] no LIVE/REAL_DATA/DISTRIBUTION authority is inferred from candidate status.

## 12. Current gate state

```text
S6-G0  PASS
S6-G1  PASS
S6-G2  PASS
        ↓
S6-G3  BLOCKED
        ↓
Awaiting genuine ProviderCandidateRecord
```

**End of MIQO-SP6-PROVIDER-CANDIDATE-001**
