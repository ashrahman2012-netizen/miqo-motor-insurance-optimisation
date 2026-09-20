# MIQOS-APP-BUILD-001 / BUILD-001A — Acceptance Matrix

**Increment:** Foundation, App Shell & Shared Design System  
**Source:** APP-PREP certified head `a2c30840cfcc222727665ed806c89ecdabc6827c`

| Gate | Acceptance condition |
|---|---|
| AB-G0 | APP-PREP baseline preserved; existing target-stack journey remains green |
| AB-G1 | Shared AppShell/SidebarNavigation/TopNavigation/PageHeader/ContentGrid render in customer/admin apps |
| AB-G2 | Frozen dark tokens are runtime CSS variables and consumed by shell/components |
| AB-G3 | Customer/admin navigation models are distinct and route-aware |
| AB-G4 | ApplicationEnvironmentContext supports SYNTHETIC/CERTIFICATION/PRODUCTION; unknown fails closed |
| AB-G5 | Shared semantic components implement controlled status/comparison/integrity/governance/version/lineage semantics |
| AB-G6 | UI consumes P4 application contracts; no DB/provider-specific UI binding |
| AB-G7 | Shell transforms to accessible mobile navigation and responsive grids |
| AB-G8 | Skip link, visible focus, keyboard mobile nav, semantic status text and reduced motion baseline work |
| AB-G9 | Synthetic Customer Dashboard proving fixture renders without executing workflow logic |
| AB-G10 | UI typecheck/unit tests plus existing CI and target-stack Playwright are green |

BUILD-001A closes only when AB-G0 through AB-G10 PASS.


## Visual authority revision

This certified increment now inherits **MIQOS-DS-001 v1.1 — Visual Baseline Refinement**. The revision changes visual tokens and presentation semantics only; all previously certified behavioural gates remain unchanged. See `docs/application/app-build-001/visual-retrofit-register-v1.1.md`.
