# MIQOS-APP-BUILD-001 / BUILD-001E — Quote Comparison

**Visual authority:** supplied MIQOS Quote Comparison reference for hierarchy and dark MIQOS presentation.  
**Behaviour authority:** certified normalisation/comparison rules, objective model, market-route orchestration and P4 ViewModel boundary.

| Gate | Acceptance condition |
|---|---|
| AB-QUOTE-G0 | BUILD-001A/B/C/D baselines and certified domain/database controls remain green |
| AB-QUOTE-G1 | Quote comparison references the exact locked profile, persisted customer objective and selected scenario exploration |
| AB-QUOTE-G2 | Route execution remains explicit, environment-controlled and provider-independent at the customer UI boundary |
| AB-QUOTE-G3 | Objective ordering is calculated by backend/domain comparison logic, never by React |
| AB-QUOTE-G4 | Only eligible DIRECTLY_COMPARABLE evidence receives an ordinal rank |
| AB-QUOTE-G5 | ADJUSTED_COMPARABLE remains dormant/not-ranked; NOT_COMPARABLE and objective-ineligible evidence retain explicit reasons |
| AB-QUOTE-G6 | Premium, finance cost and excess remain separate dimensions; no universal premium-plus-excess score exists |
| AB-QUOTE-G7 | Quote comparison does not create a RecommendationSet or imply that ordinal #1 is customer advice |
| AB-QUOTE-G8 | Comparison and excluded evidence remain usable across desktop/tablet/mobile and preserve semantic badges/labels |
| AB-QUOTE-G9 | Target-stack E2E proves route execution, eight ranked annual-premium quotes and monthly-objective exclusions |
| AB-QUOTE-G10 | Comparison/application-adapter tests, PostgreSQL/API regressions, Playwright and production build are green |

## Boundary

BUILD-001E introduces a read-only objective comparison endpoint over already-persisted normalised quote evidence. The endpoint delegates objective eligibility and ordering to the existing certified Sprint 4 analysis, but does not persist or surface a recommendation decision.

The current synthetic runtime can explicitly execute the already-certified market-route orchestration. The customer frontend never chooses a provider-specific adapter or constructs provider payloads.

## Reference corrections

The visual reference included an Adjusted comparison category. The frozen application preparation decision keeps ADJUSTED_COMPARABLE dormant. BUILD-001E therefore renders such evidence as not ranked and never upgrades it into the eligible set.

The visual reference also implied a generic rank. In the executable application, rank is always relative to the selected customer objective. Rank #1 is labelled as an ordering result, not a recommendation. BUILD-001F remains responsible for persisted RecommendationSet / Why This Surfaced presentation.


## Visual authority revision

This certified increment now inherits **MIQOS-DS-001 v1.1 — Visual Baseline Refinement**. The revision changes visual tokens and presentation semantics only; all previously certified behavioural gates remain unchanged. See `docs/application/app-build-001/visual-retrofit-register-v1.1.md`.
