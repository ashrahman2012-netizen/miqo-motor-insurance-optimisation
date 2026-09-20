# MIQO-SP6-PROVIDER-ONBOARD-001 — Reference Provider Discovery & Certification Access

**Document ID:** MIQO-SP6-PROVIDER-ONBOARD-001  
**Version:** 1.0  
**Status:** ACTIVE — EXTERNAL OUTREACH SENT / PROVIDER RESPONSE PENDING  
**Sprint:** MIQO-SP6-EXEC-001  
**Parent gate:** S6-G3 — Named Provider Candidate  
**Candidate record:** MIQO-SP6-PROVIDER-CANDIDATE-001  
**Date:** 20 September 2026

## 1. Objective

Establish whether **Seopa Ltd / Quotezone** is technically and contractually suitable to enter the MIQO Sprint 6 provider-certification chain.

This workstream does not attempt to certify Seopa from public information. Its purpose is to convert a genuine public candidate into a provider-specific certification candidate only after Seopa supplies or authorises the required non-public technical material and certification access.

## 2. Candidate selection

**Primary candidate:** Seopa Ltd  
**MIQO provider key:** `SEOPA`  
**Proposed MIQO route key:** `SEOPA_UK_CAR_COMPARISON_CERT_V1`  
**Intended channel:** `AUTHORISED_INTERMEDIARY`  
**Initial route mode:** `CERTIFICATION`

Public evidence reviewed on 20 September 2026 supports the following limited conclusions:

1. Seopa operates the platform behind Quotezone and CompareNI and offers UK insurance-comparison partnership models.
2. Seopa publicly includes car insurance within its comparison proposition.
3. Seopa describes white-label/co-branded, affiliate and panel partnership routes.
4. Seopa states that its platform handles provider panels, quote logic, provider connections and data for co-branded journeys.
5. Seopa states that regulatory/data responsibilities are agreed contractually before launch.
6. Seopa publicly identifies Seopa Ltd as FCA-regulated with FRN 313860 and Quotezone as a trading style of Seopa Ltd.

Public evidence **does not establish** that Seopa offers MIQO the required headless quotation interface or certification environment.

## 3. Public evidence register

| Evidence ID | Source | Supported point |
|---|---|---|
| PUBLIC-SEOPA-001 | https://www.seopa.com/ | UK comparison platform; car insurance; partner routes; provider relationships; partner support |
| PUBLIC-SEOPA-002 | https://www.seopa.com/how-to-partner-with-an-insurance-comparison-platform/ | partnership process; white-label/co-branded, affiliate and panel models; contractual allocation of responsibilities |
| PUBLIC-SEOPA-003 | https://www.seopa.com/services/white-label/ | co-branded comparison proposition and public regulatory statement |
| PUBLIC-SEOPA-004 | https://www.seopa.com/quotezone/ | Quotezone relationship, registered company details and public FCA reference |
| PUBLIC-FCA-001 | https://www.fca.org.uk/firms/financial-services-register | authoritative FCA register service to be used for current firm/permission verification |

These sources support candidate discovery only. They do not substitute for provider-issued certification documentation, access permission, contract authority or MIQO's specialist regulatory determination.

## 4. Compatibility question

The decisive technical question is whether Seopa supports the following provider interaction:

```text
MIQO locked factual profile
        +
scenario-specific O choices
        ↓
Seopa certification interface
        ↓
provider-panel quotation execution
        ↓
machine-readable quote responses
        ↓
MIQO immutable raw-response capture
        ↓
MIQO normalisation
        ↓
MIQO customer-objective comparison/recommendation
```

The following alone are not sufficient for the existing MIQO quote-engine architecture:

- affiliate redirect only;
- customer completion entirely on a hosted Quotezone journey with no machine-readable quote evidence returned to MIQO;
- reporting/API access that does not provide quote request/response execution;
- production-only credentials with no safe certification route.

A hosted/co-branded model may be suitable only if Seopa can expose the quotation evidence and rights needed for MIQO's frozen lineage and independent comparison controls.

## 5. Required provider enquiry packet

The first Seopa discovery/technical contact SHALL request:

