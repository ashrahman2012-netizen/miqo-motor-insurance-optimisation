# UK Motor Insurance Quotation Optimisation System

## MIQO-SP4-PREP-001 — Customer-Focused Analysis & Optimisation Framework Provisioning v1.0

**Document ID:** MIQO-SP4-PREP-001  
**Version:** 1.0  
**Status:** Pre-Sprint-4 Controlling Provision  
**Date:** 18 September 2026  
**Parent architecture:** MIQO-SYS-001 v1.0  
**Inherited engineering baseline:** MIQO-ENG-001 v1.0  
**Programme dependency:** Sprint 3 certified baseline  
**Primary purpose:** Freeze the Sprint 4 optimisation policy, customer objective model, scenario taxonomy, comparison methodology boundary, explainability contract and execution gates before implementation.

---

# 0. Authority and purpose

This document is the controlling pre-execution provision for MIQO Sprint 4.

It does **not** replace MIQO-SYS-001 v1.0 and does not reopen the certified Sprint 1–3 architecture. Instead, it translates the customer-focused analysis and optimisation framework into explicit MIQO rules that can be implemented without weakening the already-certified invariants.

Sprint 4 MUST NOT begin by treating every research recommendation as an approved MIQO product or domain rule. Research propositions become implementation rules only after they are classified, bounded and approved through this provisioning layer.

The controlling objective is:

> **Extend MIQO's optimisation breadth and customer intelligence while preserving factual immutability, provenance, comparison integrity and explainability.**

---

# 1. Inherited non-negotiable invariant

The following architecture remains controlling:

```text
Truthful Customer Facts
        ↓
Verified / Enriched Data
        ↓
Derived Variables
        ↓
Integrity / Consistency Signals
        ↓
LOCKED RiskProfileVersion
        ↓
Customer-controllable choices
        ↓
Scenario / market-route exploration
        ↓
Quotation
        ↓
Normalisation
        ↓
Comparison / analysis
        ↓
Final Integrity
```

The optimiser contract remains:

```text
Optimiser READ:
F / V / D / I / O

Optimiser WRITE:
O only
```

The governing operational rule remains:

> **Change choices — not facts.**

No Sprint 4 feature may weaken, bypass or reinterpret that invariant.

---

# 2. Sprint 4 provisioning decisions

| Provision | Required Sprint 4 rule |
|---|---|
| Canonical facts | F-class remains immutable once the RiskProfileVersion is locked |
| Verified/enriched data | V-class records source, provenance, observation time and discrepancy/confidence state |
| Derived data | D-class must be reproducible from F/V/O plus a versioned derivation rule |
| Integrity signals | I-class is evidence and risk-control information, never an automatic fraud conclusion |
| Customer choices | O-class must represent genuinely selectable customer variables only |
| Provider/channel | Optimised through quote-orchestration metadata, not treated as a customer fact |
| Recommendations | Must derive from persisted and explainable comparison evidence |
| Commercial remuneration | Must remain unavailable to scenario generation, normalisation, eligibility and recommendation ranking |

These decisions extend the customer analysis model without changing certified Sprint 1–3 semantics.

---

# 3. Optimisation Catalogue v2

Sprint 4 SHALL introduce a versioned **Optimisation Catalogue v2**.

Each candidate variable must have an explicit treatment before implementation.

| Variable | MIQO treatment |
|---|---|
| Policy start date | **O — approved** |
| Voluntary excess | **O — approved** |
| Annual / monthly payment | **O — approved** |
| Genuine named-driver inclusion | **O — approved**, existing factual driver only |
| Telematics preference | **O — approved** |
| Provider | Quote-orchestration dimension |
| Distribution channel | Quote-orchestration dimension |
| Vehicle | **O only in `PRE_PURCHASE` mode** |
| Occupation description | Provider-taxonomy mapping only; **not an O-class factual edit** |
| Annual mileage | **F — immutable** |
| Parking | **F — immutable** |
| Ownership | **F — immutable** |
| Claims | **F/V — immutable** |
| Convictions | **F/V — immutable** |
| Main driver | **F — immutable** |
| Vehicle modifications | **F — immutable** |

## 3.1 Catalogue metadata

