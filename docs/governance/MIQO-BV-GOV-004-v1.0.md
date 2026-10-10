# MIQO-BV-GOV-004 v1.0 — Pre-release compliance and governance assessment

**Date:** 2026-10-10
**Status:** Engineering identification of requirements, **not a legal sign-off or authorisation**
**Applies to:** MIQOS Balanced Value customer-constrained insurance comparison candidate.
**Operational state:** synthetic, dormant and without API/route, production insurer access, offer distribution, payments, binding or customer records.

## A. Product description and risk of regulated distribution

The proposed MIQOS function sorts *genuinely comparable* comprehensive policy options against preferences actively chosen by a person (maximum excess, acceptable payment mode, coverage and telematics). It does not make an actuarial probability assessment and does not compute "premium + excess" as an expected monetary cost.

**Regulatory boundary remains unresolved.** The intended UK operating entity's role (information-only analytics, insurance introducing/arranging, distribution, or potentially advice), partner contract, remuneration, consumer-facing journey, endorsement wording, insurer quote provenance and purchase handoff must be reviewed by a qualified UK insurance regulatory professional before *any* public or partner use. The FCA PERG 5.6 guidance includes potential arranging activities from introductions and assistance, and FCA PCW guidance warns that endorsement of specific contracts could affect the advice/arranging analysis.

Official sources:
- FCA PERG 5 insurance distribution, current Handbook: https://handbook.fca.org.uk/handbook/perg5
- FCA PERG 5.6 arranging/introductions: https://handbook.fca.org.uk/handbook/perg5/perg5s6
- FCA PCW general insurance guidance FG11/17: https://www.fca.org.uk/publication/finalised-guidance/fg11_17.pdf
- FCA insurance PCW historical review (not current prescriptive guidance): https://www.fca.org.uk/publications/thematic-reviews/tr14-11-price-comparison-websites-general-insurance-sector

## B. Consumer Duty, price and value, product governance

Before customer-facing distribution, assess applicable FCA rules and which authorised entity is manufacturer, distributor, introducer or technology provider. Review target market suitability, access, value, cover restrictions, conflicts and commission incentives, communication accessibility, vulnerable customers, how claims excess is explained and why a selection meets explicit preferences. **The selector must never imply that a £300 contingent reduction in total excess is a guaranteed £300 saving.**

The FCA updated its Price and Value Good/Poor Practice resource on 10 July 2026: https://www.fca.org.uk/publications/good-and-poor-practice/price-value-outcome-good-poor-practice-update

## C. Data protection and automated decision-making

As of 19 June 2026, all data-protection provisions in the **Data (Use and Access) Act 2025** are in force according to the ICO. The Act expanded circumstances in which significant solely automated decisions may be made, subject to appropriate safeguards; older UK GDPR Article 22 explanations that imply the former three bases are exhaustive should not be cited without checking the current amended law and implementing guidance.

The ICO has stated that its revised detailed automated decision-making/profiling guidance remains in development in October 2026, with final guidance expected Winter 2026. Thus **the legal ADM/perimeter conclusion remains a launch blocker**, not a certified analysis.

Required before processing actual UK customer profiles: determine controller/processor roles and lawful basis; data protection impact screening and DPIA where indicated; data minimisation, fairness/bias monitoring, data accuracy and correction, clear notices and retention controls, cyber security, challenge and human-review procedures for qualifying significant automated decisions; contract measures for insurer/partner data rights.

Official current references:
- https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-what-does-it-mean-for-organisations/
- https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-duaa-summary-of-the-changes/data-protection/
- https://ico.org.uk/about-the-ico/what-we-do/our-plans-for-new-and-updated-guidance/technology/
- https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2026/03/ico-consultation-on-the-draft-guidance-about-automated-decision-making-including-profiling/

## D. Contract rights and synthetic boundary

There is **no** confirmed SEOPA API, contract, certification, response-retention permission, display rights or regulated activity assignment. No partner-specific quoted amount, insurer coverage parity or current availability has been tested. The BV4 package has no Fastify/Next route and is explicitly disabled for live use; synthetic UAT authority is a software guard **not a security credential**.

## E. Release blocker register

| ID | Blocker | Required evidence |
|---|---|---|
| BV4-L01 | FCA permission/perimeter unresolved | Documented specialist opinion, operating entity and permissible role |
| BV4-L02 | Consumer Duty and distribution obligations unresolved | Distributor/manufacturer role, target market, value and accessibility review |
| BV4-L03 | UK GDPR / DUAA controller, ADM and DPIA unresolved | Current statutory check, DPIA screening and documented rights processes |
| BV4-L04 | SEOPA / external provider data and display rights unavailable | Executed partner terms, API specification, sandbox certification |
| BV4-L05 | Real quote cover and payment parity unavailable | Signed provider mapping/version, real terms, mandatory fees and APR validation |
| BV4-L06 | Consumer copy and unbiased ranking not legally reviewed | User comprehension/fairness testing, conflicts and commercial independence approval |
| BV4-L07 | Package contract bundling/runtime and independent build certification | Build/signature assurance, dependency SBOM and compatibility tests |
| BV4-L08 | Objective dormant under catalogue + PostgreSQL constraint | New approved versioned objective migration, rollout design and independent CI |
| BV4-L09 | No user-authorised product integration/merge or production release | Distinct change approval and post-merge revalidation |

**Decision:** candidate engine and explanations may be tested only on fictional data in a branch. Production and SEOPA release remain **NO-GO**. There is no legal opinion that the design falls outside the insurance distribution perimeter.
