# MIQO-SP6-PROVIDER-RESPONSE-REVIEW-001 — Provider Response Review Record

**Document ID:** MIQO-SP6-PROVIDER-RESPONSE-REVIEW-001  
**Version:** 1.0-TEMPLATE  
**Status:** AWAITING PROVIDER RESPONSE  
**Sprint:** MIQO-SP6-EXEC-001  
**Onboarding workstream:** MIQO-SP6-PROVIDER-ONBOARD-001  
**Candidate:** Seopa Ltd / Quotezone  
**Parent gate:** S6-G3  
**Date:** 20 September 2026

## 1. Response evidence

| Field | Value |
|---|---|
| Response received | **PENDING** |
| Response date/time | **TBD** |
| Provider contact | **TBD** |
| Provider role/team | **TBD** |
| Provider evidence reference | **TBD** |
| Gmail thread/reference | `1a0bee474467a27d` |
| Attachments / technical-pack references | **TBD** |

Do not copy credentials or secret values into this record.

## 2. Architectural capability classification

| Control question | Allowed values | Current |
|---|---|---|
| Headless/API quotation | YES / NO / UNCLEAR | **UNCLEAR** |
| Certification environment | AVAILABLE / PENDING / NONE / UNCLEAR | **PENDING** |
| Machine-readable quote responses | YES / NO / UNCLEAR | **UNCLEAR** |
| Raw-response retention | PERMITTED / RESTRICTED / PROHIBITED / UNCLEAR | **UNCLEAR** |
| Independent normalisation | PERMITTED / RESTRICTED / PROHIBITED / UNCLEAR | **UNCLEAR** |
| Independent customer-objective ranking/comparison | PERMITTED / RESTRICTED / PROHIBITED / UNCLEAR | **UNCLEAR** |
| Synthetic/certification data | PERMITTED / RESTRICTED / PROHIBITED / UNCLEAR | **UNCLEAR** |
| Technical pack | COMPLETE / PARTIAL / NOT_PROVIDED / PENDING | **PENDING** |
| Certification access | APPROVED / PENDING / REFUSED | **PENDING** |
| Production access | APPROVED / PENDING / REFUSED / NOT_REQUESTED | **NOT_REQUESTED** |

## 3. Technical evidence received

| Item | Status | Reference / version |
|---|---|---|
| Certification endpoint/hostname | PENDING | TBD |
| API/integration documentation | PENDING | TBD |
| Request schema | PENDING | TBD |
| Response schema | PENDING | TBD |
| Authentication model | PENDING | TBD |
| Timeout requirements | PENDING | TBD |
| Rate-limit requirements | PENDING | TBD |
| Retry requirements | PENDING | TBD |
| Idempotency requirements | PENDING | TBD |
| Correlation/reference semantics | PENDING | TBD |
| Test-data rules | PENDING | TBD |
| Certification test pack | PENDING | TBD |
| Credential issuance process | PENDING | TBD |
| Display/handoff requirements | PENDING | TBD |
| Data-role/regulatory expectations | PENDING | TBD |

## 4. Compatibility decision rules

### COMPATIBLE candidate
May be recorded only when evidence supports:
- headless/API or equivalent machine-readable quotation execution;
- certification environment/access;
- machine-readable quote results;
- MIQO raw-evidence retention compatible with the frozen lineage;
- MIQO normalisation/comparison permitted;
- provider-approved synthetic/certification data;
- sufficient technical documentation to bind G4–G9.

### CONDITIONALLY_COMPATIBLE
Use when the core quote-engine interaction appears supportable but one or more restrictions require architecture, compliance, contractual or provider clarification.

### INCOMPATIBLE
Use when evidence establishes a hard incompatibility, including:
- affiliate redirect only with no machine-readable quote evidence;
- provider prohibits the raw-response lineage required by MIQO;
- provider prohibits the independent normalisation/comparison required by the frozen architecture;
- no safe certification route is available.

### REQUIRES_REVIEW
Use where evidence is contradictory, incomplete or materially ambiguous.

## 5. Architecture compatibility

**Current state:** `REQUIRES_REVIEW`

Allowed final values:

```text
COMPATIBLE
CONDITIONALLY_COMPATIBLE
INCOMPATIBLE
REQUIRES_REVIEW
```

Rationale: **Awaiting Seopa response.**

## 6. S6-G3 determination

**Current result:** `BLOCKED`

Allowed results:

- `PASS` — only if the genuine candidate record has sufficient provider-issued/authorised evidence for certification execution;
- `BLOCKED` — provider response/access/materials remain insufficient;
- `FAIL` — evidence establishes that the candidate cannot satisfy the frozen S6-G3 requirements.

The reviewer must not infer PASS from commercial interest, public partnership material, an affiliate arrangement, or provider-neutral engineering readiness.

## 7. Downstream routing

```text
S6-G3 PASS
    → bind provider-specific G4 mapping/adapter
    → G5 request/response schemas
    → G6 provider evidence reconstruction
    → populate G7 environment binding
    → populate G8 actual credential references
    → populate G9 provider resilience values
    → execute G10 certification harness

S6-G3 BLOCKED
    → record missing evidence
    → continue provider onboarding
    → no provider-specific certification

S6-G3 FAIL / INCOMPATIBLE
    → close candidate with reason
    → secondary provider discovery may be activated through a separate control decision
```

## 8. Review sign-off fields

| Field | Value |
|---|---|
| Reviewer | TBD |
| Review date | TBD |
| Evidence complete | NO |
| Candidate record updated | NO |
| S6-G3 gate ledger updated | NO |
| Downstream provider-specific execution authorised | NO |

**End of MIQO-SP6-PROVIDER-RESPONSE-REVIEW-001**
