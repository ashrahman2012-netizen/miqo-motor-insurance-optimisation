# Desktop capability register — DB-G1 frozen BUILD baseline

**Status:** FROZEN AT DB-G1  
**Authority:** inherited G2 boundary plus DB-G1 UX/action cross-check. This does not claim implementation completion.

| Area | DB-G1 classification | Authority / limit |
|---|---|---|
| Dashboard | DERIVED | approved evidence only; unsupported aggregates DEFERRED |
| Cases | READ-ONLY / global listing-search DEFERRED | exact profile/version inspection only |
| Optimisation | DEFERRED / TRACE-DERIVED | no objective/control mutation |
| Scenarios | DEFERRED / TRACE-DERIVED | no generation |
| Market Routes | DEFERRED / TRACE-DERIVED | no execution/provider activation |
| Quote Runs | DEFERRED global list / READ-ONLY trace | no execution/selection |
| Recommendation Sets | READ-ONLY / global list DEFERRED | no create/reorder/accept |
| Integrity | READ-ONLY / DERIVED | no evaluation/override |
| Discrepancies | READ-ONLY | no factual correction |
| Audit & Trace | READ-ONLY | raw evidence distinct and sensitive |
| Providers | RESERVED / STATUS-ONLY | no activation/deactivation |
| Certification | RESERVED / STATUS-ONLY | no inferred certification |
| System | IMPLEMENT | safe runtime/build/environment diagnostics; API build identity later CC-G6-001 |

## Approved initial resource basis

The DB-G1 baseline originally admitted the then-current read resources. DB-G7-R1 subsequently converged Admin evidence onto the authenticated canonical boundary, so the legacy `/admin/**` aliases and unauthenticated raw-response alias are no longer current authority.

### Current admitted Desktop read basis after DB-G8 closure

- `GET /health`;
- `GET /desktop-admin/session`;
- `GET /desktop-admin/profiles/:profileId`;
- `GET /desktop-admin/profile-versions/:versionId`;
- `GET /desktop-admin/audit?profileId=...`;
- `GET /desktop-admin/profiles/:profileId/discrepancies`;
- `GET /desktop-admin/selections/:selectionId/trace`;
- `GET /desktop-admin/selections/:selectionId/sp4-trace`;
- `GET /desktop-admin/quote-requests/:quoteRequestId/raw-response`.

DB-G8 admits no new backend resource. Provider and certification global/status resources remain absent and therefore DEFERRED rather than inferred.

## Action-level authority

| Action / affordance | Classification | Rule |
|---|---|---|
| route navigation | IMPLEMENT | presentation only |
| local filtering/sorting of loaded ViewModels | IMPLEMENT | no global search inference |
| top command/navigation affordance | IMPLEMENT local-only | global entity search DEFERRED |
| refresh approved read | READ-ONLY | safe/idempotent reads only |
| copy opaque technical ID/fingerprint | IMPLEMENT | no business-payload export |
| profile/version/audit/trace/discrepancy/normalised quote inspection | READ-ONLY | API authoritative |
| raw provider inspection | sensitive READ-ONLY | permission/access audit; no default persistence/log/export |
| integrity inspection | READ-ONLY / DERIVED | unknown/missing never PASS |
| objective/scenario/route/quote/recommendation display from trace | DERIVED | no local business conclusion |
| provider/certification status | DEFERRED / STATUS-ONLY WHEN AUTHORITATIVE RESOURCE EXISTS | supplied authoritative status only; no inference from TEST/SYNTHETIC engineering evidence |
| system diagnostics | IMPLEMENT | safe non-secret runtime data |
| profile edit, discrepancy update, lock, correction draft | PROHIBITED | no Admin factual mutation |
| objective change / optimisation controls / scenario generation | PROHIBITED | inspect only |
| quote execution/selection/customer comparison action | PROHIBITED | inspect only |
| recommendation create/reorder/accept | PROHIBITED | domain authority |
| customer handoff / Go to Insurer | PROHIBITED | customer application responsibility |
| Send customer summary | PROHIBITED unless separately designed/authorised | no command/audit/permission contract |
| ranking/comparison/integrity override | PROHIBITED | certified authority only |
| audit mutation/deletion | PROHIBITED | append-only |
| provider activation/deactivation | PROHIBITED / DEFERRED | separate activation authority |
| direct PostgreSQL / `@miqo/db` | PROHIBITED | service/API boundary only |
| generic native HTTP or shell/filesystem bridge | PROHIBITED | least-privilege native boundary |
| remote executable UI | PROHIBITED | packaged local content only |

Every material interactive customer action visible in the seven-screen demo is now explicitly excluded or deferred unless already authorised as read/local presentation behaviour.

## New-consumption admission

Before any new resource is used, record resource, method, owner, read/mutation class, authentication, permission, audit requirement, retry/idempotency, ViewModel mapping and failure mapping. Endpoint reachability is not authorisation.

Preserve success → authoritative content; absence → EMPTY/not-found; 409 → BLOCKED; 422 → BLOCKED with reason; unknown environment → NOT_AUTHORISED; network/server failure → ERROR; partial → PARTIAL. Never upgrade missing/blocked/excluded/non-comparable evidence to a favourable state.


## DB-G8 as-built capability closure

**Accepted executable source:** `7e11769cf78c0d3e70082226d231316cee1b765c`

| Area | DB-G8 final state | Executable disposition |
|---|---|---|
| Dashboard | IMPLEMENTED / DERIVED | authoritative environment/build and representative read evidence only; no fabricated KPI |
| Cases | READ_ONLY | exact Profile ID navigation; global case listing/search remains DEFERRED |
| Optimisation | TRACE_DERIVED | exact Selection ID opens persisted objective/optimisation lineage; no mutation |
| Scenarios | TRACE_DERIVED | exact Selection ID exposes persisted scenarios/O-class deltas; no generation |
| Market Routes | TRACE_DERIVED | exact Selection ID exposes persisted route/provider/channel lineage; no route execution |
| Quote Runs | READ_ONLY / TRACE_DERIVED | exact Selection trace only; no global list or execution |
| Recommendation Sets | READ_ONLY / TRACE_DERIVED | persisted recommendation/explanation evidence only; no create/reorder/accept |
| Integrity | READ_ONLY / TRACE_DERIVED | persisted integrity evidence only; no evaluation/override |
| Discrepancies | READ_ONLY | exact Profile ID; no correction/resolution action |
| Audit & Trace | READ_ONLY | exact Profile ID audit plus exact Selection lineage |
| Providers | **DEFERRED** | no authoritative global provider-status resource; trace-linked provider identity remains inspectable |
| Certification | **DEFERRED** | no authoritative certification artefact/resource; TEST/SYNTHETIC engineering proof is not certification |
| System | IMPLEMENTED | safe runtime/API/correlation/support metadata only |

No canonical navigation route remains in `RESERVED` state. Missing authority is represented explicitly as DEFERRED rather than simulated.

## DB-G8 native capability closure

The active Windows `admin-read` capability exposes exactly eleven commands, each matched to a concrete implemented native command:

`get_runtime_profile`, `get_health`, `get_auth_session`, `begin_authentication`, `logout`, `load_admin_profile`, `load_admin_profile_version`, `load_admin_profile_audit`, `load_admin_selection_trace`, `get_diagnostics`, `create_support_snapshot`.

No generic HTTP plugin, shell, broad filesystem, direct database or speculative provider/certification command is admitted.
