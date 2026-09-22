# BUILD risk register

DB-G1 retains the complete inherited PREP risk snapshot recorded by DB-G0. Original PREP IDs/states remain governing history and must be consulted with the PREP risk register/DB-G0 acceptance; DB-G1 does not silently close them.

Key carried obligations remain R-G2-004 unsupported resources, R-G3-001/002 identity/platform security, R-G5-001/003 real-environment constraints, R-G6-001 observability extension, R-G4-001/R-G7-006/R-G7-010 production signing and R-G7-008 inherited dependency findings.

| ID | Risk | State | Control / target |
|---|---|---|---|
| R-DB-G0-001 | UX customer controls mistaken for Admin authority. | CONTROLLED / BASELINE CLOSED BY DB-G1 | complete screen/action matrix + frozen capability register |
| R-DB-G0-002 | Control scaffolding mistaken for later-gateway completion. | CONTROLLED | gateway-specific status; executable implementation still not started |
| R-DB-G0-003 | Local runtime differs from certified toolchain. | CONTROLLED | DB-G1 docs-only; repository CI remains regression authority |
| R-DB-G1-001 | Visual fidelity overrides certified authority semantics. | CONTROLLED | higher-priority PREP/BUILD controls; every demo action classified |
| R-DB-G1-002 | Dense tables/timelines harm keyboard/screen-reader/resize/text-scaling usability. | CONTROLLED / PROOF PENDING | accessibility baseline; prove DB-G2/DB-G10 |
| R-DB-G1-003 | Search UI implies unsupported global search. | CONTROLLED | local command/filter only; global search DEFERRED |
| R-DB-G1-004 | Dashboard visuals cause fabricated KPIs/counts/distributions. | CONTROLLED | authoritative/derivable evidence only |
| R-DB-G1-005 | Status colour becomes sole meaning carrier. | CONTROLLED | semantic text/icon/ARIA; colour supplementary |
| R-DB-G1-006 | Desktop-specific components fragment shared design system. | CONTROLLED | `@miqo/ui` authority; Desktop composes host-specific pages |
| R-DB-G1-007 | Raw provider evidence leaks through rich copy/export/cache/log patterns. | CONTROLLED / PROOF PENDING | sensitive read; no default payload export/cache/log; prove DB-G5/6/7 |
| R-DB-G1-008 | Visual nuance not captured by text freeze. | ACCEPTED / CONTROLLED | exact archive hash/member map retained outside repo; compare during implementation |
| R-DB-G1-009 | Catalogue entries mistaken for implemented runtime components. | CONTROLLED | inventory separates runtime exports from catalogue targets |
