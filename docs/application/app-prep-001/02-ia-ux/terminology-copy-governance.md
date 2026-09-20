# MIQOS Customer Terminology & Copy Governance v1.0

**Gate:** APP-G11  
**Status:** FROZEN FOR APPLICATION PREPARATION

## Governing principle

Customer-facing MIQOS language explains objective-based information and surfaced results without presenting the service as giving a personalised insurance recommendation. Backend/admin engineering entities retain their exact names for auditability.

## Internal-to-customer mapping

| Internal/admin term | Customer-facing term |
|---|---|
| RecommendationSet | Your Results / Result set |
| Recommendation / recommended quote | Surfaced result / Top result |
| RecommendationExplanation | Why This Surfaced |
| Recommendation ranking | Ranked eligible results for your selected objective |
| Eligible quote | Eligible result / directly comparable quote |
| Excluded quote | Excluded from this comparison |
| RiskProfileVersion | Profile version |
| Scenario | Scenario / set of choices |
| NormalisedQuote | Quote |
| CustomerObjective | Your objective / selected objective |
| IntegritySignal | Integrity check / system check, with exact state and reason |

## Preferred customer phrases

- “Top result for your selected objective”
- “Why this surfaced”
- “Lowest annual premium among eligible directly comparable quotes”
- “Based on your locked profile and selected choices”
- “Information only — not personal insurance advice”
- “Change choices, not facts”
- “This quote is not directly comparable because …”
- “This result is excluded from ranking because …”

## Avoid as primary assertions

- “We recommend”
- “Best policy for you”
- “Best insurer for you”
- “You should buy”
- “Guaranteed cheapest”
- blanket “unbiased” claims without a separately approved basis
- accusatory integrity language for ordinary control states

## Ranking language

Any ordinal must state its decision lens and eligible population.

Permitted example:

> “#1 for Lowest Annual Premium among eligible directly comparable quotes.”

Do not present an objective-specific ordinal as a universal suitability judgment.

## Financial language

Premium, finance cost and excess remain separate dimensions. Do not introduce “true cost”, “effective price” or “best value” metrics that silently combine certain spend with contingent excess exposure.

## Commercial-independence wording

Where supported by the persisted evidence, the UI may state:

> “Provider remuneration is not an input to scenario generation, comparison eligibility or result ordering.”

Do not convert this into a broader unsupported claim about every aspect of the service.

## Handoff language

“Continue to provider”, “Go to insurer”, “View provider” and “Send me this summary” may be used only where the active environment/backend contract permits the action. Synthetic/certification environments must not imply policy purchase or binding.

## Copy governance

Customer-critical copy should be sourced from versioned UI/content constants or ViewModel fields rather than duplicated ad hoc. Backend-supplied reasons should be preferred for exclusions, non-comparability, validation, integrity blocks and scenario rejection.

**APP-G11 = PASS**
