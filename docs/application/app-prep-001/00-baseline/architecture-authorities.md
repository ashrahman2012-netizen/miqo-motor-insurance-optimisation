# MIQOS-APP-PREP-001 — Architecture Authorities

**Phase:** P0  
**Gate:** APP-G0

This register identifies the current code authority for application-facing MIQOS behaviour. UI work must consume these boundaries rather than redefine them.

| Capability | Current authority | Application implication |
|---|---|---|
| F/V/D/O/I classification | `packages/domain/src/model.ts` plus catalogue/policy rules | UI may visualise classifications but must not redefine them. |
| Factual profile creation/versioning | `apps/api/src/profile-service.ts`, DB schema | Profile UI works through API operations; locked facts are not directly editable. |
| Profile lock + correction semantics | `profile-service.ts`, DB transaction/migrations | Corrections create versioned state; UI cannot patch locked versions in-place. |
| Optimisation preferences | `preference-service.ts`, `optimisation-policy-service.ts`, optimisation/scenario packages | Customer controls are O-class/application choices only. |
| Scenario generation | `scenario-service.ts`, `sprint4-scenario-service.ts`, `packages/scenarios` | UI presents generated/rejected scenarios; it does not manufacture factual deltas. |
| Market-route separation | `sprint4-market-route-service.ts`, `packages/quote-orchestration`, `packages/db/src/sp4-schema.ts` | Provider/channel data belongs to MarketRoute/QuoteRequest metadata. |
| Provider execution | `provider-service.ts`, `packages/mock-providers` | Current branch is synthetic-only; frontend must remain provider-independent. |
| Raw provider response | provider service + DB schema | Raw payload is preserved separately and is not a UI-owned transformed record. |
| Normalisation | `normalisation-service.ts`, `packages/normalisation` | UI consumes normalised quote dimensions; it does not normalise provider payloads. |
| Comparison | `comparison-service.ts`, `packages/comparison` | Only directly comparable quotes are ranked; dormant adjusted state remains excluded. |
| Recommendation analysis | `sprint4-recommendation-service.ts`, `packages/comparison` | RecommendationSet is derived evidence and does not replace customer choice. |
| Explanation | `sprint4-explanation-service.ts`, Sprint 4 comparison/explanation logic | UI surfaces persisted reasons/provenance rather than inventing explanations. |
| Selection/final integrity | `selection-service.ts`, integrity package, DB | Final integrity remains mandatory before completion/handoff. |
| Audit/provenance | audit events in API services, DB audit tables, admin trace services | Admin UX renders append-only lineage and reconstructed evidence. |
| Environment boundary | `apps/api/src/server.ts`, `scripts/verify-prototype-boundary.mjs`, CI | Application mode must never weaken synthetic/live-provider safeguards. |

## Architectural dependency direction

```text
PostgreSQL
    ↓
DB / domain / service packages
    ↓
Fastify API
    ↓
Application-facing contracts / ViewModels
    ↓
customer-web / admin-web
```

### Finding

The repository already respects the major persistence/application separation: customer/admin packages do not depend on `@miqo/db`. The current weakness is not direct database coupling; it is that React pages bind directly to raw API response shapes using `any`. APP-PREP must insert an explicit application/ViewModel contract without moving domain rules into the frontend.