Every optimisation control SHALL record:

- `optimisation_control_id`
- `catalogue_version`
- `canonical_field_or_dimension`
- `classification`
- `customer_selectable`
- `permitted_value_domain`
- `eligibility_rule_version`
- `dependencies`
- `constraints`
- `explanation_text_version`
- `provider_or_channel_applicability`
- `effective_from`
- `effective_to`
- `status`

No control becomes executable merely by appearing in research or product notes.

---

# 4. Occupation taxonomy mapping boundary

Occupation requires special handling.

A customer may truthfully satisfy more than one insurer taxonomy label, but the customer's real employment circumstances MUST NOT become an optimisation preference.

The model SHALL therefore be:

```text
CanonicalOccupationFact
        ↓
InsurerTaxonomyMapping(versioned)
        ↓
Provider-specific occupation code
```

The following is prohibited:

```text
occupation = optimisation preference
```

Provider-specific translation may vary only where each mapped description truthfully represents the locked factual occupation.

Required controls:

- canonical occupation fact remains locked;
- mapping version is persisted;
- provider code is traceable to the canonical fact;
- mapping rationale is inspectable;
- unsupported or ambiguous mappings are surfaced for review;
- no alternative may invent or materially distort the customer's employment circumstances.

---

# 5. Customer Objective Model v1

Sprint 4 SHALL make the customer's optimisation objective explicit.

The system MUST NOT assume that “cheapest” always means the same thing.

Initial objective catalogue:

```text
LOWEST_ANNUAL_PREMIUM
LOWEST_MONTHLY_COMMITMENT
LOWEST_FINANCE_COST
LOWER_EXCESS_EXPOSURE
BALANCED_COST_AND_EXPOSURE
```

These objectives are **views and decision lenses**, not silent ranking assumptions.

## 5.1 Objective record

Every objective analysis SHALL persist:

```text
objective_id
objective_version
eligible_quote_set
comparison_method
input_dimensions
result
explanation
created_at
```

A recommendation must be able to answer:

> **Why did MIQO surface this quote for this customer objective?**

## 5.2 Objective-specific ranking

Each objective SHALL define its own ordered comparison logic.

Examples:

- `LOWEST_ANNUAL_PREMIUM` may order directly comparable quotes by annual cash premium.
- `LOWEST_MONTHLY_COMMITMENT` may consider permitted monthly-payment structures and required initial payment while keeping total finance cost visible.
- `LOWEST_FINANCE_COST` may order eligible financed products by finance cost while separately displaying premium and payment schedule.
- `LOWER_EXCESS_EXPOSURE` may order eligible products by total excess exposure while preserving premium as a separate dimension.
- `BALANCED_COST_AND_EXPOSURE` MUST NOT be implemented until its methodology is expressly approved and versioned.

---

# 6. Economic comparison methodology boundary

Sprint 4 MUST preserve the currently certified control that premium and excess are different economic dimensions.

The following universal metric remains prohibited:

```text
premium + excess = "effective insurance cost"
```

Reason:

```text
premium
= certain / expected expenditure

excess
= contingent financial exposure if a claim occurs
```

Accordingly:

```text
ADJUSTED_COMPARABLE = DORMANT
```

unless a separately approved methodology explicitly activates it.

## 6.1 Permitted dimensions

Sprint 4 MAY display and analyse these separately:

```text
annual premium
finance cost
monthly commitment
initial payment / deposit
compulsory excess
voluntary excess
total excess exposure
essential add-on cost
coverage / restrictions
telematics requirement
```

## 6.2 Future risk-adjusted metrics

Any future composite or risk-adjusted metric requires:

- methodology document;
- formal approval;
- versioned assumptions;
- explainability requirements;
- fairness review;
- sensitivity testing;
- customer-facing disclosure;
- auditability;
- regression tests proving no hidden remuneration influence.

Until those conditions are met, no universal “best value” score may be presented as objective truth.

---

# 7. Provider and channel optimisation model

Provider and channel SHALL be treated separately from customer scenario facts.

The architecture remains:

```text
OptimisationScenario
    O-class policy choices

MarketRoute
    provider_key
    channel_key
    adapter_version
    mapping_version

QuoteRequest
    exact Scenario + exact MarketRoute
```

