# Desktop UX adoption matrix — DB-G1

**Status:** FROZEN FOR DB-G2+  
**Principle:** design reference may be adopted; functional authority must already exist independently.

| Reference | Pattern / element | Decision | Desktop target | Authority class | Component direction | Control note |
|---|---|---|---|---|---|---|
| Foundation | dark shell / left rail | ADOPT | global shell | IMPLEMENT | reuse `AppShell`/navigation | preserve keyboard/focus/environment behaviour |
| Foundation | environment badge/banner | ADOPT | global shell | IMPLEMENT | reuse shared | environment remains runtime/server-authoritative |
| Foundation | cards/panels | ADOPT | all routes | IMPLEMENT | reuse shared primitives | semantic headings/regions |
| Foundation | status badges | ADOPT | all routes | DERIVED | reuse semantic badges | never colour-only |
| Foundation | top search/command field | ADAPT | global shell | local-only IMPLEMENT / global search DEFERRED | Desktop `CommandBar` composition | no unsupported global search implication |
| Foundation | inputs/selects/tables | ADAPT | filters/evidence | local/read filters | shared extension candidates | labels/focus/table semantics required |
| Dashboard | status summary cards | ADAPT | `/` | DERIVED | Admin summary composition | authoritative values only |
| Dashboard | quote distribution / KPIs | EXCLUDE until evidence exists | `/` | DEFERRED | none | no fabricated aggregates |
| Dashboard | customer journey/quick actions | EXCLUDE as customer workflow | — | PROHIBITED | none | navigation does not create command authority |
| Dashboard | surfaced result | ADAPT | dashboard/recommendations | DERIVED | evidence card | supplied evidence only |
| Profile | profile summary / validation / version | ADAPT | profile routes | READ-ONLY | shared lists/cards + Desktop composition | exact version/state labels |
| Profile | discrepancy choices / edit / lock | EXCLUDE | — | PROHIBITED | none | no factual mutation/lock |
| Scenarios | objective/scenario evidence | ADAPT | optimisation/scenarios | TRACE-DERIVED / DEFERRED lists | evidence cards/table | no selectable objective |
| Scenarios | optimisation controls / Generate Scenarios | EXCLUDE interactive behaviour | — | PROHIBITED | none | inspect only |
| Scenarios | rejected combinations/provenance | ADOPT/ADAPT | scenarios/trace | DERIVED | rejection list/provenance panel | preserve authoritative reasons |
| Quotes | filters/sort | ADAPT | quote evidence | local filter / DEFERRED resource | evidence filter bar | no backend query implied |
| Quotes | comparison table | ADOPT/ADAPT | quote runs/trace | READ-ONLY / DERIVED | quote evidence table | retain premium/finance/excess dimensions |
| Quotes | ranking/top result | ADAPT | recommendation evidence | DERIVED | surfaced-result panel | never computed in Desktop |
| Quotes | compare checkboxes / quote selection | EXCLUDE customer semantics | — | PROHIBITED | none | no selection authority |
| Quotes | excluded quotes | ADOPT | quote evidence | DERIVED | excluded evidence list | authoritative reason required |
| Recommendation | result hero / why surfaced / objective / independence | ADOPT/ADAPT | recommendations/trace | READ-ONLY / DERIVED | evidence compositions | no frontend explanation generation |
| Recommendation | alternatives / integrity | ADAPT | recommendations/integrity | READ-ONLY / DERIVED | table + integrity panel | unknown/missing never PASS |
| Recommendation | Go to Insurer / Send Summary | EXCLUDE | — | PROHIBITED | none | no Admin purchase/handoff/customer-send authority |
| Audit | filter bar | ADOPT/ADAPT | `/admin/audit` | local/read filter | `AuditFilterBar` composition | safe reads/local state only |
| Audit | lineage explorer | ADOPT | trace | DERIVED | catalogue L3 candidate | keyboard-selectable if interactive |
| Audit | event timeline | ADOPT | audit/trace | READ-ONLY | catalogue L3 candidate | ordered chronology semantics |
| Audit | current artefact | ADOPT | audit/trace | READ-ONLY | artefact inspector candidate | copy opaque IDs only |
| Audit | governance/compliance | ADAPT | audit/system | DERIVED | shared badges + composition | no unsupported compliance claim |
| Audit | discrepancy queue | ADAPT | discrepancies/trace | READ-ONLY / DERIVED | queue candidate | exact state/reason |
| Audit | raw/normalised viewer | ADOPT | trace | sensitive READ-ONLY | catalogue viewer candidate | permissioned; no default export/cache/log |

Every material active action visible in the demo now has an explicit disposition. No customer mutation/business action is imported by visual adoption.
