# MIQOS Customer Information Architecture v1.0

**Programme:** MIQOS-APP-PREP-001  
**Phase:** P2 — Information Architecture & UX Rules  
**Gate:** APP-G3  
**Status:** FROZEN FOR APPLICATION PREPARATION  
**Date:** 20 September 2026

## Canonical customer navigation

Dashboard; Your Profile; Optimise; Quotes; Your Results; Documents; Activity; Help & Support; Settings.

## Canonical routes

```text
/dashboard
/profile/capture
/profile/validation
/profile/discrepancies
/profile/review
/profile/lock
/optimise/objective
/optimise/controls
/optimise/scenarios
/optimise/vehicles
/quotes/compare
/quotes/:quoteId
/results/:resultSetId
/results/:resultSetId/why
/documents
/activity
/support
/settings
```

The customer application represents the current authenticated/customer context. Internal identifiers remain available to the application and audit trail but are not primary navigation.

## Journey

```text
Profile Capture
→ Validation
→ Discrepancy Resolution where required
→ Review
→ Lock
→ Objective
→ O-class Controls
→ Scenarios
→ Quotes
→ Your Results
→ Why This Surfaced
→ permitted handoff
```

Availability is server-state driven. Navigation must not bypass validation, discrepancy, lock, integrity or eligibility controls. Locked factual information is read-only; correction uses versioned correction flows. PRE_PURCHASE vehicle controls are available only when applicable.

## Existing prototype route migration intent

| Current route | Target area |
|---|---|
| `/` | `/dashboard` |
| `/profile/[profileId]/section/[sectionKey]` | `/profile/capture` |
| `/profile/[profileId]/review` | `/profile/review` |
| `/profile/[profileId]/correction` | `/profile/discrepancies` / correction flow |
| `/profile/[profileId]/lock` | `/profile/lock` |
| `/profile/[profileId]/optimisation` | `/optimise/controls` |
| `/profile/[profileId]/optimisation/scenarios` | `/optimise/scenarios` |
| `/profile/[profileId]/quotes` | `/quotes/compare` |
| `/profile/[profileId]/recommendations` | `/results/:resultSetId` |
| `/profile/[profileId]/completion` | result/handoff completion state |

Redirect implementation is deferred to build planning and must preserve identifiers/deep-link context.

**APP-G3 = PASS**
