# Gateway Register

| Gateway | Title | Status | Evidence |
|---|---|---|---|
| G0 | Baseline & Dependency Freeze | PASS | `08-evidence/G0/baseline-and-dependency-freeze.md` |
| G1 | Desktop Architecture Decision | **PASS** | `08-evidence/G1/architecture-decision.md`; ADR-001 |
| G2 | Admin Application Boundary | NOT STARTED | — |
| G3 | Security & Identity Architecture | NOT STARTED | — |
| G4 | Windows Runtime & Packaging | NOT STARTED | — |
| G5 | Environment & Configuration Model | NOT STARTED | — |
| G6 | Observability & Supportability | NOT STARTED | — |
| G7 | Build & CI/CD Preparation | NOT STARTED | — |
| G8 | Desktop Skeleton Proof | NOT STARTED | — |
| G9 | PREP Certification | NOT STARTED | — |

## Architecture baseline from G1

Selected host: **Tauri 2 + React/TypeScript**.

Target workspace: `apps/admin-desktop`.

The Desktop renderer may reuse `@miqo/ui`, `@miqo/application-contracts` and `@miqo/application-adapters`. The Tauri/Rust core is limited to authorised OS/Desktop capabilities and must not become a second MIQOS domain backend.

## Gateway rule

No gateway may be marked PASS without evidence tied to the controlled branch/revision. PARTIAL PASS and blockers must remain explicit.
