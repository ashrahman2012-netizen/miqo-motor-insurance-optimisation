# MIQO-SP6-SEOPA-ENQUIRY-001 — Certification Access & Technical Discovery Enquiry

**Document ID:** MIQO-SP6-SEOPA-ENQUIRY-001  
**Version:** 1.0  
**Status:** READY FOR EXTERNAL CONTACT  
**Parent:** MIQO-SP6-PROVIDER-ONBOARD-001  
**Candidate:** Seopa Ltd / Quotezone  
**Date:** 20 September 2026

## 1. Intended recipient

Seopa partnerships / technical onboarding team.

Public contact route:
- Seopa website contact form / partnership enquiry;
- public general contact address: `info@seopa.com`.

Use the provider's confirmed partnership/onboarding contact if Seopa redirects the enquiry.

## 2. Subject

**MIQOS — UK private-car comparison certification/API integration enquiry**

## 3. Message

Hello Seopa Partnerships / Technical Onboarding Team,

We are developing MIQOS, a UK motor-insurance quotation optimisation and comparison platform, and are assessing Seopa / Quotezone as a potential comparison-provider integration for our controlled certification programme.

At this stage we are seeking a **technical and partnership discovery conversation only**. We are not requesting production activation or proposing to transmit real customer data.

Our architecture requires us to determine whether Seopa can support a certification-stage integration in which MIQOS submits a machine-readable UK private-car risk/quotation request, receives machine-readable quotation results, preserves the provider response as immutable technical evidence, normalises the returned quotation data, and performs its own comparison using an objective explicitly selected by the customer.

Could you please confirm whether Seopa supports this type of **headless/API quotation interaction**, as distinct from an affiliate redirect or a journey that is completed entirely on a Seopa/Quotezone-hosted front end?

If this integration model is supported, we would appreciate the appropriate onboarding route and, subject to your access controls, the following certification information:

1. availability of a sandbox or certification environment for UK private-car insurance comparison;
2. certification hostname/endpoint reference;
3. API/integration documentation and current version;
4. request schema;
5. response schema;
6. authentication method;
7. rate-limit, timeout and retry requirements;
8. idempotency and request/response correlation requirements;
9. permitted certification/test-data rules and prohibited data;
10. certification test cases or test pack, if applicable;
11. certification credential issuance and rotation process;
12. whether MIQOS may retain raw quote responses as immutable technical/audit evidence;
13. whether returned quote information may be normalised and independently compared by MIQOS using a customer-selected objective;
14. requirements governing display of insurer/provider identity, premium, excess, product features, exclusions and limitations;
15. required customer handoff model following comparison;
16. expected regulatory and data-role allocation for this integration model;
17. the commercial/contracting process for this type of partnership;
18. whether technical certification access may begin while the commercial agreement remains under negotiation; and
19. the appropriate technical onboarding owner/contact.

For clarity, MIQOS would use **synthetic or provider-approved certification data only** during this stage. We do not require or want production credentials for the certification exercise, and we would not include credential values in project documentation.

If Seopa's available partner model is instead limited to affiliate redirect or hosted/co-branded journeys without machine-readable quote evidence being returned to the partner, it would be helpful to confirm that as well so we can assess architectural compatibility correctly.

We would be happy to provide a concise integration architecture diagram and arrange a discovery call with the relevant commercial, technical and compliance stakeholders.

Kind regards,

MIQOS  
Provider Integration / Sprint 6 Certification

## 4. Required response classification

When a response is received, classify it as one of:

| Response | Sprint 6 treatment |
|---|---|
| Headless/API quotation + certification environment available | continue S6-G3 evidence completion |
| Headless/API available but certification permission pending | S6-G3 remains BLOCKED; follow provider onboarding |
| Hosted/co-branded only, but machine-readable quote evidence returned | architecture compatibility review |
| Affiliate redirect only | unsuitable for current G4–G6 quote-engine route |
| Production credentials only / no safe certification route | reject as unsafe onboarding model |
| Real customer data required for certification | stop for governance/security review |
| Raw-response retention or independent normalisation/comparison prohibited | architecture compatibility review |
| No response / insufficient technical information | S6-G3 remains BLOCKED |

## 5. Evidence handling

The provider response, documentation references and access decision must be entered into `MIQO-SP6-PROVIDER-CANDIDATE-001`.

Do not commit:
- passwords;
- API keys;
- bearer tokens;
- client secrets;
- private certificates;
- provider-confidential documents unless repository access/classification explicitly permits them.

Use secret/reference identifiers only.

**End of MIQO-SP6-SEOPA-ENQUIRY-001**
