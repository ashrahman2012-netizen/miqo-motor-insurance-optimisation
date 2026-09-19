# MIQO-SP5-PREP-001-GATE-REVIEW-001 — Pre-Execution Gateway Decision

**Date:** 20 September 2026  
**Branch:** `miqo/sp5-prep-001`  
**Inputs:** MIQO-SP5-PREP-001 v1.0; MIQO-SP5-REG-001 v1.0; MIQO-SP5-ACCEPT-001 v1.0

## 1. Gateway results
| Gateway | Result |
|---|---|
| G0 repository baseline and Sprint 4 inheritance | PASS |
| Architecture definition | PASS |
| Provider-integration boundary | PASS |
| Production data-governance architecture | PASS |
| Regulatory control architecture | PASS |
| Commercial-separation architecture | PASS |
| Resilience/observability architecture | PASS |
| Acceptance matrix freeze | PASS |
| Cross-document consistency | PASS |
| Production operating-model architecture position | FROZEN — SUBJECT TO PRE-PRODUCTION SPECIALIST PERIMETER DETERMINATION |

## 2. Frozen Sprint 5 governance position

The following positions are controlling for Sprint 5 architecture and execution. They define the intended operating model without purporting to determine the final UK regulatory perimeter.

| Governance question | Frozen position |
|---|---|
| Operating model | Non-advised quotation optimisation/comparison service. FCA perimeter is not yet finally determined. Production requires specialist perimeter determination and an appropriate authorised structure if the activity is regulated. |
| Customer journey | Non-advised. Customer selects the optimisation objective and makes the final purchase decision. MIQOS does not provide suitability assessment or a personal recommendation. |
| Transaction boundary | External handoff only. MIQOS does not bind insurance, collect insurance premium or issue policies. Any MIQOS service fee is separate and subject to pre-agreed terms. |
| Provider model | Both direct insurer routes and authorised comparison/intermediary routes are permitted through governed, versioned `MarketRoute` objects. |
| Data role | Controller/processor status remains TBD per processing activity, data flow and provider contract. No blanket designation is permitted. |

### Controlling operating-model statement

> **“MIQOS is deliberately designed not to provide personal insurance advice and not to bind or transact insurance. Its intended activity is non-advised quotation optimisation, comparison and customer-directed handoff. Whether those activities constitute regulated insurance distribution or arranging under the UK regulatory perimeter will be formally determined before production deployment.”**

This statement is an architecture boundary, not a legal conclusion that the activity is outside FCA regulation.

## 3. Decision

**PRE-EXECUTION GATE: PASS FOR SPRINT 5 ENGINEERING EXECUTION**

`MIQO-SP5-EXEC-001` is authorised to proceed across the Sprint 5 engineering scope using the frozen governance architecture above.

Production activation remains separately gated. No engineering completion, test pass or CI certification may be represented as authorisation to process real customer data, activate live provider routes, conduct regulated insurance distribution, or deploy into production where the required specialist/legal/compliance determinations and operational evidence remain outstanding.

The following remain **pre-production activation conditions**, not unresolved Sprint 5 architecture choices:
- specialist FCA perimeter/permissions determination against the implemented operating model;
- appropriate authorised structure if the determined activities require it;
- controller/processor allocation by actual processing activity and provider contract;
- lawful-basis configuration by processing purpose;
- approved retention/deletion schedule;
- DPIA and other production data-protection evidence where required;
- provider/intermediary contractual approvals and production credentials;
- customer disclosures and terms, including separate MIQOS service-fee terms;
- complaints/support/redress ownership appropriate to the final regulated operating model;
- security, incident and operational production-readiness approvals.

## 4. Engineering implications

Sprint 5 implementation SHALL preserve these boundaries:

1. Recommendation and optimisation logic must remain non-advised in architecture: objective selection belongs to the customer, recommendation evidence is explainable, and final selection remains customer-directed.
2. No MIQOS policy-binding, insurer-premium collection or policy-issuance capability may be introduced within Sprint 5.
3. Provider connectivity must use governed `MarketRoute` abstractions capable of representing both direct insurer and authorised comparison/intermediary routes without changing customer facts.
4. Any MIQOS service-fee calculation and collection architecture must remain separate from insurer premium, quote normalisation, eligibility and recommendation ranking.
5. Commercial remuneration must remain unavailable to scenario generation, comparison eligibility and recommendation ranking.
6. Data-governance implementation must support controller/processor allocation by processing activity/data flow rather than encode a blanket role.
7. Live-provider and real-customer-data activation must fail closed until their independent activation controls are satisfied.
8. No user-facing or technical artifact may claim that the frozen non-advised/handoff architecture itself resolves the FCA perimeter question.

## 5. Remaining governance packet — reclassified

The previous governance stop is closed for engineering architecture purposes. The remaining items are now classified as **production activation evidence**:

1. FCA perimeter and permissions determination for the implemented model;
2. authorised structure, if required;
3. provider/intermediary contracting and live-route approval;
4. controller/processor allocation and lawful basis by actual data flow;
5. retention/deletion and DPIA evidence where applicable;
6. complaints/support/redress operating model;
7. final customer terms/disclosures and separate MIQOS service-fee terms.

These items may block S5 gates whose acceptance criteria expressly require production/legal evidence, but they do not prevent execution of engineering controls designed to accommodate them and fail closed pending activation.

## 6. Execution authority

Engineering may proceed through `MIQO-SP5-EXEC-001` in systematic batch mode. Execution SHALL stop only where an acceptance criterion genuinely requires unavailable external governance, legal, contractual, credential or production-activation evidence. Such a stop must be recorded as an explicit dependency rather than resolved by assumption.

**End of MIQO-SP5-PREP-001-GATE-REVIEW-001**