# MIQO-BV-INT-005 v1.0 — Controlled Internal Integration Design

**Date:** 2026-10-10
**Status:** APPROVED FOR DESIGN, SYNTHETIC STAGING CONTRACTS AND NON-ROUTABLE UAT ONLY.
**Starting source:** BV-GATE-004 certified candidate `3dd33efdedd3a334a65dd94b8bcfdfaef5b531ce`.
**Security baseline parent:** `main` `5488d29735983d1c2a7f09f283e7adb0a2fe138a`.
**Source branch:** `miqo/bv-gate-005-integration-design`.
**Release statement:** This is a design packet, NOT authority for a product merge, live partner access, publicly mounted interface or underwriting/distribution.

## 1. Intended product integration

```text
Customer declarations  →  verification/enrichment  →  locked factual risk profile
                                                      |
                                                      v
Customer-selected, factual-only optimisation controls / validated intent
                                                      |
                                                      v
Existing Sprint 4 scenario generation and integrity approval
                                                      |
                                                      v
Provider adapter boundary [synthetic mock only]  →  quote normalisation
                                                      |
                                                      v
Quote eligibility/comparability adapter with evidence completeness gate
                                                      |
                                                      v
BV-GATE-004 candidate: preference filters → total payable → Pareto alternatives
                                                      |
                                                      v
Standalone explanation/audit preview [internal synthetic only]
                                                      X
                Existing Fastify routes / customer UI / SEOPA LIVE (NOT CONNECTED)
```

**Segregation constraint:** All declared factual fields are immutable once the profile version is locked. Change only genuine customer-controllable optimisation choices. The `BALANCED_COST_AND_EXPOSURE` catalogue objective remains `executable:false`; existing Sprint 4 DB constraint and API routes remain untouched.

## 2. Proposed contracts (not activated)

The existing `MIQO-BV-001-v1.0` JSON Schema is a *synthetic internal* selection contract. It is NOT a SEOPA provider quotation response format. A future approved mapping layer must provide:

- locked risk-profile version, hash, explicit customer confirmation revision and scope of authorised controllable scenarios;
- quote lineage (provider, route, normalisation version, underlying response hash and expiry), data-sharing/retention permissions;
- cover-type parity, exclusions, optional cover features, policy limits and endorsements, explicit missing fields;
- all-in annual cash premium, IPT/mandatory fees, optional paid extras, instalment totals, APR/deposit/repayment schedule, contingent compulsory/voluntary excess;
- telematics opt-in and genuine named-driver identity validated against locked facts.

Unknown finance, benefits or mandatory fees **fail closed**. No presumption of comparable coverage can be imported from the older TXN-001 synthetic fixtures.

## 3. Recommended contract boundaries for later approved integration

| Interface | Proposed type | Gate |
|---|---|---|
| `RiskProfileSnapshot` | Immutable version + hash + verified facts | Existing locking/integrity + new adapter UAT |
| `CustomerBalancedIntent` | Explicit payment, budget, excess, cover, telematics/driver choices | Versioned and customer confirmed |
| `NormalisedInsurerOffer` | Quote ID, provider lineage, cover/finance completeness and expiry | Provider contract / mapping approval |
| `BalancedDecision` | Eligible/excluded, cheapest benchmark, selected candidate, Pareto frontier, deterministic hash | BV4 isolated reference parity |
| `BalancedCustomerExplanation` | Plain-language total payable, conditional excess trade-off, relevant exclusions | Compliance and customer testing |
| `DecisionAuditReceipt` | Deterministic lineage, rule version, trace, customer intent hash and evidence retention | Security/privacy/retention review |

The UI must not mask excluded prices; when an otherwise valid lower-price offer exceeds a customer excess cap, distinguish it as the **cheapest eligible quotation before preferences**, with clear reasons why it was not selected. Avoid the legally loaded word “recommended” until the FCA distribution perimeter has been assessed.

## 4. Bounded synthetic staging work plan

### BV5-01 — Adapter and evidence readiness
Design an immutable internal adapter from existing Sprint 4 quote evidence and synthetic fixture records to the strict BV4 schema; never map missing insurer fields to invented values. Reject missing cover/financial disclosures. Confirm catalogue/current risk-hash lineage.

### BV5-02 — Customer preference capture
Design a pre-quote confirmation step with consent/version acknowledgement, mandatory comprehensive cover requirements, optional *explicit* maximum excess, accepted payment modes and telematics. Maximum excess never defaults to £600.

### BV5-03 — Consumer explanation preview
Design isolated mock-data view showing selected, absolute cheapest, differences in annual cash and total payable, excess (contingent), provider conditions, and a meaningful “no match” state.

### BV5-04 — Governance and operational interface
Design audit receipt, human override/review handoff, tamper detection, quote expiry and backout. Any local persistence must remain synthetic-only, with authorised write scope.

### BV5-05 — Integrated synthetic UAT
Test quote permutations, staleness, cover restrictions, missing/unknown fees/APR, scenario contradiction, named-driver/main-driver integrity, information completeness, commercial neutrality, non-domination, schema compatibility and no public routability.

## 5. Gateway dependencies to track in parallel

**MIQOS-REG-001:** Determine authorised operating entity, FCA distribution perimeter and permissions, Consumer Duty/marketing rules, vulnerable-customer fairness, governance owner and current UK GDPR/Data (Use and Access) Act 2025 analysis; obtain specialist sign-off before activation.

**SEOPA-INT-001:** Obtain headless/API availability decision from SEOPA/Quotezone, sandbox credentials under controlled test environment, response schemas, authentication, session attribution, comparison and display rights, retention and regulated-role allocation. No connection currently established.

**MIQOS-UAT-005:** Define integration acceptance artefacts and reproducible evidence. Run only mock/synthetic UAT until authenticated provider sandbox scope is negotiated and authorised.

**MIQOS-REL-001:** Establish support, incident handling, deployment/environment isolation, monitoring, rollback, failure-to-safe-stop, disaster recovery, finance/privacy/complaints owners and formal go/no-go.

**SEC-FOLLOWUP-003:** Independently review four residual moderate advisories in GitHub Issue #38. Do not broaden BV5 changes into forced dependency upgrades.

## 6. Decision gates and evidence

An engineering **DESIGN_PASS** requires a complete interface data dictionary, rejection codes, synthetic negative tests, customer explanation preview, authorised source-file diff and full applicable CI GREEN on one immutable branch HEAD. A synthetic design PASS does not grant product integration, merge or deployment permission.

A **PRODUCTION_GO** needs documented and signed-off legal/partner/perimeter decisions, live quote data rights, suitable operational controls, independent security and UAT receipts and separate written authorisation. Until then all SEOPA/insurer connectivity, customer-facing routes, binding, payment and production changes are blocked.

## 7. Prior decisions explicitly preserved

- BV3: synthetic selection logic, 52 tests PASS.
- BV4: separately packaged synthetic candidate, 18 tests PASS, four-check full CI PASS, certified `3dd33efdedd3a334a65dd94b8bcfdfaef5b531ce`.
- `main`: protected from BV5 changes; not merged.
- SEOPA: no real quotes, certification, API access or live integration represented as established.