1. confirmation that MIQO may access a sandbox/certification environment for UK private-car insurance comparison;
2. confirmation whether a headless/API quotation interface is available, rather than only hosted/redirect journeys;
3. certification hostname or endpoint reference;
4. API/integration documentation and version;
5. request schema;
6. response schema;
7. authentication model;
8. rate-limit, timeout and retry requirements;
9. required idempotency and correlation behaviour;
10. test-data rules and prohibited data;
11. provider certification test cases/test pack;
12. credential issuance and rotation process;
13. confirmation whether MIQO may retain raw quote responses as immutable technical/audit evidence;
14. confirmation whether MIQO may normalise the responses and independently compare/rank them using a customer-selected objective;
15. permitted display/use of insurer/provider name, premium, excess, features, exclusions and limitations;
16. required customer handoff model;
17. expected regulatory/data-role allocation for the proposed integration;
18. commercial/contracting process;
19. whether certification access can begin while the commercial agreement remains under negotiation;
20. technical onboarding owner/contact.

No secret value should be requested by email or stored in repository evidence.

## 6. Outreach message — approved content basis

The external enquiry should explain that MIQO is seeking a **certification-stage technical assessment**, not production activation.

It should state that MIQO needs to determine whether Seopa can support:
- machine-readable UK private-car quotation requests and responses;
- synthetic/certification data during onboarding;
- preservation of provider response evidence;
- MIQO-side normalisation and customer-objective comparison;
- a separate certification environment before any production consideration.

The enquiry must not state or imply that:
- MIQO already has contractual authority;
- Seopa has approved certification access;
- S6-G3 has passed;
- LIVE_PROVIDER, REAL_DATA or DISTRIBUTION is authorised.

## 7. Stop conditions

```text
No headless/API quote capability
        → candidate unsuitable for G4–G6 quote-engine route

No certification permission
        → S6-G3 BLOCKED

Affiliate redirect only
        → candidate unsuitable for MIQO raw-quote lineage

Production credentials only
        → reject as unsafe onboarding route

Real customer data required for certification
        → stop for data-governance/security review

Provider forbids retention/normalisation/independent comparison
        → architecture compatibility review before proceeding
```

## 8. S6-G3 target state

S6-G3 SHALL remain BLOCKED until the candidate record can evidence at minimum:

```text
Provider / counterparty       Seopa Ltd
Channel                       AUTHORISED_INTERMEDIARY
Certification environment     IDENTIFIED
Environment access            AVAILABLE
Certification access          YES
Technical documentation       RECEIVED / VERSIONED
Request schema                RECEIVED
Response schema               RECEIVED
Authentication                DEFINED
Rate-limit/retry              DEFINED or explicitly provider-unrestricted
Test-data rules               APPROVED
Certification/test pack       RECEIVED or explicitly NOT_REQUIRED by provider
Contractual authority         PENDING or APPROVED
Production access             NO / PENDING expected at this stage
```

Contractual authority may remain `PENDING` at S6-G3 only if Seopa has genuinely permitted the certification activity being undertaken.

## 9. Execution sequence

```text
Seopa identified
      ↓
MIQO-SP6-PROVIDER-CANDIDATE-001 opened
      ↓
technical/partnership enquiry
      ↓
headless/API suitability confirmed
      ↓
certification access authorised
      ↓
technical pack received
      ↓
candidate record completed/frozen
      ↓
S6-G3 assessment
      ↓
provider-specific S6-G4 → G6 certification
```

## 10. Contact initiation evidence

The controlled enquiry `MIQO-SP6-SEOPA-ENQUIRY-001` was sent on **20 September 2026** to Seopa's public contact address `info@seopa.com`.

Evidence:
- Gmail message ID: `1a0beeda458d4ac4`
- Gmail thread ID: `1a0bee474467a27d`
- Contact state: `SENT / AWAITING_PROVIDER_RESPONSE`

The enquiry requested certification access and technical discovery only. It did not request production credentials, transmit real customer data, or claim any production authority.

## 11. Current decision

**Provider discovery:** PASS — genuine candidate identified.  
**Provider-candidate record:** CREATED / INCOMPLETE.  
**External enquiry:** SENT 20 September 2026 to `info@seopa.com`; Gmail message `1a0beeda458d4ac4`, thread `1a0bee474467a27d`.  
**S6-G3:** BLOCKED — legitimate certification environment/access and provider technical pack not yet evidenced.  
**S6-G4–G6:** provider-neutral framework ready; provider-specific certification blocked by S6-G3.

**End of MIQO-SP6-PROVIDER-ONBOARD-001**
