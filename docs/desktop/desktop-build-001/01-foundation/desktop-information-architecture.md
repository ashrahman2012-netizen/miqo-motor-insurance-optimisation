# MIQOS Desktop Admin information architecture — DB-G1 freeze

**Status:** FROZEN FOR DB-G2 SHELL IMPLEMENTATION  
**Rule:** route existence is navigation/presentation only; it does not create backend or mutation authority.

| Area | Route baseline | Capability | Current authority/data basis | DB-G2 shell | Prohibited / deferred behaviour |
|---|---|---|---|---|---|
| Dashboard | `/` | DERIVED | approved evidence actually loaded | expose | no invented counts/distributions/customer actions |
| Cases | `/admin/cases` | READ-ONLY shell; global list/search DEFERRED | exact profile/version resources, no global case resource | expose honest deferred/listless state | no fabricated list/search |
| Profile | `/admin/profiles/:profileId` | READ-ONLY | `/admin/profiles/:profileId` | when ID known | no edit/lock/correction |
| Profile version | `/admin/profile-versions/:versionId` | READ-ONLY | `/admin/profile-versions/:versionId` | when ID known | no mutation |
| Optimisation | `/admin/optimisation` | DEFERRED / trace-derived | G2 read candidate + trace evidence | expose honest state | no objective/control mutation |
| Scenarios | `/admin/scenarios` | DEFERRED / trace-derived | G2 read candidate + trace evidence | expose honest state | no generation |
| Market Routes | `/admin/market-routes` | DEFERRED / trace-derived | trace evidence | expose honest state | no execution/provider activation |
| Quote Runs | `/admin/quote-runs` | DEFERRED global list / trace READ-ONLY | raw/normalised evidence through trace composition | expose honest state | no quote execution/selection |
| Recommendation Sets | `/admin/recommendations` | READ-ONLY / global list DEFERRED | selection/SP4 trace | expose | no create/reorder/accept |
| Integrity | `/admin/integrity` | READ-ONLY / trace-derived | supplied integrity evidence | expose | no override/local evaluation |
| Discrepancies | `/admin/discrepancies` | READ-ONLY / per-profile basis | `/profiles/:profileId/discrepancies` | expose | no correction |
| Audit & Trace | `/admin/audit` | READ-ONLY | audit + trace resources | expose; primary operational route | no audit mutation |
| Selection trace | `/admin/selections/:selectionId/trace` | READ-ONLY | selection trace resource | when ID known | no recomputation |
| Providers | `/admin/providers` | RESERVED / STATUS-ONLY | supplied authoritative evidence only | expose reserved state | no activation/deactivation |
| Certification | `/admin/certification` | RESERVED / STATUS-ONLY | supplied certification/environment evidence | expose reserved state | no invented certification/live claim |
| System | `/admin/system` | IMPLEMENT | Desktop runtime + G5/G6 safe diagnostics | expose | no environment editing/secret display |

## Shell-owned state

Desktop may own current route, navigation expansion, local page filters/search values, selected row/artefact/highlight, safe sort/presentation preferences and ephemeral diagnostic UI state. These never become authoritative case/profile/scenario/quotation/recommendation/integrity state.

## Command/search boundary

The demo command bar is frozen as local shell/navigation command plus local filtering of already-loaded ViewModels only. Global cross-entity search is `DEFERRED`. DB-G2 must not use wording that implies global case/scenario/entity search unless an authorised contract later exists.

## Deferred routes

A canonical route may exist before a dedicated resource so navigation stays stable, but it must explicitly say whether evidence is trace-context-only, global listing/search is unavailable, or capability is reserved. Do not populate fake business records.

## Failure semantics

Preserve success → authoritative content; 404/absence → EMPTY/not found; 409 → BLOCKED; 422 → BLOCKED with reason; unknown environment → NOT_AUTHORISED; network/server failure → ERROR; partial evidence → PARTIAL. Missing evidence never becomes zero, success, comparable, eligible or PASS.
