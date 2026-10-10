# MIQO-SP4-BALANCED-001 — Engineering Decision Record

**Date:** 2026-10-10
**Baseline:** `main` at `245edbe261d3a1b66d07bd4edf618db98945a566`
**Decision:** **CONDITIONAL DESIGN APPROVAL; EXECUTION AND RELEASE NOT AUTHORISED**
**SEOPA relationship:** none. Synthetic adapter test `TXN-001` provides examples only and is not an insurance provider integration.

## Question

Should the synthetic `BALANCED_VALUE` decision (£612, £550 total excess versus £571, £850 excess) become an executable MIQOS Sprint 4 customer objective?

## Evidence

- `packages/optimisation/src/index.ts`: `BALANCED_COST_AND_EXPOSURE` is catalogued as `executable:false`, with `UNAPPROVED_MULTI_DIMENSION_METHOD`; activation requires approved weighting, fairness and explanation.
- `packages/comparison/src/index.ts`: the Sprint 4 recommender deliberately throws `CUSTOMER_OBJECTIVE_DORMANT:BALANCED_COST_AND_EXPOSURE`.
- `packages/db/migrations/0008_optimisation_policy_persistence.sql`: the customer objective eligibility constraint omits the dormant objective.
- `TXN-001`: a **separate UAT-only** rule filters by a sample customer's voluntary £600 maximum total excess and sorts remaining *directly comparable* quotes by annual cash premium. The fictional result is S7/ALPHA £612 at £550 total excess; S6/ALPHA £571 at £850 total excess remains the cheapest option. This is NOT actuarially verified and product coverage is partial.

## Decision

**YES:** Treat Balanced Cost and Excess Exposure as a candidate *customer-configured multi-criterion selection workflow* within the Sprint 4 roadmap, with a new versioned specification and full UAT.

**NO:** Do not activate the dormant objective, alter the existing objective catalogue or SQL constraint, or merge a scoring algorithm into certified MIQOS at this time.

A £600 maximum excess must be an explicit customer objective for the particular customer, not a universal MIQOS suitability threshold. The system must not claim that a £300 reduction in contingent excess is equivalent to a £300 certain cash benefit, or treat premiums plus excess as expected annual cost.

## Proposed policy (subject to approval)

1. Validate the original LockedRiskProfile and identify legitimate O-only scenarios (including genuine named-driver facts).
2. **Eligibility first:** valid quote, quote not expired, insurer and policy terms proven, compliant customer facts, comparability, full mandatory fees and taxes, payment cash basis known, and acceptable vehicle use.
3. **Customer criteria:** capture an optional explicit maximum payable excess, a cover requirement, telematics acceptance, payment preference, customer-approved constraints and any essential product features.
4. **Constrained selection:** filter to comparable eligible quotes satisfying customer constraints; sort by annual *cash* total and deterministic tie-breaks. Do not create hidden provider ranking/commission weights.
5. **Trade-off disclosure:** show absolute cheapest, the constrained selected option, full total excess, premium difference, restrictions, required telematics, named-driver participation, financing costs and provider/product validity. Include Pareto/non-dominated alternatives where useful.
6. **No suitable option:** state that no quote meets the preferences and offer user-controlled constraint relaxation; never silently replace a strict maximum.
7. **Consumer explanation:** label the method, exclusions, customer inputs, confidence/completeness and all material quote differences. No automated unsupported assertion that a quote is objectively "best", or that expected savings are guaranteed.
8. **Commercial independence:** no undisclosed ranking influence or unavailable quote insertion; obtain external partner permission to retain, process and re-rank offers before live use.

## Required engineering gates

| Gate | Completion criterion |
|---|---|
| BV-01 Policy contract | New versioned objective definition and explicit consented criteria; documented default and tie-break policy |
| BV-02 Comparability | Product cover, insurer restrictions, payment total, finance breakdown, fees, excess and validity consistently normalised |
| BV-03 Model proofs | Deterministic replay, permutations, dominated-product exclusion, threshold edge cases, no quote, expiry, tie-breaks, missing information, cash vs financed payment |
| BV-04 Governance | Explainability, accessibility, bias/fairness review, commercial-independence assessment, audit provenance |
| BV-05 Regulatory | FCA perimeter and customer communication reviewed for the intended partnership/customer-facing use |
| BV-06 Technical activation | Isolated new code branch, explicit approved migrations/version change, all applicable security and regression CI GREEN on a single immutable HEAD |
| BV-07 Release authority | Separate explicit written authorisation for integration/merge; SEOPA connectivity still independently gated |

## Falsifiable rejection cases

- S6 is presented as having £550 total excess when it has £850 — reject.
- S7 is presented as necessarily superior without validating actual policy benefits — reject.
- The customer never specified £600 as a preferred maximum — reject hard-coded £600 filtering.
- Monthly instalment total is misrepresented as annual cash premium — reject.
- Policy's telematics condition is undisclosed — reject.
- Named driver is absent from locked factual profile or never actually drives — reject.
- A quote contains partial/unknown mandatory cover terms and is shown as fully comparable — reject.
- Chosen result derives from synthetic insurer aliases yet appears as a live quote — reject.
- Any proposal unblocks provider submission, binding, or payment collection — reject.

## Authorisation state

- Security remediation branch: `miqo/security-gate-002` (independent)
- Balanced assessment branch: `miqo/sp4-balanced-value-assessment` (this record)
- SEOPA synthetic adapter: `miqo/seopa-txn-001-synthetic-uat` (independent)
- Approved core executable Balanced Value objective: **NO**
- Existing four runnable Sprint 4 objectives: unchanged
- Live SEOPA/provider operations: **PROHIBITED**