Provider identity and distribution channel MUST NOT be stored as `ScenarioDelta` values pretending to be customer facts.

## 7.1 MarketRoute contract

Every market route SHALL include:

- `market_route_id`
- `provider_key`
- `channel_key`
- `adapter_version`
- `mapping_version`
- `availability_status`
- `supported_controls`
- `supported_cover_modes`
- `request_policy_version`
- `synthetic_or_live_classification`

Sprint 4 remains synthetic unless a later programme separately authorises live integration.

---

# 8. Multi-scenario exploration policy

Sprint 4 SHALL move from one or a few manually formed scenarios to systematic multi-scenario exploration.

A scenario generator may combine approved O-class controls only when:

- each control is individually permitted;
- the combination is internally consistent;
- customer affordability or preference constraints are honoured;
- start-date choices do not create an uninsured gap where cover is required;
- named drivers are genuine and already represented as factual persons;
- telematics is not generated if the customer has rejected it;
- voluntary excess remains inside approved limits;
- no candidate vehicle is treated as current factual vehicle unless the mode permits it.

Every generated scenario SHALL record the reason it exists.

---

# 9. Pre-purchase vehicle optimisation

Vehicle optimisation is allowed only when:

```text
vehicle_mode = PRE_PURCHASE
```

The model SHALL distinguish:

```text
CURRENT_VEHICLE
    vehicle = F
    immutable

PRE_PURCHASE
    candidate vehicles = O / candidate objects
    no assertion that a candidate is the customer's current vehicle
```

Candidate vehicle data MUST NOT overwrite the customer's factual vehicle.

## 9.1 Candidate vehicle object

A candidate vehicle should carry:

- candidate vehicle ID;
- provenance/source;
- make/model/derivative;
- quotation-relevant characteristics;
- candidate status;
- quote scenarios generated;
- insurance outcomes;
- customer shortlist/decision state.

Transition into the factual profile occurs only after the customer actually commits to a vehicle and confirms the relevant factual representation.

---

# 10. Explainability contract

Explainability becomes a first-class Sprint 4 requirement.

MIQO SHALL classify customer-visible optimisation information as:

```text
FIXED
CONTROLLABLE
TIME_DEPENDENT
PROVIDER_SPECIFIC
```

## 10.1 `OptimisationExplanation`

The model SHALL contain at minimum:

```text
explanation_id
scenario_id
field_or_control
classification
source
customer_can_change
baseline_value
scenario_value
quoted_effect_if_observable
legitimacy_reason
provider_channel_applicability
rule_version
created_at
```

## 10.2 Customer presentation examples

```text
FIXED FACT
Annual mileage: 8,000
Cannot be changed for price optimisation.

CUSTOMER CHOICE
Voluntary excess: £250 / £500 / £750
Can affect premium and customer claim exposure.

TIME-DEPENDENT
Policy start date
May legitimately be varied within the customer's real cover requirement.

PROVIDER-SPECIFIC
Telematics availability
Depends on provider/product.
```

Explainability MUST be generated from persisted evidence, not reconstructed from UI text alone.

---

# 11. Recommendation boundary

The Sprint 4 customer recommendation architecture SHALL be:

```text
Locked Truthful Risk Profile
        ↓
Optimisation Catalogue
        ↓
Scenario Generator
        ↓
Synthetic Market Routes
        ↓
Quote Generation
        ↓
Raw Preservation
        ↓
Normalisation
        ↓
Comparison Eligibility
        ↓
Customer Objective Analysis
        ↓
Explainable Recommendation Set
        ↓
Customer Selection
        ↓
Final Integrity
```

The phrase **Customer Objective Analysis** replaces any premature universal “effective cost” ranking.

## 11.1 Recommendation contract

Each recommendation SHALL persist:

- `recommendation_set_id`
- `profile_version_id`
- `objective_id`
- `objective_version`
- `eligible_quote_ids`
- `excluded_quote_ids`
- exclusion reasons;
- comparison rule version;
- scenario IDs;
- market-route IDs;
- recommended quote IDs or ordered result;
- explanation payload;
- generated timestamp;
- audit trace ID.

