# BUILD-001A Scope Record

Runtime implementation is confined to `apps/customer-web`, `apps/admin-web` and `packages/ui`. Supporting CI, E2E and evidence changes are permitted.

## Implemented foundation

```text
MIQOS App Shell
  ↓
Dark Design System
  ↓
Customer/Admin Navigation
  ↓
Responsive Layout
  ↓
ApplicationEnvironmentContext
  ↓
Semantic Status Components
  ↓
P4 ViewModel type boundary
  ↓
Synthetic Dashboard proving surface
```

## Explicitly out of scope

No new profile editing, discrepancy resolution, profile lock, scenario generation, quote execution, result execution, customer handoff, provider certification, Seopa/provider-specific behaviour, live data, production authentication, document upload or messaging is implemented.

Existing certified prototype routes remain in place for regression evidence.
