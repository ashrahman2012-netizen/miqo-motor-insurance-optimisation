# MIQOS Typed ViewModel Contract v1.0

**Programme:** MIQOS-APP-PREP-001  
**Phase:** P4 — ViewModel/API Contract  
**Gate:** APP-G6  
**Status:** FROZEN FOR APPLICATION PREPARATION  
**Date:** 20 September 2026

## 1. Contract location

The shared application contract boundary is frozen as:

```text
packages/application-contracts
└── @miqo/application-contracts
```

This package is intentionally distinct from:

- `packages/domain` — business/domain authority;
- `packages/ui` — presentation components/tokens;
- `apps/api` — HTTP/application service boundary.

The contract package contains type-only ViewModels and synthetic fixtures. It does not become another business-logic layer.

## 2. Dependency direction

```text
Domain / DB / services
        ↓
Fastify API DTOs
        ↓
application adapter / loader
        ↓
@miqo/application-contracts ViewModels
        ↓
@miqo/ui presentation components
        ↓
customer-web / admin-web page composition
```

React components do not bind directly to database entities or untyped API payloads.

## 3. Core contracts

The frozen type surface includes:

- `ApplicationEnvironmentVM`;
- `PageStateVM`;
- `ActionAvailabilityVM`;
- `ProfileVersionVM`, `ProfileFieldVM`, `ValidationResultVM`, `DiscrepancyVM`, `ProfileReviewVM`;
- `ObjectiveVM`, `ObjectiveSelectorVM`, `OptimisationControlVM`;
- `ScenarioVM`, `RejectedCombinationVM`, `ScenarioExplorationVM`;
- `MarketRouteVM`, `PricingVM`, `ExcessVM`, `NormalisedQuoteVM`, `QuoteComparisonVM`;
- `ResultReasonVM`, `IntegrityVM`, `HandoffVM`, `ResultDetailVM`;
- `AuditEventVM`, `LineageNodeVM`, `LineageExplorerVM`, `AuditTimelineVM`;
- `ApiErrorDTO` for the existing common error boundary.

## 4. Financial contract

Every quote presentation retains separate dimensions:

```text
PricingVM
  annualCashPremiumPence
  financeCostPence
  monthlyCommitmentPence
  totalPayablePence

ExcessVM
  compulsoryExcessPence
  voluntaryExcessPence
  totalExcessExposurePence
```

A ViewModel adapter must not invent a universal premium-plus-excess score.

## 5. Authoritative-state contract

P4 deliberately provides explicit fields such as:

```text
comparisonState
eligible
ordinal
objectiveMetric
objectiveMetricValuePence
exclusionReason
integrity.outcome
action.state
pageState
```

The frontend may format these values. It does not recalculate them.

If a required authoritative value is absent, the adapter produces a PARTIAL/ERROR/BLOCKED ViewModel instead of inferring a favourable state.

## 6. Customer terminology contract

Backend `RecommendationSet` remains an internal/audit entity.

Customer presentation uses:

```text
ResultDetailVM.resultSetId
ResultDetailVM.surfacedResult
ResultDetailVM.whyThisSurfaced
```

`sourceRecommendationSetId` preserves exact provenance.

## 7. Comparison-state contract

`ComparisonState` retains all persisted states so historical/admin data can be represented, but adapters must apply the frozen production rule:

- `DIRECTLY_COMPARABLE` may enter the active objective-specific ranking when the backend says it is eligible;
- `NOT_COMPARABLE` is explanatory/non-ranked;
- `ADJUSTED_COMPARABLE` is dormant and cannot be upgraded to active ranking by an application adapter.

## 8. Environment/handoff contract

Environment is trusted input. `HandoffVM.action` must be derived from backend/environment authority, not from the existence of a URL or button.

Synthetic/certification fixtures therefore demonstrate non-purchasing/non-binding action states.

## 9. APP-G6 decision

**APP-G6 = PASS**
