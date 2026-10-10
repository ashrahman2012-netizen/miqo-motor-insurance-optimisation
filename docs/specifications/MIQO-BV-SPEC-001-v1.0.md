# MIQO-BV-SPEC-001 v1.0 — Balanced Value Customer-Constraint Selection
**Gateway:** BV-GATE-003 · **Date:** 2026-10-10 · **Classification:** SYNTHETIC, NON-PRODUCTION
**Starting baseline:** security-certified main `5488d29735983d1c2a7f09f283e7adb0a2fe138a`
**Authority:** prepare a *proposed* specification, isolated reference implementation, JSON contract and synthetic UAT. No product activation or merge.
**Companion:** GitHub Issue #37 · `contracts/balanced-value/contract.schema.json` · `scripts/bv-gate-003/`.

## 1. Decision and scope

The candidate product objective is `BALANCED_COST_AND_EXPOSURE`, **which remains intentionally dormant** in `packages/optimisation/src/index.ts`, `packages/comparison/src/index.ts` and PostgreSQL `0008_optimisation_policy_persistence.sql`. This specification must not implicitly change that status.

Proposed decision rule is **customer-configured, constrained price comparison** rather than weighted premium-plus-excess arithmetic. It uses *eligible, genuinely comparable* quotations only; applies mandatory constraints explicitly chosen by the customer; selects lowest total payable among those remaining; displays absolute cheapest and objective trade-offs. No hidden risk scoring, predicted claim probability, insurer commission weight, or actuarial expected-cost inference.

The reference implementation is an isolated experiment. Neither its input nor output is a partner API contract. It does not access quote marketplaces, third-party endpoints or real consumers.

## 2. Immutable input and O-class boundary

1. `locked_profile` is versioned, `status=LOCKED_SYNTHETIC`, and carries `facts_sha256` over all factual declarations. A quote must reference the exact fingerprint and profile version.
2. `scenario` carries only approved optimisation controls: `policy_start_date`, `voluntary_excess`, `payment_structure`, `telematics_preference`, `genuine_named_driver_inclusion` and permitted market route / actual pre-purchase vehicle choice when separately authorised. Main-driver identity, occupation, postcode, mileage, parking, previous claims, convictions, ownership, vehicle modifications and *named-driver factual records* are never mutable as O-class fields.
3. A genuine named driver can only be selected from a validated factual record in the locked profile and cannot replace or masquerade as the main driver.
4. Inception change must preserve required coverage commencement and actual customer needs.
5. The evaluator rejects mismatched or tampered profile fingerprints; only synthetic test fixtures may be used here.

## 3. Versioned input contract

`selection_request` (`contract.schema.json`, `selectionRequest`) includes:

- `contract_version="MIQO-BV-001-v1.0"`, `environment="SYNTHETIC_ONLY"`, `test_clock` ISO 8601 with timezone, and fixed customer intent revision;
- `locked_profile` with `profile_id`, `version`, immutable `facts_sha256`, `status`, `main_driver_id`, genuine named-driver IDs;
- `preferences` with explicit, non-default `customer_confirmed=true`, `intent_revision` and optional `max_total_excess_pence` (a **hard constraint only if provided by customer**); cover must be comprehensive; `allowed_payment_modes` (cash annual and/or monthly, explicitly allowed), `telematics_accepted`, , `required_benefits` list of must-have coverage entitlements, and explicit `coverage_baseline` with all material cover features for conservative like-for-like parity; max total payable optional and hard if given;
- `quotes[]` with stable ID, independent route, scenario and provenance fields, lineage hash/version, quote timestamps and expiration, comprehensive coverage, exact required cover-feature booleans, compulsory and voluntary excess in integer pence, total payable including IPT and mandatory fees, payment breakdown and finance disclosures, actual named-driver IDs, telematics requirement, immutable underlying fact hash and partner data rights state.
- `cover_features_verified`, `restrictions_verified`, `mandatory_fees_ipt_included`, `quotation_permission` and `provenance_verified` flags; fixture flags never establish actual insurer validation or real partner consent.

All money is integer GBP pence. No conversion from APR to actual instalments and no guessed mandatory charges. Null is not zero.

## 4. Eligibility — hard fail, never silently corrected

First validate contract and profile hash. Then each quote is *excluded* if any of the following applies:

| Code | Rejection |
|---|---|
| E-01 | Missing/invalid profile, scenario, provider lineage or foreign profile version/fingerprint |
| E-02 | Expired quote, ambiguous date, missing verified provenance or quotation rights |
| E-03 | Not comprehensive, missing/unknown benefits or restrictions, material coverage difference |
| E-04 | Missing IPT/mandatory fees, non-integer or incomplete premium and excess components |
| E-05 | Monthly total/cash/finance/instalment breakdown incomplete or contradictory |
| E-06 | Telematics required but customer has not explicitly accepted it |
| E-07 | Named-driver IDs unavailable, not genuine or not locked, or main driver improperly added |
| E-08 | Quote selected outside declared permitted payment modes or customer-required benefits |
| E-09 | Quote mismatched to the declared scenario (voluntary excess, payment mode, telematics, named-driver set) |
| E-10 | Quote violates customer maximum total excess or maximum annual total payable |

The reference categorises failures into `INVALID_QUOTE` (E-01…E-09), `OUTSIDE_PREFERENCES` (E-10), and `ACCEPTED`. **Insufficient evidence results in exclusion**. Live partner display/retention authorisation is independently gated, including GDPR/controller and FCA distribution responsibilities.

