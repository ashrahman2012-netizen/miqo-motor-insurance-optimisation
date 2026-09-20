# MIQOS Component Ownership Boundaries v1.0

**Gate:** APP-G5  
**Status:** FROZEN

## 1. Ownership matrix

| Boundary | Owns | Must not own |
|---|---|---|
| `packages/ui` | tokens, accessible primitives, MIQOS visual semantics, presentation-only domain components | fetch/API calls, persistence, ranking, eligibility, integrity evaluation, provider activation |
| `apps/customer-web` | customer routing, page composition, customer interaction orchestration, ViewModel consumption | domain-rule reimplementation, direct DB access, provider-specific schemas |
| `apps/admin-web` | admin routing, operational page composition, trace/inspection interaction | domain-rule overrides, direct DB access, audit mutation |
| P4 application contract/adapters | API response → typed ViewModel mapping, presentation-safe transformations | changing domain outcomes |
| `apps/api` | HTTP trust boundary, application/service orchestration | visual presentation decisions |
| domain/service packages | factual truth, O-only rules, comparison/recommendation/integrity logic | page/layout concerns |
| `packages/db` | persistence schema/migrations | UI dependencies |

## 2. Import rules

Target dependency rules:

```text
packages/ui
  may import: framework-neutral/shared presentation types and its own tokens
  must not import: apps/api, packages/db, provider adapters

customer-web/admin-web
  may import: packages/ui + P4 application contracts
  must not import: packages/db
```

P4 will determine the exact location of shared ViewModel types. Until then, L3 component props remain presentation contracts rather than persistence entities.

## 3. Data-fetching rule

Shared components are **data-source agnostic**.

Prohibited:

```tsx
function QuoteCard() {
  const quote = await fetch("/quotes/...");
}
```

Required shape:

```tsx
function QuoteCard({ quote, onOpen }: QuoteCardProps) {
  // render supplied presentation data
}
```

Route/page/application layers perform loading and pass typed values into components.

## 4. Mutation rule

Shared components emit intent through callbacks. They do not call mutation endpoints.

Examples:

- `ObjectiveSelector` emits `onSelect(objectiveId)`;
- `DiscrepancyCard` emits a resolution intent;
- `LockConfirmation` emits confirm intent;
- `HandoffPanel` emits permitted handoff intent.

The application layer decides whether/how the intent maps to an API operation.

## 5. Business-state authority

Components must not derive authoritative outcomes from convenience props.

Avoid:

```text
isCheapest = annualPremium === min(allPremiums)
isEligible = quote.comparisonState !== ...
isSafe = integritySignalCount === 0
```

Instead P4 supplies explicit authoritative presentation state:

```text
ordinal
comparisonState
eligibilityState
integrityOutcome
reason
actionAvailability
```

## 6. Provider independence

No shared component is named for or branches on a specific provider/integration.

Prohibited architecture:

```text
SeopaQuoteCard
ProviderADirectResult
PCWComparisonTable
```

Approved architecture:

```text
QuoteCard
MarketRouteBadge
ProviderSummary
QuoteComparisonTable
```

Provider identity is data.

## 7. Environment authority

`EnvironmentBanner` and `EnvironmentBadge` render an already-resolved trusted environment context. They do not read query parameters/local storage or decide whether production/live-provider access is authorised.

## 8. Customer/admin split

A component belongs in `packages/ui` when its presentation semantics are reusable or need central consistency.

A component remains app-local when it contains:

- route-specific composition;
- application-only navigation policy;
- app-specific data orchestration;
- admin-only workflow with no reusable semantic abstraction.

Admin-oriented visual components can still live under a future `@miqo/ui/admin` subpath if they are presentation-only and reusable across admin routes.
