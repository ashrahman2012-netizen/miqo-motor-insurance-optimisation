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

`GET /health`; `GET /admin/profiles/:profileId`; `GET /admin/profile-versions/:versionId`; `GET /admin/audit?profileId=...`; `GET /admin/selections/:selectionId/trace`; `GET /admin/selections/:selectionId/sp4-trace`; `GET /quote-requests/:quoteRequestId/raw-response`; `GET /profiles/:profileId/discrepancies`.

The two non-admin-prefixed resources remain authorised only for read-only evidence composition.

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
| provider/certification status | RESERVED / STATUS-ONLY | supplied status only |
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