Recommendations MUST NOT depend on provider commission, introducer remuneration, referral revenue or MIQO commercial margin.

---

# 12. Provenance and audit requirements

Sprint 4 SHALL preserve exact lineage:

```text
Recommendation
    ↓
Customer Objective
    ↓
NormalisedQuote
    ↓
RawProviderResponse
    ↓
QuoteRequest
    ↓
MarketRoute
    ↓
Scenario
    ↓
ScenarioDelta
    ↓
RiskProfileVersion
```

The system must also be able to explain:

- which O-class values changed;
- which values remained fixed;
- which provider/channel route was used;
- which adapter/mapping version transformed the request;
- what raw result was received;
- which normalisation version produced the comparable representation;
- which objective/ranking method surfaced the result.

Audit records remain append-only.

---

# 13. Integrity requirements

The Sprint 4 integrity layer SHALL block or flag at minimum:

- scenario containing non-O delta;
- scenario generated from non-current or non-locked profile;
- invalid named-driver relationship;
- unsupported telematics combination;
- impossible start-date configuration;
- excess outside configured limits;
- candidate vehicle used outside PRE_PURCHASE mode;
- provider/channel mapping without versioned provenance;
- recommendation using non-eligible quote;
- recommendation using dormant comparison state;
- commercial remuneration influencing ranking;
- explanation missing the rule/version needed to reconstruct a recommendation.

An integrity signal remains a control/evidence state, not an automatic fraud conclusion.

---

# 14. Sprint 4 execution boundary

Sprint 4 SHALL focus on **Explainable Multi-Scenario Customer Optimisation**.

Sprint 4 scope MAY include:

- Optimisation Catalogue v2;
- Customer Objective Model v1;
- systematic O-only multi-scenario generation;
- multiple deterministic synthetic market routes;
- provider/channel orchestration metadata;
- objective-specific analysis;
- explainable recommendation sets;
- occupation taxonomy mapping contract;
- PRE_PURCHASE vehicle semantics;
- recommendation lineage/audit.

Sprint 4 scope SHALL exclude unless separately authorised:

- live insurers;
- real customer data;
- policy purchase/binding;
- scraping or browser automation against insurer/PCW sites;
- universal premium-plus-excess score;
- active `ADJUSTED_COMPARABLE` methodology;
- commercial-remuneration ranking influence;
- uncontrolled occupation switching;
- factual mileage/parking/ownership/claims/convictions/main-driver manipulation.

---

# 15. Pre-Sprint-4 gateway

The following is the formal provisioning gate:

> **MIQO-SP4-PREP-001 — Customer-Focused Analysis & Optimisation Framework Provisioning**

| Gate | Required evidence |
|---|---|
| **P4-G0** | Sprint 3 certified baseline remains untouched |
| **P4-G1** | Framework mapped into F/V/D/I/O taxonomy |
| **P4-G2** | Optimisation Catalogue v2 approved |
| **P4-G3** | Provider/channel orchestration model approved |
| **P4-G4** | Customer Objective Model v1 approved |
| **P4-G5** | Premium/excess methodology boundary explicitly documented |
| **P4-G6** | `ADJUSTED_COMPARABLE` remains dormant unless separately approved |
| **P4-G7** | Occupation taxonomy mapping separated from factual occupation changes |
| **P4-G8** | PRE_PURCHASE vehicle semantics approved |
| **P4-G9** | Explainability contract approved |
| **P4-G10** | Recommendation provenance/audit contract approved |
| **P4-G11** | Regulatory/data-provenance controls mapped |
| **P4-G12** | Sprint 4 implementation scope and acceptance gates frozen |

Only after **P4-G0 through P4-G12** are evidenced PASS should `SP4-EXEC-001` begin.

---

# 16. Proposed Sprint 4 objective

## MIQO Sprint 4 — Explainable Multi-Scenario Customer Optimisation

Target end-state:

```text
LOCKED truthful profile
        ↓
customer objective
        ↓
legitimate choice catalogue
        ↓
multiple O-only scenarios
        ↓
multiple synthetic provider/channel routes
        ↓
normalised comparable quotes
        ↓
multidimensional customer analysis
        ↓
explainable recommendations
        ↓
customer selection
        ↓
final integrity
```

