# MIQO-SP4-REG-001 — Regulatory & Data-Provenance Control Map v1.0

**Document ID:** MIQO-SP4-REG-001  
**Version:** 1.0  
**Status:** Pre-Sprint-4 Control Baseline  
**Parent:** MIQO-SP4-PREP-001 v1.0  
**Purpose:** Close P4-G11 without expanding Sprint 4 into live insurance distribution.

---

## 1. Scope

This control map translates the regulatory/data-provenance concerns identified for Sprint 4 into explicit architecture controls.

It does **not** authorise:
- live insurer connectivity;
- real customer data;
- policy purchase or binding;
- live insurance distribution;
- production marketing activity;
- production automated decision-making.

Sprint 4 remains **synthetic-data, non-production and non-live-provider**.

The governing MIQO invariants remain:

```text
Change choices — not facts.

Optimiser READ:
F / V / D / I / O

Optimiser WRITE:
O only
```

---

## 2. Regulatory and provenance control matrix

| Control area | Regulatory / policy concern | Sprint 4 architecture control | Required evidence |
|---|---|---|---|
| Motor-insurance legal boundary | Road Traffic Act 1988 Part VI establishes the compulsory motor-insurance framework. Sprint 4 must not imply that a synthetic quote, recommendation or selection is a bound policy or evidence of cover. | Keep all provider activity synthetic; no purchase/bind/pay action; completion remains prototype completion only. | Environment guard; UI notices; no live-provider credentials; no policy-binding endpoint. |
| Truthful consumer representations | Consumer Insurance (Disclosure and Representations) Act 2012 requires a consumer to take reasonable care not to make a misrepresentation, including when asked to confirm or amend particulars. | F-class facts remain immutable once locked; factual corrections create a new RiskProfileVersion; optimiser cannot vary facts for price. | Database immutability; correction/version audit; O-only scenario constraint. |
| Demands, needs and customer interests | If MIQO later operates as an insurance distributor, FCA ICOBS demands-and-needs and customer-best-interests requirements may apply, together with Consumer Duty where applicable. | Sprint 4 objectives are transparent decision lenses, not hidden assumptions. Recommendation logic must retain customer-objective provenance and must not conceal material restrictions. | Objective version; eligible/excluded quote set; explanation; customer-selection trace. |
| Lawfulness, fairness and transparency | UK GDPR Article 5 principles require lawful, fair and transparent processing. | Every material data element must retain classification, source, purpose and provenance. Recommendation explanations must expose material inputs and rule versions. | F/V/D/I/O metadata; explanation record; audit trace. |
| Purpose limitation | Personal information must be collected and reused for specified, explicit purposes, subject to compatibility/lawful-basis rules. | Keep quotation/optimisation, security/integrity, analytics and future marketing purposes logically separable. No Sprint 4 feature may silently reuse data for an unrelated purpose. | Purpose metadata; separation of service and analytics controls; no marketing dependency. |
| Data minimisation | UK GDPR requires data to be adequate, relevant and limited to what is necessary. | Sprint 4 may only add fields needed for approved objectives, scenarios, market routes, explanations and provenance. | Schema review; field purpose; no speculative customer attributes. |
| Accuracy and provenance | UK GDPR accuracy obligations require reasonable steps on accuracy and clear source/status handling. | V and D data retain source, observation time, rule/version and discrepancy state. External data may not silently overwrite F. | source_id; observed_at; derivation_version; discrepancy state; correction workflow. |
| Security and accountability | UK GDPR requires integrity/confidentiality and accountability. | Preserve existing least-privilege, environment separation, immutable evidence and append-only audit architecture. | CI guards; audit immutability; no secrets in repo; synthetic-only startup checks. |
| PECR / tracking boundary | PECR applies to electronic marketing and storage/access technologies such as cookies, tracking pixels, web storage and fingerprinting. | Sprint 4 recommendation functionality must not depend on marketing/tracking technologies. Essential prototype telemetry and future consent-dependent analytics must remain separable. | No tracking dependency in optimiser; explicit future consent boundary; no marketing messages in Sprint 4. |
| Automated-decision transparency / challenge | ICO guidance on solely automated decisions emphasises information, bias/error safeguards and rights to challenge/review where the rules apply. | RecommendationSet is decision support, not an unchallengeable automated policy decision. Persist objective, rule version, inputs, result and explanation; customer makes selection. | Recommendation provenance; explanation; customer selection; admin trace. |
| Equality / discriminatory-proxy risk | Equality law and fair-treatment obligations create risk where protected characteristics or proxies are introduced into optimisation/ranking. Insurance-specific exceptions are legally nuanced and must not be inferred by the optimiser. | Protected characteristics are not optimisation targets; no recommendation rule may introduce a prohibited proxy; fairness review is a compliance control, not a pricing objective. | Rule catalogue review; prohibited-input tests; fairness review record where applicable. |
| Integrity-signal semantics | An inconsistency or anomaly is evidence requiring control/review, not a fraud finding. | I-class remains non-factual and cannot automatically accuse a customer of fraud. | Signal stage, rule, evidence, blocking flag and review state; no fraud label from I alone. |
| External-data quality / latency | Verification/enrichment sources can be stale, unavailable or inconsistent with customer declarations. | Record provider/source, timestamp, freshness, confidence/status and discrepancy. External-source failure must not corrupt F. | Provenance record; timeout/error handling; discrepancy workflow; retained declaration. |
| Commercial influence | Provider remuneration or introducer economics could create ranking conflicts. | Commercial remuneration is unavailable to scenario generation, comparison eligibility and recommendation ranking. | Executable invariance test; separate commercial ledger boundary. |
| Comparison methodology | Premium is certain/expected expenditure; excess is contingent exposure. | No universal premium-plus-excess score. ADJUSTED_COMPARABLE remains dormant in Sprint 4. | S4-G10; comparison state constraints; separate display dimensions. |

