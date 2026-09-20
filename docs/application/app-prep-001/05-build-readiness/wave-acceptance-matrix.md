# MIQOS Application Build Wave Acceptance Matrix v1.0

**Gate:** APP-G14  
**Status:** FROZEN

| Wave | Primary output | Minimum evidence to exit |
|---|---|---|
| BUILD-001A | Shared system + shells + adapter boundary | token integration, primitive/semantic component tests, environment presentation, dependency/lockfile integrity, build green |
| BUILD-001B | Dashboard | success/empty/blocked dashboard fixtures, responsive composition, no client ranking |
| BUILD-001C | Profile lifecycle | draft/edit, validation failure, discrepancy, locked read-only, correction/version path, lock-block proof |
| BUILD-001D | Objective/scenarios | objective availability, O-only controls, accepted/rejected scenarios, PRE_PURCHASE applicability |
| BUILD-001E | Quote comparison | wide+narrow equivalence, mixed comparability, no-adjusted-ranking proof, separate money/excess dimensions |
| BUILD-001F | Results/explanation | surfaced result, alternatives/exclusions, persisted reasons, integrity/handoff states, customer copy checks |
| BUILD-001G | Admin trace | exact lineage nodes, raw vs normalised distinction, audit chronology, version/fingerprint visibility |
| BUILD-001H | Supporting routes | real-data-backed activity and explicit deferment/shell behaviour for unsupported services |
| BUILD-001I | Hardening | WCAG evidence, keyboard/screen-reader smoke, 320px reflow, contract/component/E2E suites |
| BUILD-001J | Certification | all prior evidence + green CI + defect/risk register + closeout |

## Universal exit controls

Every build wave must satisfy:

1. no certified-domain behaviour changed unintentionally;
2. `npm ci` succeeds with exact-pinned dependencies;
3. `verify:boundary` succeeds;
4. relevant tests pass;
5. production workspace build passes;
6. new customer-facing states have loading/error/blocked coverage;
7. new interactive behaviour is keyboard operable;
8. no provider-specific UI fork is introduced;
9. no UI calculation upgrades backend eligibility/ranking/integrity state.

A wave is not complete merely because screenshots visually resemble the reference images.
