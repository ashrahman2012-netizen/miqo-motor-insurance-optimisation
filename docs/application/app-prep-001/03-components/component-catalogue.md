# MIQOS Component Catalogue v1.0

**Gate:** APP-G5  
**Status:** FROZEN CATALOGUE

## Shared shell and state

| Component | Primary responsibility | Authoritative input |
|---|---|---|
| AppShell | Structural shell slots | route/app composition |
| SidebarNavigation | Render supplied navigation | route map + current route |
| TopNavigation | Utility/header presentation | app/user presentation context |
| EnvironmentBanner | Persistent environment identity | resolved environment VM/context |
| PageHeader | title/subtitle/actions | page composition |
| JourneyStepper | journey step state | explicit step statuses |
| AsyncStateBoundary | loading/empty/error/blocked rendering | explicit UI state |

## Semantic components

| Component | Responsibility | Explicitly not responsible for |
|---|---|---|
| StatusBadge | lifecycle/status label | calculating status |
| ControlClassBadge | F/V/D/O/I identity | classifying a field |
| IntegrityBadge | integrity state/severity display | evaluating integrity |
| ComparisonStateBadge | comparison state display | deciding comparability |
| MoneyAmount | GBP display | financial calculations |
| ReasonList | render evidence/reasons | inventing reasons |
| ProvenanceLink | expose lineage navigation intent | constructing provenance |

## Profile

| Component | Responsibility |
|---|---|
| ProfileField | field label/value/class/status |
| FieldProvenance | verification/source detail |
| ProfileVersionCard | version/status metadata |
| ValidationSummary | supplied validation result |
| DiscrepancyCard | previous/current/evidence/resolution intents |
| LockConfirmation | confirmation content and action intent |

## Optimisation and scenarios

| Component | Responsibility |
|---|---|
| ObjectiveSelector | render executable objectives supplied by application |
| OptimisationControl | render one approved O-class control |
| ScenarioCard | scenario identity + O-class deltas |
| ScenarioMatrix | wide multi-scenario comparison |
| RejectedCombination | attempted combination + persisted rejection reason |

`ObjectiveSelector` never activates a dormant objective. `OptimisationControl` never turns a factual field into an O-class choice.

## Quotes and results

| Component | Responsibility |
|---|---|
| MarketRouteBadge | route/channel/provider summary |
| QuoteCard | one normalised quote presentation |
| QuoteComparisonTable | wide comparison representation |
| QuoteComparisonCards | narrow comparison representation |
| ResultHero | already-surfaced result summary |
| ResultReason | one persisted/exposed explanation reason |
| AlternativeResult | eligible alternative presentation |
| IntegritySummary | final/system integrity presentation |
| HandoffPanel | render supplied action availability/disclosure |

Comparison renderers preserve separate premium, finance and excess dimensions.

## Admin and trace

| Component | Responsibility |
|---|---|
| LineageExplorer | ordered persisted lineage |
| AuditTimeline | append-only event presentation |
| ArtefactInspector | selected artefact metadata |
| RawNormalisedViewer | explicit raw vs normalised inspection |
| IntegrityQueue | integrity/discrepancy worklist presentation |
| ProviderCertificationStatus | supplied certification status |
| ActivationStatus | supplied activation/environment status |

`RawNormalisedViewer` must visually preserve the raw/normalised distinction. `AuditTimeline` is presentation-only and provides no destructive audit action.

## Suggested future package surface

```text
@miqo/ui/primitives
@miqo/ui/semantic
@miqo/ui/customer
@miqo/ui/admin
@miqo/ui/tokens
```

Exact subpath exports are an implementation detail for BUILD, but the ownership grouping is frozen by APP-G5.
