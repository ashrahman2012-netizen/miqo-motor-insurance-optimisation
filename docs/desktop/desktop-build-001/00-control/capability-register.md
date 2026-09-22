# Initial Desktop capability register

Status: INITIAL G2 INHERITANCE — DB-G0 only. These are authority classifications, not implementation/completion claims. DB-G1 must later freeze the route/action acceptance baseline.

Sources: [capability boundary](../../desktop-prep-001/02-boundary/capability-boundary.md), [interface contract](../../desktop-prep-001/02-boundary/interface-contract.md), [mutation matrix](../../desktop-prep-001/02-boundary/mutation-authority.md).

## Canonical areas

| Area | Initial classification | Evidence / limit |
|---|---|---|
| Dashboard | DERIVED FROM AUTHORITATIVE EVIDENCE | Available approved evidence only; aggregate counts/KPIs/list resources absent from G2 remain DEFERRED. |
| Cases | READ-ONLY | Exact profile/version inspection; global search/listing DEFERRED without an approved resource. |
| Optimisation | DEFERRED | G2 catalogue READ CANDIDATE; existing selection trace may only present already-authorised evidence. No choice/save/compute authority. |
| Scenarios | DEFERRED | G2 READ CANDIDATE; trace evidence may be inspected. No generation or new list resource. |
| Market Routes | DEFERRED | G2 READ CANDIDATE; trace evidence only where supplied. No execution/activation. |
| Quote Runs | DEFERRED | G2 READ CANDIDATE; approved raw/normalised trace evidence remains READ-ONLY. No quote execution. |
| Recommendation Sets | READ-ONLY | Authoritative selection/recommendation lineage; no recomputation, acceptance, reordering or unsupported global listing. |
| Integrity | READ-ONLY | Authoritative result/trace only; no decision/override. |
| Discrepancies | READ-ONLY | Approved profile discrepancy resource; no factual correction. |
| Audit & Trace | READ-ONLY | Approved audit and selection/SP4 trace; raw response remains distinct from normalised quote. |
| Providers | RESERVED / STATUS-ONLY | G2 reserved; display only authoritative available evidence. No activation/deactivation. |
| Certification | RESERVED / STATUS-ONLY | G2 reserved; no invented certification or production claim. |
| System | IMPLEMENT | G2-authorised environment/build/runtime diagnostics, subject to G5/G6. New API build metadata remains CC-G6-001. |

## Cross-cutting actions and evidence

| Capability | Classification | Limit |
|---|---|---|
| Shell/navigation, local route/filter/highlight state, open/copy opaque IDs | IMPLEMENT | Presentation-only; native privilege remains separately constrained. |
| Local ViewModel search/filter | IMPLEMENT | Operates on available API evidence; no invented backend search. |
| Refresh approved evidence | READ-ONLY | Safe/idempotent reads only; preserve failures. |
| Profile/version, audit, selection lineage, normalised quote, discrepancies, integrity inspection | READ-ONLY | API/domain owns all truth. |
| Raw provider response inspection | READ-ONLY | Admin-only higher-sensitivity permission; no default local export/cache/logging. |
| Trace-derived presentation | DERIVED FROM AUTHORITATIVE EVIDENCE | Composition only; no new business conclusions or new endpoint authority. |
| Create/edit/lock profile; correction drafts; objective/optimisation selection; scenario generation; quote execution/selection; recommendation acceptance; customer handoff/purchase | PROHIBITED | Not authorised as Desktop Admin under frozen G2; future command requires separate admission. |
| Locked-fact modification; eligibility/comparison/ranking/recommendation/integrity override; audit mutation/deletion | PROHIBITED | Certified domain invariants. |
| Direct PostgreSQL or @miqo/db; local business-rule execution | PROHIBITED | Remote API/domain authority. |
| Provider activation or live quotation | PROHIBITED | No authority from local flags, reachable endpoints or demo. |
| Generic HTTP proxy, shell/filesystem bridge, remote executable UI | PROHIBITED | Default-deny native security boundary. |

## Initial resource allow-list basis

All are GET/read-only; no new resource is introduced by this register.

| Resource | Authoritative owner / evidence |
|---|---|
| /health | API runtime/environment preflight |
| /admin/profiles/:profileId | Profile/audit/discrepancy services |
| /admin/profile-versions/:versionId | Profile service |
| /admin/audit?profileId=... | Append-only audit |
| /admin/selections/:selectionId/trace | Selection trace service |
| /admin/selections/:selectionId/sp4-trace | SP4 trace service |
| /quote-requests/:quoteRequestId/raw-response | Provider-response evidence; sensitive Admin read |
| /profiles/:profileId/discrepancies | Discrepancy evidence |

The last two non-admin-prefixed endpoints are permitted only for read-only evidence composition. Shared adapters map DTOs to ViewModels; they do not fetch, persist or authorise. Server permission/access-audit implementation remains CC-G3-001; this is not a claim of production security completion.

Preserve success → authoritative content; 404/absence → EMPTY/not-found; 409 → BLOCKED; 422 → BLOCKED with reason; unknown environment → NOT_AUTHORISED/fail closed; network/server failure → ERROR; partial → PARTIAL. Never turn missing evidence into zero/success/PASS.

New consumption must record resource, method, owner, read/mutation class, authentication, permission, audit, safe retry/idempotency, ViewModel and failure mappings before use.
