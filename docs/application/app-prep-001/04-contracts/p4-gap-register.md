# MIQOS-APP-PREP-001 — P4 Gap Register

**Phase:** P4 — ViewModel/API Contract

| ID | Classification | Finding | Treatment |
|---|---|---|---|
| P4-01 | PASS | Shared contract location frozen as `@miqo/application-contracts`. | BUILD consumes type-only contracts. |
| P4-02 | PASS | Customer/admin ViewModel surface frozen. | Preserve. |
| P4-03 | PASS | Money remains integer pence and premium/finance/excess remain separate. | Preserve. |
| P4-04 | PASS | Authoritative ranking/eligibility/integrity/action state made explicit in VMs. | UI does not recalculate. |
| P4-05 | PASS | API → VM mapping rules frozen without requiring API redesign. | Implement adapters in BUILD. |
| P4-06 | PASS | Route/state guard matrix frozen and explicitly non-authoritative. | API remains enforcement boundary. |
| P4-07 | PASS | Synthetic contract fixtures cover core success/mixed/blocked/admin states. | P5 test plan consumes. |
| P4-08 | PASS | Customer result terminology preserves source RecommendationSet provenance. | Preserve. |
| P4-09 | PARTIAL | Current APIs do not expose a single aggregated Dashboard ViewModel endpoint. | BUILD may compose existing endpoints; do not add endpoint without need. |
| P4-10 | PARTIAL | Some future IA areas (documents/support/settings) lack backend contracts. | P5 scope them as shell/content-only or defer; do not fake data. |
| P4-11 | PARTIAL | Authentication/RBAC contract remains outside current certified scope. | Keep action authority explicit; do not invent permissions. |
| P4-12 | REQUIRES_DECISION | Exact adapter implementation location inside customer/admin/shared application layer is a BUILD/P5 decision. | Freeze in build plan. |

**P4 architectural blocker:** none identified.
