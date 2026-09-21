# Gateway Register

| Gateway | Title | Status | Evidence |
|---|---|---|---|
| G0 | Baseline & Dependency Freeze | PASS | `08-evidence/G0/baseline-and-dependency-freeze.md` |
| G1 | Desktop Architecture Decision | PASS | `08-evidence/G1/architecture-decision.md`; ADR-001 |
| G2 | Admin Application Boundary | **PASS** | `08-evidence/G2/admin-application-boundary.md` |
| G3 | Security & Identity Architecture | NOT STARTED | — |
| G4 | Windows Runtime & Packaging | NOT STARTED | — |
| G5 | Environment & Configuration Model | NOT STARTED | — |
| G6 | Observability & Supportability | NOT STARTED | — |
| G7 | Build & CI/CD Preparation | NOT STARTED | — |
| G8 | Desktop Skeleton Proof | NOT STARTED | — |
| G9 | PREP Certification | NOT STARTED | — |

## Frozen architecture/boundary

- Host: Tauri 2 + React/TypeScript.
- Target workspace: `apps/admin-desktop`.
- Shared reuse: `@miqo/ui`, `@miqo/application-contracts`, `@miqo/application-adapters`.
- Domain authority: Fastify/API/domain/PostgreSQL.
- Current Admin MIQOS-state access: read-only.
- No direct DB access.
- No implicit privilege from endpoint reachability.
- Future Admin mutation requires explicit API, authz, audit, idempotency and failure contract.

## Gateway rule

No gateway may be marked PASS without evidence tied to the controlled branch/revision. PARTIAL PASS and blockers must remain explicit.
