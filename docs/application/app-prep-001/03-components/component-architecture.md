# MIQOS Shared Semantic Component Architecture v1.0

**Programme:** MIQOS-APP-PREP-001  
**Phase:** P3 — Component Architecture  
**Gate:** APP-G5  
**Status:** FROZEN FOR APPLICATION PREPARATION  
**Date:** 20 September 2026

## 1. Purpose

This document freezes the component architecture that translates the P1 design/semantic system and P2 information/UX contracts into reusable application building blocks.

APP-G5 is an architecture gate. It does not authorise production screen reconstruction.

## 2. Dependency direction

```text
P1 tokens + semantic mappings
          ↓
UI primitives
          ↓
shared semantic components
          ↓
MIQOS domain-presentation components
          ↓
customer/admin page compositions
          ↓
P4 ViewModels / application adapters
          ↓
API
```

A component may display certified state. It may not create certified state.

## 3. Component layers

### L0 — Foundations

Owned by `@miqo/ui`:

- design tokens;
- semantic mappings;
- route/copy/state preparation contracts;
- typography/spacing/radius/elevation utilities;
- icon vocabulary.

### L1 — Accessible UI primitives

Target catalogue:

- `Button`
- `IconButton`
- `TextLink`
- `TextField`
- `SelectField`
- `CheckboxField`
- `RadioGroup`
- `RadioCard`
- `FieldMessage`
- `Card`
- `Panel`
- `Divider`
- `Badge`
- `Alert`
- `Dialog`
- `Drawer`
- `Tabs`
- `DataTable`
- `Skeleton`
- `Spinner`
- `EmptyState`
- `PageState`

These components know nothing about insurance rules.

### L2 — Shared semantic components

- `StatusBadge`
- `ControlClassBadge`
- `EnvironmentBanner`
- `EnvironmentBadge`
- `IntegrityBadge`
- `ComparisonStateBadge`
- `MoneyAmount`
- `MetricValue`
- `DefinitionList`
- `PageHeader`
- `JourneyStepper`
- `ProvenanceLink`
- `ReasonList`
- `AsyncStateBoundary`

These components understand frozen MIQOS presentation semantics but still do not fetch data or calculate business outcomes.

### L3 — Shared MIQOS domain-presentation components

Profile:
- `ProfileField`
- `FieldProvenance`
- `ProfileVersionCard`
- `DiscrepancyCard`
- `ValidationSummary`
- `LockConfirmation`

Optimisation/scenarios:
- `ObjectiveSelector`
- `OptimisationControl`
- `ScenarioCard`
- `ScenarioMatrix`
- `RejectedCombination`

Quotes/results:
- `MarketRouteBadge`
- `QuoteCard`
- `QuoteComparisonTable`
- `QuoteComparisonCards`
- `ResultHero`
- `ResultReason`
- `AlternativeResult`
- `IntegritySummary`
- `HandoffPanel`

Audit/admin:
- `LineageExplorer`
- `AuditTimeline`
- `ArtefactInspector`
- `RawNormalisedViewer`
- `IntegrityQueue`
- `ProviderCertificationStatus`
- `ActivationStatus`

## 4. Composition rule

Page-specific layouts live in the application packages.

Examples:

```text
customer-web /quotes/compare
  PageHeader
  + EnvironmentBanner
  + objective context
  + QuoteComparisonTable OR QuoteComparisonCards
  + excluded/not-comparable section
  + PageState

admin-web /admin/audit/trace/:selectionId
  PageHeader
  + EnvironmentBadge
  + LineageExplorer
  + AuditTimeline
  + ArtefactInspector
  + RawNormalisedViewer
```

The shared package supplies the pieces; customer/admin applications decide route/page composition.

## 5. No hidden business logic

The following are prohibited inside `@miqo/ui`:

- quote eligibility calculation;
- objective ranking;
- recommendation/result selection;
- scenario generation;
- factual/derived classification decisions;
- integrity evaluation;
- provider certification decisions;
- environment authorisation;
- policy/risk calculations;
- raw-provider normalisation;
- commercial-remuneration logic.

For example, `ResultHero` receives an already surfaced result. It never chooses one. `QuoteComparisonTable` receives authoritative comparison/ranking state. It never decides which quote ranks first.

## 6. Responsive component pairs

Where the presentation structure genuinely changes, the architecture uses shared data contracts with different renderers rather than CSS-only compression.

Required pair:

```text
QuoteComparisonModel
       ├── QuoteComparisonTable   (wide)
       └── QuoteComparisonCards   (narrow)
```

Both render the same material dimensions and backend-supplied ordering/state.

## 7. Icon target

The implementation target for general UI icons is **Lucide React**.

Rationale:

- SVG/currentColor integration with the token system;
- consistent stroke vocabulary;
- tree-shakable component imports;
- straightforward decorative `aria-hidden` usage;
- accessible-name responsibility remains with the containing control/component.

P3 approves the icon target only. Dependency installation is deferred to application build/P5 planning.

## 8. Component documentation requirement

Each L2/L3 component must document:

- purpose;
- authoritative input;
- variants/states;
- accessibility behaviour;
- responsive behaviour where applicable;
- prohibited responsibilities;
- loading/empty/error assumptions;
- testing hooks only where semantically necessary.

## 9. APP-G5 decision

**APP-G5 = PASS**
