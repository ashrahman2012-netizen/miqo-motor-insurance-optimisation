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

## DB-G3 decisions

| ID | Decision | Authority / evidence |
|---|---|---|
| D-DB-G3-001 | Replace private free-form path transport calls with typed native read operations for the currently consumed approved routes. | PREP G3 native transport boundary |
| D-DB-G3-002 | Keep current package strictly TEST/SYNTHETIC and reject stage/environment/API/identity drift. | PREP G5 + CC-G5-001 |
| D-DB-G3-003 | Reject all non-empty feature maps in the current package; no flag may activate authority. | PREP feature-flag contract |
| D-DB-G3-004 | Preserve native-only API connectivity with no renderer CORS expansion or generic HTTP command. | PREP G2/G3 network boundary |
| D-DB-G3-005 | Rename active capability identity from proof-era scaffold to `admin-read` without broadening command permissions. | least-privilege Tauri boundary |
| D-DB-G3-006 | Correct Dashboard environment presentation so unresolved runtime identity is NOT_AUTHORISED rather than statically labelled SYNTHETIC. | G5 fail-closed visible identity |
| D-DB-G3-007 | Real OIDC/token broker and non-synthetic environment activation remain deferred to DB-G7/CC-G3-001 and CC-G5-001. | gateway separation |
| D-DB-G3-008 | Update the installed-proof harness to follow and positively assert the renamed `admin-read` capability, while also asserting the legacy scaffold capability is absent. | G8 failure evidence + least-privilege proof continuity |


## DB-G4 decisions

| ID | Decision | Authority / evidence |
|---|---|---|
| D-DB-G4-001 | Use existing `/admin/profiles/:profileId` and `/admin/profile-versions/:versionId` resources; add no API endpoint. | frozen G2 interface contract + current Fastify API |
| D-DB-G4-002 | Expand native `admin-read` allow-list by exactly two typed reads for Admin Profile and Admin Profile Version. | DB-G3 platform contract + DB-G4 scope |
| D-DB-G4-003 | Reuse profile adapter only for passive mapping; strip `editable`, lock action and discrepancy resolution actions at Desktop service boundary. | DB-G1 capability freeze |
| D-DB-G4-004 | Cases provides exact-ID navigation only; global case/entity list/search remains DEFERRED. | D-DB-G1-009 |
| D-DB-G4-005 | Audit & Trace at DB-G4 presents profile lifecycle audit only; end-to-end selection/quote/recommendation lineage remains DB-G5. | gateway separation |
| D-DB-G4-006 | Current-version discrepancy resource is read-only; Desktop presents no correction/resolution control. | G2 mutation matrix |
