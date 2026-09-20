# MIQOS-APP-BUILD-001 — Controlled Build Plan v1.0

**Source programme:** MIQOS-APP-PREP-001  
**Phase:** P5 — Build Planning & Certification  
**Gate:** APP-G14  
**Status:** FROZEN FOR CONTROLLED BUILD  
**Date:** 20 September 2026

## 1. Build authority boundary

This plan authorises application construction only after APP-G15 is satisfied.

It does **not** authorise:

- live insurer/provider activation;
- production credentials;
- policy purchase/binding;
- changes to certified factual/optimisation/scenario/comparison/integrity rules;
- activation of `ADJUSTED_COMPARABLE`;
- changes to commercial-remuneration independence;
- production deployment approval.

Application build and provider certification remain separate programmes joined through canonical MIQOS contracts.

## 2. Build source and branch control

The application build branch shall be created from the final certified APP-PREP head:

```text
miqos/app-prep-001  (APP-G15 PASS)
          ↓
miqos/app-build-001
```

The build branch is **not** created by P5. Its creation is the first action of the next controlled execution phase.

All build work remains isolated until application certification completes.

## 3. Implementation sequence

```text
BUILD-001A  Foundation, App Shell & Shared Design System
      ↓
BUILD-001B  Customer Dashboard
      ↓
BUILD-001C  Profile / Validation / Discrepancy / Lock
      ↓
BUILD-001D  Objective / Optimisation / Scenario Explorer
      ↓
BUILD-001E  Quote Comparison
      ↓
BUILD-001F  Your Results / Why This Surfaced / Handoff State
      ↓
BUILD-001G  Admin Audit & Trace Console
      ↓
BUILD-001H  Activity / Documents / Support / Settings Scope
      ↓
BUILD-001I  Responsive / Accessibility / Contract / E2E Hardening
      ↓
BUILD-001J  Application Certification & Closeout
```

No later wave should be used to conceal an unresolved failure in an earlier wave.

## 4. BUILD-001A — Foundation, shell and shared system

### Scope

- create `miqos/app-build-001` from certified APP-PREP head;
- wire frozen P1 tokens into `@miqo/ui`;
- implement L1 accessible primitives and priority L2 semantic components;
- implement customer/admin AppShell/navigation/environment presentation;
- create application adapter boundary;
- consume `@miqo/application-contracts` types;
- establish component/unit test baseline;
- add approved exact-pinned dependencies only where required;
- preserve existing prototype routes until replacement routes are proven.

### Adapter location

Runtime API→ViewModel mapping is frozen for build as:

```text
packages/application-adapters
└── @miqo/application-adapters
```

Responsibilities:

- pure/presentation-safe mapping of API DTO shapes into ViewModels;
- state mapping;
- environment presentation mapping;
- no network calls;
- no DB/domain/business-rule authority.

Fetching/route orchestration remains in customer-web/admin-web loaders/application services.

### Exit criteria

- design tokens consumed centrally;
- environment banner/badge consumes trusted supplied context;
- primitive accessibility behaviour tested;
- no direct DB dependency in web apps;
- no shared component fetch/mutation;
- `npm ci`, boundary checks, typecheck/build and relevant tests green.

## 5. BUILD-001B — Customer Dashboard

Implement `/dashboard` using authoritative composed application state.

Dashboard must prioritise:

1. blocking/required action;
2. journey status;
3. current profile/objective;
4. quote/result state;
5. secondary analytics.

No dashboard metric may invent ranking or eligibility.

## 6. BUILD-001C — Profile lifecycle

Implement:

```text
/profile/capture
/profile/validation
/profile/discrepancies
/profile/review
/profile/lock
```

Requirements:

- locked F/V/D values render read-only;
- corrections use versioned correction flow;
- validation and discrepancy reasons come from backend evidence;
- lock action remains backend-authoritative;
- no direct mutation of locked factual records.

## 7. BUILD-001D — Optimisation/scenarios

Implement:

```text
/optimise/objective
/optimise/controls
/optimise/scenarios
/optimise/vehicles
```

Requirements:

- only executable backend-approved objectives selectable;
- only O-class controls interactive;
- PRE_PURCHASE vehicle choice is applicability-gated;
- rejected scenario combinations remain visible with reasons;
- scenario generation/order remains backend-owned.

## 8. BUILD-001E — Quote Comparison

Implement both renderers over one `QuoteComparisonVM`:

```text
QuoteComparisonTable  → wide
QuoteComparisonCards  → narrow
```

Requirements:

- directly comparable and non-comparable evidence clearly separated;
- unavailable routes shown where evidence exists;
- annual premium, finance and excess remain separate;
- ordering uses supplied ordinal/objective evidence;
- `ADJUSTED_COMPARABLE` is not activated for ranking;
- mobile cannot remove material dimensions.

## 9. BUILD-001F — Your Results / Why This Surfaced

Implement:

```text
/results/:resultSetId
/results/:resultSetId/why
```

Requirements:

- customer copy follows APP-G11;
- source RecommendationSet lineage is preserved;
- no frontend-created recommendation explanation;
- result ordinal names the selected objective;
- synthetic/certification handoff remains non-purchasing/non-binding;
- final integrity/action authority is explicit.

## 10. BUILD-001G — Admin Audit & Trace

Implement canonical admin operational surfaces needed for exact reconstruction, prioritising:

```text
/admin/cases
/admin/audit
/admin/audit/trace/:selectionId
/admin/quote-runs
/admin/recommendations
/admin/integrity
```

Admin views retain exact engineering terminology and versions.

Raw provider response and normalised quotation are visibly distinct artefacts.

No destructive audit mutation is introduced.

## 11. BUILD-001H — Supporting areas

Implement only capabilities supported by real backend/content scope.

- `/activity` may project existing audit/application activity.
- `/documents`, `/support` and `/settings` may receive shell/content implementations only when no backend capability exists.
- unsupported data/actions must not be fabricated.
- deferred routes may clearly state availability rather than simulating functionality.

## 12. BUILD-001I — Hardening

Cross-application hardening includes:

- 320px→desktop responsive verification;
- WCAG 2.2 AA engineering checks;
- keyboard-only core journeys;
- screen-reader smoke tests;
- automated accessibility scans;
- contract fixture tests;
- component tests;
- API/adapter contract tests;
- target-stack Playwright journey;
- loading/empty/partial/error/blocked-state coverage;
- visual regression for priority states where tooling is justified.

## 13. BUILD-001J — Application certification

Certification requires:

- all wave exit criteria satisfied;
- CI green at build head;
- no open critical/high build defect;
- P0–P5 invariants preserved;
- customer/admin canonical routes proven;
- synthetic boundary proven;
- accessibility/responsive evidence recorded;
- provider/live activation remains separately governed;
- final implementation/evidence inventory and closeout report.

## 14. Execution mode

### Batch execution

The implementation agent may batch:

- scaffolding;
- pure component implementation;
- adapters;
- fixture-driven tests;
- route composition;
- responsive styling;
- accessibility remediation;
- documentation/evidence;
- deterministic CI fixes within frozen architecture.

### Controlled user session required

Stop for explicit approval if execution would require:

- changing a frozen P1–P4 architectural decision;
- introducing a new customer objective/comparison methodology;
- activating `ADJUSTED_COMPARABLE`;
- altering customer advice/regulatory positioning;
- live provider credentials/connectivity;
- changing factual ownership or locked-profile rules;
- introducing material new product scope;
- accepting a critical/high accessibility or integrity exception.

## APP-G14 decision

**APP-G14 = PASS**
