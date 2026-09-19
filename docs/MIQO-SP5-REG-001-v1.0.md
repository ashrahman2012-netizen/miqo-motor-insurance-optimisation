# MIQO-SP5-REG-001 — Production Regulatory & Data Architecture v1.0

**Document ID:** MIQO-SP5-REG-001  
**Version:** 1.0  
**Status:** FROZEN CONTROL MAP — LEGAL/COMPLIANCE DECISIONS RESERVED  
**Date:** 20 September 2026  
**Parent:** MIQO-SP5-PREP-001 v1.0

## 1. Purpose
This document extends the Sprint 4 regulatory reservation into production-readiness controls. It is an architecture/control map, not legal advice and not an FCA-perimeter determination.

## 2. Inherited controls
Sprint 4 established truthful-representation controls, F/V/D/I/O provenance, O-only optimisation, human customer selection, commercial-ranking independence, separate premium/excess dimensions and synthetic-only operation. Sprint 5 MUST preserve them.

## 3. 2026 regulatory change control
The production design must not freeze regulatory assumptions at the Sprint 4 date. In particular, the Data (Use and Access) Act 2025 amended the UK automated-decision-making framework, and FCA ICOBS rules/guidance have 2026 amendments. Regulatory references therefore require effective-date/version tracking and pre-launch revalidation.

## 4. Production control matrix
| Area | Required architecture control | Activation evidence |
|---|---|---|
| FCA perimeter/permissions | Record the actual MIQO role, regulated activities, principal/AR or authorised-firm relationship if applicable; no software inference | signed perimeter/permissions decision |
| Advice vs non-advised distribution | Recommendation semantics and UI must match the approved operating model | approved journey classification + disclosure set |
| Demands and needs | Capture customer demands/needs and prove proposed contract consistency where ICOBS applies | versioned demands/needs record and test evidence |
| Eligibility | Prevent or clearly surface products for which customer cannot claim relevant benefits | eligibility rules, provider evidence, exception handling |
| Consumer Duty/customer understanding | Material limitations, exclusions, costs and recommendation basis must be understandable and timely | disclosure tests, support design, monitoring |
| Remuneration/conflicts | Commercial ledger isolated from ranking; required remuneration/status disclosures versioned | invariance tests + disclosure approval |
| Controller/processor roles | Role recorded per data flow/provider; Article 28/joint-controller arrangements where applicable | approved data-flow/RACI + contracts |
| Lawful basis/purpose | Processing purpose and lawful basis recorded before collection/use | RoPA/lawful-basis decision |
| Data minimisation | Production schema limited to necessary approved purposes | field-purpose review |
| Accuracy | Customer correction creates versioned factual state; external data cannot silently overwrite F | correction/provenance tests |
| Retention/deletion | Purpose-specific retention, deletion, legal hold and backup treatment | approved schedule + deletion test |
| DSAR/rights | Search, export, correction, restriction/objection handling as applicable | rights runbook + test evidence |
| Automated decision-making/profiling | Classify whether decisions are solely automated and significant; provide safeguards where applicable under current UK law | ADM assessment, human-involvement design, challenge/review path |
| DPIA | High-risk processing cannot activate without completed DPIA where required | approved DPIA + residual-risk acceptance/escalation |
| Data sharing | Provider transfers use approved contracts, purposes, security and minimisation | data-sharing agreement + transfer map |
| Security | Least privilege, encryption, secret isolation, access logging, vulnerability/incident controls | security review + test evidence |
| PECR/marketing | Marketing/tracking remains separate from quotation/recommendation and uses applicable consent/communications controls | CMP/consent design if used; no optimiser dependency |
| Complaints/support | Ownership, escalation, records and regulatory response times defined for actual operating model | approved support/complaints runbook |
| Provider contracts | Technical integration does not substitute for contractual authority to access/use provider services/data | executed agreement + route activation approval |

## 5. Automated decision architecture
MIQO must distinguish:

```text
Decision support / ranked information
        ≠ automatically
Solely automated significant decision
```

Classification depends on actual effect and meaningful human involvement, not the label attached by software. Recommendation provenance, meaningful explanation and challenge/review capability remain mandatory design controls even where the stricter statutory ADM provisions are ultimately assessed not to apply.

## 6. DPIA trigger architecture
A `DpiaAssessment` control record SHALL include purpose, categories of data, processing operations, profiling/ADM characteristics, scale, vulnerability factors, systematic monitoring, data sharing, necessity/proportionality, risks, mitigations, residual risk, approval status and effective version. `REAL_DATA` activation fails closed if required DPIA approval is absent.

## 7. Data-role architecture
Every external flow SHALL identify `controller_role`, `counterparty_role`, purpose, lawful basis, data categories, direction, location/transfer mechanism where relevant, retention responsibility, DSAR responsibility, incident-notification route and contract version.

## 8. Regulatory source baseline
Production execution must revalidate against current primary/official sources including FCA Handbook ICOBS, FCA Consumer Duty materials, UK GDPR/DPA 2018 as amended by the Data (Use and Access) Act 2025, ICO controller/processor and DPIA guidance, PECR guidance, Consumer Insurance (Disclosure and Representations) Act 2012, Road Traffic Act 1988 and Equality Act 2010.

## 9. Reserved governance decisions
No PREP document may choose the FCA operating model, advice status, controller allocation, lawful basis, retention periods, complaints ownership or bind/pay model on management's behalf. These are explicit production governance decisions and are prerequisites to their corresponding activation gates.

## 10. Determination
Regulatory/data architecture: **DEFINED**.  
Production legal/perimeter determination: **OPEN — GOVERNANCE INPUT REQUIRED BEFORE ACTIVATION**.  
Real-data/live-distribution activation: **BLOCKED UNTIL APPLICABLE GATES PASS**.

**End of MIQO-SP5-REG-001 v1.0**