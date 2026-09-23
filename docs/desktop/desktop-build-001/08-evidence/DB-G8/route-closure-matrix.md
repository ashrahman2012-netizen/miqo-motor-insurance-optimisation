# DB-G8 route closure matrix

| Route | Route model | Rendered closure | Backend/resource basis | Prohibited implication |
|---|---|---|---|---|
| `/` | IMPLEMENT | DashboardRoute | health/runtime + representative protected audit read | no global KPI/customer action |
| `/admin/cases` | READ_ONLY | CasesRoute | exact Profile ID navigation | no global list/search |
| `/admin/optimisation` | TRACE_DERIVED | DecisionEvidenceEntryRoute | exact Selection trace | no objective/control mutation |
| `/admin/scenarios` | TRACE_DERIVED | DecisionEvidenceEntryRoute | exact Selection trace | no generation |
| `/admin/market-routes` | TRACE_DERIVED | DecisionEvidenceEntryRoute | exact Selection trace | no route execution/provider activation |
| `/admin/quote-runs` | READ_ONLY | DecisionEvidenceEntryRoute | exact Selection trace | no global run list/execution |
| `/admin/recommendations` | READ_ONLY | DecisionEvidenceEntryRoute | exact Selection trace | no create/reorder/accept |
| `/admin/integrity` | READ_ONLY | DecisionEvidenceEntryRoute | exact Selection trace | no evaluation/override |
| `/admin/discrepancies` | READ_ONLY | DiscrepanciesRoute | exact protected profile evidence | no correction/resolution |
| `/admin/audit` | READ_ONLY | AuditRoute | protected profile audit / Selection trace | no audit mutation |
| `/admin/providers` | **DEFERRED** | ProvidersRoute | no global status resource; optional exact Selection navigation | no health/live/activation/certification inference |
| `/admin/certification` | **DEFERRED** | CertificationRoute | packaged runtime identity only; no certification resource | no production/provider/regulatory certification claim |
| `/admin/system` | IMPLEMENT | SystemRoute | native diagnostics/support metadata | no secret/business payload export |
| `/admin/profiles/:id` | READ_ONLY | ProfileEvidenceRoute | protected exact-profile resource | no mutation |
| `/admin/profile-versions/:id` | READ_ONLY | ProfileVersionRoute | protected exact-version resource | no mutation |
| `/admin/selections/:id/trace` | READ_ONLY | DecisionTraceRoute | protected v1/SP4/raw evidence composition | no Desktop computation |

Unknown routes remain NOT_FOUND.
