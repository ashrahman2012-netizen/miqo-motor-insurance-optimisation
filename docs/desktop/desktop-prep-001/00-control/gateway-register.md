# Gateway Register

| Gateway | Title | Status | Evidence |
|---|---|---|---|
| G0 | Baseline & Dependency Freeze | PASS | `08-evidence/G0/baseline-and-dependency-freeze.md` |
| G1 | Desktop Architecture Decision | PASS | `08-evidence/G1/architecture-decision.md`; ADR-001 |
| G2 | Admin Application Boundary | PASS | `08-evidence/G2/admin-application-boundary.md` |
| G3 | Security & Identity Architecture | **PASS** | `08-evidence/G3/security-and-identity-architecture.md`; ADR-002 |
| G4 | Windows Runtime & Packaging | NOT STARTED | — |
| G5 | Environment & Configuration Model | NOT STARTED | — |
| G6 | Observability & Supportability | NOT STARTED | — |
| G7 | Build & CI/CD Preparation | NOT STARTED | — |
| G8 | Desktop Skeleton Proof | NOT STARTED | — |
| G9 | PREP Certification | NOT STARTED | — |

## Frozen architecture/security baseline

- Host: Tauri 2 + React/TypeScript.
- Domain authority: Fastify/API/domain/PostgreSQL.
- Admin domain access at current boundary: read-only.
- Authentication: native public client; external browser; Authorization Code + PKCE.
- Token boundary: native broker; no WebView token persistence.
- Native API transport: configured MIQOS origin + allow-listed operations only.
- Authorisation: server-enforced permissions; UI is not security authority.
- Local data: no persistent authoritative MIQOS business cache.
- Tauri permissions/CSP: least privilege / fail closed.
- Platform security middleware is a controlled downstream extension, not a PREP-side modification of the frozen baseline.

## Gateway rule

No gateway may be marked PASS without evidence tied to the controlled branch/revision. PARTIAL PASS and blockers must remain explicit.
