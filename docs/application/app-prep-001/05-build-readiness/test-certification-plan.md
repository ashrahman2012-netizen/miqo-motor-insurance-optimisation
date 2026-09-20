# MIQOS Application Test & Certification Plan v1.0

**Gate:** APP-G14 / APP-G15  
**Status:** FROZEN

## 1. Test pyramid

### Domain/API regression

Existing domain, PostgreSQL contract, API and target-stack tests remain mandatory. Application build must not weaken them.

### Contract/adapters

Add deterministic tests that:

- map representative API shapes to P4 ViewModels;
- reject/flag missing authoritative fields;
- preserve pence integers and opaque IDs;
- preserve ordering/exclusion reasons;
- never activate dormant adjusted-comparable ranking;
- map domain conflicts to BLOCKED rather than EMPTY.

### Components

Use the repository's existing Vitest baseline plus React component testing dependencies only when exact-pinned and compatibility-checked.

Component tests prioritise:

- accessible names/roles/state;
- keyboard interaction;
- focus management;
- semantic badge/environment state;
- async page states;
- quote wide/narrow information equivalence.

General icon implementation target remains Lucide React and must be exact-pinned when installed.

### Accessibility

Minimum certification method mix:

- automated accessibility scan for priority routes/components;
- keyboard-only customer journey;
- screen-reader smoke test;
- focus order/visibility;
- 320px reflow and zoom checks;
- non-colour state verification;
- semantic quote table/card equivalence;
- admin trace/table semantics.

Automated scanning alone cannot certify APP-BUILD accessibility.

### E2E

Playwright target-stack coverage should evolve from the existing certified browser journey and prove canonical routes as they replace prototype pages.

Required scenarios include:

- incomplete profile lock block;
- successful lock;
- O-only optimisation journey;
- rejected scenario visibility;
- mixed quote comparison;
- top result/why state;
- final integrity block;
- synthetic environment handoff restriction;
- admin trace reconstruction.

## 2. Dependency policy

New build tooling/dependencies must:

- be exact-pinned;
- update `package-lock.json`;
- pass `verify:pins`;
- be introduced for a defined acceptance purpose;
- avoid duplicating existing repository capability without justification.

## 3. CI policy

Every controlled build checkpoint must retain:

```text
locked-dependencies
postgres-contract
target-stack-sprint1
```

Additional application-specific jobs may be added during BUILD but cannot replace these existing controls.

## 4. Defect severity for certification

| Severity | Example | BUILD-001J disposition |
|---|---|---|
| Critical | incorrect ranking/eligibility, factual mutation bypass, environment/live-provider bypass | zero open |
| High | material financial dimension hidden/misstated, inaccessible critical action, broken integrity block | zero open |
| Medium | non-blocking responsive/a11y defect, secondary route defect | documented decision/remediation |
| Low | cosmetic/polish issue with no semantic effect | may defer with record |

## 5. Evidence

BUILD-001J closeout must capture exact commit SHA, CI run IDs, test commands/results, route coverage, accessibility evidence, unresolved defects and deferred scope.
