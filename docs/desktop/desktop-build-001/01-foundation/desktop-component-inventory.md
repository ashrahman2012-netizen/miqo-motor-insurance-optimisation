# Desktop component inventory — DB-G1 freeze

**Status:** FROZEN FOR DB-G2 IMPLEMENTATION PLANNING  
**Ownership:** `@miqo/ui` remains shared host-neutral presentation authority; Desktop page composition belongs in `apps/admin-desktop`; Tauri/network concerns never enter shared UI.

## Confirmed runtime exports

`AppShell`, `SidebarNavigation`, `TopNavigation`, `PageHeader`, `ContentGrid`, `SectionHeading`, `DefinitionList`, `Button`, `TextLink`, `Card`, `Panel`, `PageState`, `ApplicationEnvironmentProvider`, `EnvironmentBadge`, `EnvironmentBanner`, `StatusBadge`, `IntegrityBadge`, `ComparisonStateBadge`, `GovernanceBadge`, `VersionBadge`, `LineageId`, `FingerprintValue`, `MoneyAmount`, `EnvironmentSummary`.

The frozen component catalogue additionally names desired patterns such as fields, `DataTable`, `JourneyStepper`, `LineageExplorer`, `AuditTimeline`, `ArtefactInspector`, `RawNormalisedViewer` and `IntegrityQueue`. Catalogue presence is not treated as proof of runtime implementation.

| Pattern | DB-G1 class | Current basis | Target owner | Key requirement | Priority |
|---|---|---|---|---|---|
| App shell/navigation | REUSE SHARED | implemented | `@miqo/ui` + Desktop composition | skip link/responsive nav/environment | DB-G2 P0 |
| Page header/cards/panels/grids/definition list | REUSE SHARED | implemented | `@miqo/ui` | semantic regions/headings | DB-G2 P0 |
| Page states | REUSE SHARED | implemented | `@miqo/ui` | LOADING/EMPTY/ERROR/BLOCKED/NOT_AUTHORISED | DB-G2 P0 |
| Status/integrity/comparison/governance badges | REUSE SHARED | implemented | `@miqo/ui` | text + semantic tone, not colour-only | DB-G2 P0 |
| Version/lineage/fingerprint/money | REUSE SHARED | implemented | `@miqo/ui` | technical fidelity | DB-G2 P0/P1 |
| Command bar | DESKTOP COMPOSITION | no runtime export | `apps/admin-desktop` initially | local command/navigation only | DB-G2 P1 |
| Text/select fields | NEW SHARED CANDIDATE or Desktop composition | catalogue target only | prefer shared if host-neutral | labels/errors/focus | DB-G2/4 |
| Filter bar | DESKTOP COMPOSITION | no export | route composition | safe read/local filters | DB-G4 |
| Data table | NEW SHARED CANDIDATE | catalogue target | shared if host-neutral | semantic table/material dimensions | DB-G4 |
| Dense evidence table | DESKTOP COMPOSITION | primitives + future table | Desktop | preserve technical dimensions | DB-G4/5 |
| Timeline | NEW SHARED CANDIDATE / L3 Admin | catalogue | shared if presentation-only | ordered chronology | DB-G5 |
| Lineage explorer | NEW SHARED CANDIDATE / L3 Admin | catalogue | shared if presentation-only | keyboard selectable; IDs exact | DB-G5 |
| Evidence/detail/governance panels | DESKTOP COMPOSITION | Card/Panel/DefinitionList/badges | Desktop | no independent evaluation | DB-G4/5 |
| Artefact inspector | NEW SHARED CANDIDATE / L3 Admin | catalogue | shared if host-neutral | selected artefact semantics | DB-G5 |
| Discrepancy/integrity queue | NEW SHARED CANDIDATE | catalogue + badges | shared presentation only | exact state/reason | DB-G4/5 |
| Raw/normalised viewer | NEW SHARED CANDIDATE / L3 Admin | catalogue | shared presentation shell; data policy in Desktop | sensitive; no default export/cache/log | DB-G5 |
| Dialog/modal | NOT REQUIRED initially | catalogue | defer | no mutation workflow authorised | later |
| Toast/notification | NOT REQUIRED initially | no runtime export | defer | non-authoritative feedback only | later |

## Direction

1. Existing `@miqo/ui` v1.1 tokens/semantic mappings remain visual authority.
2. Desktop composes shared primitives into Admin-specific pages.
3. Add a shared component only when host-neutral, presentation-only and genuinely reusable.
4. Fetching, persistence, token handling, native invocation and business-rule logic stay outside `@miqo/ui`.
5. Deep L3 Admin catalogue patterns are primarily DB-G4/DB-G5 work, not forced into DB-G2.

## DB-G2 minimum set

Implement shell/routing/environment, page headers, cards/panels/grids/definition lists, semantic badges, page-state/error containment, local-only command/navigation affordance and honest route skeletons. Deep trace/viewer components remain later-gateway work.
