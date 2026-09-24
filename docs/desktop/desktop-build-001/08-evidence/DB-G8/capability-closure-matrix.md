# DB-G8 capability closure matrix

**Accepted executable source:** `7e11769cf78c0d3e70082226d231316cee1b765c`

| Area | Frozen authority | DB-G8 final state | Evidence / limit |
|---|---|---|---|
| Dashboard | DERIVED | IMPLEMENTED / DERIVED | approved runtime/environment/build and representative safe-read evidence only |
| Cases | READ_ONLY; global list/search deferred | READ_ONLY | exact Profile ID only |
| Optimisation | TRACE_DERIVED | TRACE_DERIVED | exact Selection ID; objective/control mutation prohibited |
| Scenarios | TRACE_DERIVED | TRACE_DERIVED | persisted scenarios/O-class deltas; generation prohibited |
| Market Routes | TRACE_DERIVED | TRACE_DERIVED | persisted route/provider/channel evidence; execution/activation prohibited |
| Quote Runs | read-only trace; global list deferred | READ_ONLY / TRACE_DERIVED | exact Selection lineage; execution/selection prohibited |
| Recommendation Sets | READ_ONLY | READ_ONLY / TRACE_DERIVED | persisted recommendation and explanation; create/reorder/accept prohibited |
| Integrity | READ_ONLY / DERIVED | READ_ONLY / TRACE_DERIVED | persisted result only; evaluate/override prohibited |
| Discrepancies | READ_ONLY | READ_ONLY | exact Profile ID; correction/resolution prohibited |
| Audit & Trace | READ_ONLY | READ_ONLY | exact Profile audit plus exact Selection lineage |
| Providers | STATUS_ONLY if authority exists | **DEFERRED** | no global provider-status authority; trace-linked identity is not global status |
| Certification | STATUS_ONLY if authority exists | **DEFERRED** | no certification authority/resource; engineering proof is not certification |
| System | IMPLEMENT | IMPLEMENTED | safe diagnostics/runtime/support metadata only |

## Closure rule

Every canonical navigation route is now one of IMPLEMENT, READ_ONLY, TRACE_DERIVED or DEFERRED. No canonical route remains RESERVED or a generic downstream “foundation route ready” placeholder.

DB-G8 does not convert any deferred action into business authority.
