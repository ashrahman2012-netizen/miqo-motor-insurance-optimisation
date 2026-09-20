# MIQOS-APP-PREP-001 — P0 Gap Register

**Phase:** P0  
**Gate:** APP-G0

| ID | Classification | Finding | Treatment |
|---|---|---|---|
| P0-01 | PASS | Customer, admin and API application boundaries already exist in the monorepo. | Preserve. |
| P0-02 | PASS | Frontend has no direct DB package dependency. | Preserve API boundary. |
| P0-03 | PASS | Synthetic-only runtime guard exists in API and CI. | Later replace hard-coded UI banner logic with central environment presentation, without weakening runtime guard. |
| P0-04 | PASS | F/V/D/O/I and O-only scenario invariants exist in domain/service code. | UI consumes; never redefines. |
| P0-05 | PASS | Sprint 4 recommendation logic excludes adjusted-comparable quotes and dormant balanced objective. | Preserve in UX. |
| P0-06 | AVAILABLE | Customer/admin prototype routes already exercise major certified flows. | Reuse behaviour, not current inline presentation. |
| P0-07 | AVAILABLE | API resources are domain-oriented and expose required lineage. | Map into typed ViewModels in P4. |
| P0-08 | PARTIAL | `packages/ui` exists only as a placeholder package. | P1/P3 build design-system and semantic component architecture. |
| P0-09 | PARTIAL | Environment identity is visible but hard-coded per layout. | P1 define ApplicationEnvironmentContext and visual semantics. |
| P0-10 | PARTIAL | Some accessibility primitives exist, but there is no formal WCAG baseline. | P2 / APP-G10. |
| P0-11 | PARTIAL | Desktop prototype screens exist; responsive behaviour is not formally specified. | P2 / APP-G9. |
| P0-12 | PARTIAL | React pages use raw response `any` values. | P4 / APP-G6 typed ViewModels. |
| P0-13 | MISSING | Shared tokens/theme/component implementation. | P1/P3. |
| P0-14 | MISSING | Standard loading, empty, error and blocked-state component system. | P2/P3. |
| P0-15 | MISSING | Customer/admin frontend unit/component tests. | Define in P4/P5; existing CI currently relies on build/e2e/domain tests. |
| P0-16 | CONFLICT | Current customer UI repeatedly uses “recommendation” language; APP-PREP target terminology is non-advised “results / surfaced result / why this surfaced”. | Resolve in P2 / APP-G11 without renaming backend entities. |
| P0-17 | CONFLICT | Functional Quote Comparison mockup depicts an “Adjusted” result while certified Sprint 4 keeps `ADJUSTED_COMPARABLE` dormant. | Production UX must not activate adjusted ranking. |
| P0-18 | REQUIRES_DECISION | Exact production design tokens have not been approved. | P1 / APP-G2. |
| P0-19 | REQUIRES_DECISION | Final customer/admin route map and legacy-route migration/redirect approach are not frozen. | P2 / APP-G3-G4. |

## Blocking assessment

No P0 finding requires a certified-domain redesign. The gaps are application-preparation work and are expected inputs to P1–P5.

**P0 architectural blocker:** none identified.