Sprint 4 should prove that MIQO can systematically explore legitimate customer choices across multiple synthetic market routes and explain why a quotation or recommendation was surfaced without altering factual truth.

---

# 17. Proposed Sprint 4 acceptance gates

The following execution gates are provisionally defined and SHALL be frozen before implementation begins:

| Gate | Acceptance intent |
|---|---|
| **S4-G0** | Sprint 1–3 certified regression baseline remains green |
| **S4-G1** | Optimisation Catalogue v2 persisted and versioned |
| **S4-G2** | Customer objective persisted and versioned |
| **S4-G3** | Multi-scenario generator produces only permitted O-class combinations |
| **S4-G4** | Invalid or contradictory combinations are rejected deterministically |
| **S4-G5** | MarketRoute separates provider/channel from ScenarioDelta |
| **S4-G6** | Multi-route synthetic quote execution preserves exact lineage |
| **S4-G7** | Occupation mapping cannot mutate canonical occupation fact |
| **S4-G8** | PRE_PURCHASE candidate vehicle cannot overwrite factual vehicle |
| **S4-G9** | Objective-specific comparison is deterministic and versioned |
| **S4-G10** | Universal premium-plus-excess score remains impossible |
| **S4-G11** | Explainability record reconstructs each recommendation |
| **S4-G12** | Commercial remuneration cannot influence recommendation result |
| **S4-G13** | Recommendation survives restart with exact provenance |
| **S4-G14** | Customer browser journey demonstrates objective → scenarios → recommendations |
| **S4-G15** | Admin trace reconstructs objective, scenarios, routes, quotes and recommendation |
| **S4-G16** | Full CI passes from clean install/database |

These remain subject to final freeze under P4-G12.

---

# 18. Data model additions

The following entities are provisioned for Sprint 4 implementation:

```text
OptimisationControl
OptimisationCatalogueVersion
CustomerObjective
CustomerObjectiveVersion
MarketRoute
OptimisationExplanation
RecommendationSet
RecommendationEntry
OccupationTaxonomyMapping
CandidateVehicle
```

These entities SHALL reference existing profile/scenario/quote/audit objects rather than duplicating factual truth.

---

# 19. Change control

The following require an explicit approved change to this provision or a successor ADR/specification:

- making a factual field optimisable;
- activating `ADJUSTED_COMPARABLE`;
- introducing a universal composite insurance-cost score;
- allowing commercial remuneration into ranking;
- allowing provider/channel identity to become a customer factual field;
- allowing occupation description optimisation to alter real employment facts;
- allowing candidate vehicle data to overwrite the current factual vehicle;
- introducing live providers;
- introducing real customer data;
- weakening recommendation provenance or explainability requirements.

---

# 20. Definition of Ready for Sprint 4 execution

Sprint 4 is ready to execute only when:

1. the Sprint 3 certified baseline is promoted and immutable;
2. P4-G0 through P4-G12 are PASS;
3. the Optimisation Catalogue v2 is approved;
4. the Customer Objective Model v1 is approved;
5. MarketRoute semantics are frozen;
6. occupation mapping rules are frozen;
7. PRE_PURCHASE vehicle semantics are frozen;
8. comparison/economic methodology boundaries are frozen;
9. explainability and recommendation provenance schemas are frozen;
10. Sprint 4 acceptance gates are baselined in source/documentation.

Only then may implementation begin under:

> **`MIQO-SP4-EXEC-001 — Explainable Multi-Scenario Customer Optimisation`**

---

# 21. Governing decision

MIQO-SP4-PREP-001 v1.0 authorises **provisioning only**.

It does not itself authorise Sprint 4 feature implementation until the pre-execution gateway is satisfied.

The research framework is therefore incorporated as a controlled input to MIQO, not as an uncontrolled source of executable rules.

The governing principle remains:

> **Hold factual risk information constant and systematically optimise only legitimate customer-controllable choices across supported market routes, with transparent objectives, explainable recommendations and complete provenance.**

**End of MIQO-SP4-PREP-001 v1.0**