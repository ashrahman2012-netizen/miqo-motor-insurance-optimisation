# BUILD decision log

## DB-G0 decisions

| ID | Decision | Authority / evidence |
|---|---|---|
| D-DB-G0-001 | Create BUILD directly from exact G9 closeout in a separate worktree. | DB-G0 entry evidence. |
| D-DB-G0-002 | Limit DB-G0 to documentation/control paths. | DB-G0 execution block. |
| D-DB-G0-003 | Inherit certified PREP controls and ADR-001 through ADR-005 unchanged. | PREP G9 controls. |
| D-DB-G0-004 | Record UX identity only; adoption/IA/components await DB-G1. | Handover. |
| D-DB-G0-005 | Keep G2 read candidates DEFERRED pending contract assessment. | PREP G2. |
| D-DB-G0-006 | Carry PREP risks/dependencies/change controls. | PREP registers. |
| D-DB-G0-007 | Use docs/provenance/boundary validation and repository CI. | DB-G0 scope. |
| D-DB-G0-008 | Active gateway block outranks broader route context. | Handover. |

## DB-G1 decisions

| ID | Decision | Authority / evidence |
|---|---|---|
| D-DB-G1-001 | Verified seven-screen demo is primary visual/interaction reference, not functional authority. | direct archive/image inspection + PREP controls |
| D-DB-G1-002 | Foundation/App Shell sheet is primary visual-system reference, implemented through `@miqo/ui` v1.1. | demo screen 7 + UI tokens/exports |
| D-DB-G1-003 | Audit & Trace Console is primary Admin operational UX reference. | demo screen 6 + G2 read boundary |
| D-DB-G1-004 | Customer mutation/selection/handoff controls shown in demo are excluded from Desktop Admin. | G2 mutation matrix |
| D-DB-G1-005 | Canonical Desktop Admin route/navigation baseline is frozen by the DB-G1 IA; route existence is not authority. | G2 + DB-G1 cross-check |
| D-DB-G1-006 | Deferred/reserved routes may exist only with honest capability states and no fabricated data. | R-G2-004 / interface contract |
| D-DB-G1-007 | `@miqo/ui` remains shared host-neutral semantic design-system authority; Desktop owns page composition/orchestration. | target architecture/UI ownership |
| D-DB-G1-008 | Dense evidence UX must preserve semantic status, material dimensions and accessibility. | UX-D invariants/accessibility baseline |
| D-DB-G1-009 | Demo search becomes local navigation/command or loaded-ViewModel filter only; global search is DEFERRED. | no approved global search resource |
| D-DB-G1-010 | DB-G2 priority is shell/routing/shared primitives/page states; deep trace/viewer components are DB-G4/G5. | component inventory/gateway sequence |

## DB-G2 decisions

| ID | Decision | Authority / evidence |
|---|---|---|
| D-DB-G2-001 | Replace proof-only React entry with the real DesktopApp while preserving the G8 native proof contract. | DB-G2 scope + installed proof |
| D-DB-G2-002 | Implement routing with browser history and internal-link interception; add no router dependency. | package/dependency freeze |
| D-DB-G2-003 | Keep command/search local to navigation/loaded presentation state; no global business-data search. | DB-G1 D-DB-G1-009 |
| D-DB-G2-004 | Expose all canonical top-level routes with honest READ-ONLY/TRACE-DERIVED/RESERVED states rather than fake records. | DB-G1 IA/capability freeze |
| D-DB-G2-005 | Retain the representative `PRO-SYN-001` audit read only as inherited executable proof on Dashboard, not product case-list authority. | G8 regression requirement |
| D-DB-G2-006 | Leave Tauri transport/capability source untouched; transport expansion/hardening belongs to DB-G3. | gateway separation |
| D-DB-G2-007 | Treat Windows PR artifacts as synthetic-merge evidence paired with exact head/base provenance, not exact branch-SHA packages. | GitHub PR checkout provenance |

No DB-G2 decision changes domain methodology, mutation authority, security identity model or environment authority.
