# DB-G1 shared UI inventory evidence

Inspected `packages/ui` README, runtime exports/implementation files, component catalogue, v1.1 design tokens/semantic mappings, and existing Admin/Desktop usage.

## Confirmed runtime exports

`AppShell`, `SidebarNavigation`, `TopNavigation`, `PageHeader`, `ContentGrid`, `SectionHeading`, `DefinitionList`, `Button`, `TextLink`, `Card`, `Panel`, `PageState`, environment provider/banner/badge, status/integrity/comparison/governance badges, `VersionBadge`, `LineageId`, `FingerprintValue`, `MoneyAmount`, `EnvironmentSummary`.

## Catalogue targets not assumed implemented

`IconButton`, fields, `DataTable`, `Tabs`, `JourneyStepper`, `LineageExplorer`, `AuditTimeline`, `ArtefactInspector`, `RawNormalisedViewer`, `IntegrityQueue` and others are catalogue targets; DB-G1 does not treat catalogue presence as runtime code.

## Token/semantic authority

The v1.1 token file is frozen for application build and aligns to the demo: navy surfaces, blue interaction, green success, amber attention, red danger, purple specialised/system semantics. Semantic mappings explicitly prevent generic integrity signals becoming success-green unless evaluated successfully.

## Ownership conclusion

Reuse host-neutral `@miqo/ui` components; extend shared UI only for genuinely host-neutral presentation; keep route/page composition in `apps/admin-desktop`; keep fetching/persistence/native/authn/business logic outside shared UI; implement deeper Admin L3 patterns primarily in DB-G4/DB-G5.