---

## 3. Current authoritative sources used for this map

The following sources are the control references for this **architecture map**, not a substitute for production legal advice:

1. **Road Traffic Act 1988, Part VI** — compulsory motor-insurance framework.  
   https://www.legislation.gov.uk/ukpga/1988/52

2. **Consumer Insurance (Disclosure and Representations) Act 2012**, especially sections 2–4 — reasonable care not to make a misrepresentation and remedies for qualifying misrepresentation.  
   https://www.legislation.gov.uk/ukpga/2012/6

3. **ICO — Guide to the data protection principles** — lawfulness/fairness/transparency, purpose limitation, data minimisation, accuracy, storage limitation, security and accountability.  
   https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/

4. **ICO — Rights related to automated decision making including profiling** — information, bias/error safeguards and challenge/review expectations where applicable.  
   https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/rights-related-to-automated-decision-making-including-profiling/

5. **ICO — PECR / storage and access technologies guidance** — cookies, tracking pixels, web storage, fingerprinting and related technologies.  
   https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/

6. **FCA Handbook ICOBS 5.2 — Demands and needs** — relevant if/when MIQO is carrying on insurance distribution activity.  
   https://handbook.fca.org.uk/handbook/icobs5/icobs5s2

7. **FCA Consumer Duty / ICOBS 4.1 / PRIN 2A** — customer understanding/support/best-interests controls where applicable to the future operating model.  
   https://www.fca.org.uk/firms/consumer-duty/about

8. **Equality Act 2010** — services and insurance provisions; any production use of protected characteristics or potential proxies requires specific legal/compliance review.  
   https://www.legislation.gov.uk/ukpga/2010/15

---

## 4. Mandatory Sprint 4 regulatory design rules

Sprint 4 SHALL:

1. remain synthetic-only and non-live-provider;
2. preserve exact F/V/D/I/O classifications;
3. preserve source and time provenance for V and D inputs;
4. keep I-class signals distinct from fraud findings;
5. persist objective/recommendation explanations;
6. preserve customer selection as a human decision;
7. preserve the correction/versioning model for factual changes;
8. keep marketing/tracking technologies outside optimisation logic;
9. keep commercial remuneration outside ranking;
10. keep premium, finance cost and excess separate;
11. keep ADJUSTED_COMPARABLE dormant;
12. preserve end-to-end auditability.

---

## 5. Production-readiness reservation

This map closes the **Sprint 4 provisioning requirement** only.

Before real customers, live quotations, policy distribution, binding or production automated processing are introduced, MIQO requires a separate production legal/regulatory review covering the actual operating model, FCA perimeter/permissions, data-controller/processor roles, lawful bases, DPIA requirements, data-sharing agreements, customer disclosures, complaints/support arrangements and provider contracts.

---

## 6. P4-G11 determination

**P4-G11 — Regulatory/data-provenance controls mapped: PASS**

Reason:

- regulatory concern areas are explicitly mapped;
- each concern has an architectural treatment;
- evidence expectations are defined;
- the Sprint 4 synthetic/non-production boundary is preserved;
- data provenance remains linked to existing MIQO lineage and audit controls.

**End of MIQO-SP4-REG-001 v1.0**