## 5. Decision method BV-RULE-001-v1.0

A. Compute `market_eligible` from unaltered risk and quote evidence; do not apply customer affordability or excess preference yet.

B. The **absolute cheapest eligible** benchmark is the minimum all-in `total_payable_pence`; if mixed annual/monthly payment is allowed, only compare when monthly finance and cash breakdown is explicitly complete, and show financing separately. For the reference, all quote terms must be validated and comprehensive.

C. Apply **explicit** customer constraints. `max_total_excess_pence` is enforced only when supplied. If not present, the code MUST NOT insert a default £600 or any other threshold. Apply customer `max_total_payable_pence` only if supplied.

D. Sort feasible quotations by total payable ascending, then total excess ascending, then stable quote ID ascending. All ties deterministic, independent of provider-order, commission or referral fees. Show the cheapest eligible quote even if it violates the user's chosen preference (do not imply it is selected).

E. Return one of: `PROVISIONAL_SYNTHETIC_SELECTION`, `NO_QUOTES_MEET_PREFERENCES`, or `NO_ELIGIBLE_QUOTES`. Never auto-relax a hard constraint.

F. Compute a **two-dimensional Pareto frontier** over independently eligible quotes (total payable, total excess); a quote is dominated if another is no worse in either dimension and strictly better in at least one. For equal costs/excess, keep both quote IDs (tie transparency). The frontier is an informational alternative set only: it does not override customer hard constraints.

G. Explain: customer limits used, why quotes were excluded, total payable vs excess separately, cheapest-eligible comparator, increased premium for reducing contingent excess, telematics/named driver obligations, finance effects, benefits matched and what remains unknown. Output must be labelled `DEMO_ONLY_NOT_INSURANCE_ADVICE`.

H. Quote validity is evaluated at an injected clock for deterministic testing, never at an implicit runtime date. Raw/provider response hashes and model/rule versions form a tamper-evident evidence chain. This is not proof of real provider authorisation.

## 6. Illustrative (non-insurer) trade-off

Synthetic fixture: annual S0 £812 / £600 excess; S6 £571 / £850 total excess; S7 £612 / £550 total excess. Customer explicitly declares a £600 maximum total excess. Among fully supported mock-eligible quotations S7 is lowest total payable within that excess constraint. It costs **£41 more annually** than S6 for **£300 lower contingent total excess**; that difference is **not an expected saving**. Relative to S0, S7 saves £200, or 24.63%, *in this fixture only*.

The historical TXN-001 envelope had incomplete real coverage benefits; **it is not admissible as a live or verified-equivalence benchmark**. The BV-GATE-003 reference constructs wholly separate complete synthetic mock benefit data explicitly for contract logic testing. Neither dataset can prove insurer equivalence or price outcomes.

## 7. Audit/evidence model and result contract

Return `rule_version`, `input_fingerprint`, `selected_quote_id`, `absolute_cheapest_eligible_quote_id`, all customer constraints, `eligible`, `excluded`, `pareto_frontier_quote_ids`, `explanations`, and a deterministic `result_fingerprint`. All rejected quotes have explicit reason codes. Keep raw declaration and quote provenance out of UI logs beyond minimum trace identifiers. No customer names, addresses, DOBs or licence numbers appear in output.

## 8. Objective fairness, compliance and commercial independence

- Never favour or suppress a provider by commission, affiliate arrangements or route identity. Route/ID tie-break only.
- Avoid presenting synthetic quotes as real insurer offers, creating invented benefit equivalence or claiming an unverified cheaper offer guarantees equivalent cover.
- If contractual permission, full disclosure, accessibility, complaints/recourse and regulatory perimeter assessment are not approved, publication and purchase handoff remain blocked.
- Require separate UK legal/compliance assessment under the applicable FCA regulatory perimeter and financial promotions/consumer duty expectations before customer-facing use. This technical record is not a legal determination.
- Preserve opt-in, data minimisation, deletion and purpose-limitation controls before using any live customer information.

## 9. Acceptance gateway

| ID | Required proof |
|---|---|
| BV-A01 | Deterministic execution and stable fingerprints across quote permutations |
| BV-A02 | Exact S6/S7 fictional arithmetic with £600 customer excess limit |
| BV-A03 | No implied default excess threshold |
| BV-A04 | Missing/expired/unsupported quote explicitly excluded |
| BV-A05 | Missing coverage, quote finance terms and mandatory charges fail closed |
| BV-A06 | Locked risk fingerprint/version and named-driver factual integrity enforced |
| BV-A07 | Customer rejects telematics or monthly option => excluded |
| BV-A08 | Coverage requirements and cover type respected |
| BV-A09 | Pareto and no-suitable-quote explanations deterministic |
| BV-A10 | Identical quote costs/excess and provider permutations yield stable tie handling |
| BV-A11 | Commercial referral weights ignored / prohibited in schema |
| BV-A12 | Existing executable objectives and database dormant guard unchanged |
| BV-A13 | Full repository regression/security CI four GREEN on same HEAD |
| BV-A14 | No connection to SEOPA, no policy binding, no payment collection |
| BV-A15 | External partner, FCA role, consumer duty, quotation use rights and coverage-parity gates remain blocked |

**Exit rule:** BV-GATE-003 may earn **SPEC_AND_SYNTHETIC_UAT_PASS** only after a dedicated test run and the applicable full CI are GREEN on one immutable HEAD. This is **NOT FEATURE_ACTIVATION_APPROVAL**; final review, product authorisation and promotion require a separate decision.
