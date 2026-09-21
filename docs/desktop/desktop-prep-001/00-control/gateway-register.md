# Gateway Register

| Gateway | Title | Status | Evidence |
|---|---|---|---|
| G0 | Baseline & Dependency Freeze | PASS | 08-evidence/G0/baseline-and-dependency-freeze.md |
| G1 | Desktop Architecture Decision | PASS | 08-evidence/G1/architecture-decision.md; ADR-001 |
| G2 | Admin Application Boundary | PASS | 08-evidence/G2/admin-application-boundary.md |
| G3 | Security & Identity Architecture | PASS | 08-evidence/G3/security-and-identity-architecture.md; ADR-002 |
| G4 | Windows Runtime & Packaging | **PASS — DESIGN/READINESS** | 08-evidence/G4/windows-runtime-and-packaging.md; ADR-003 |
| G5 | Environment & Configuration Model | **PASS** | 08-evidence/G5/environment-and-configuration-model.md; ADR-004 |
| G6 | Observability & Supportability | NOT STARTED | — |
| G7 | Build & CI/CD Preparation | NOT STARTED | — |
| G8 | Desktop Skeleton Proof | NOT STARTED | — |
| G9 | PREP Certification | NOT STARTED | — |

## Frozen Desktop baseline through G5

- Host: Tauri 2 + React/TypeScript.
- Domain authority: Fastify/API/domain/PostgreSQL.
- Admin business-state access: read-only.
- Authentication: native public client; external browser; Authorization Code + PKCE.
- Token boundary: native broker; no WebView credential persistence.
- Package: Tauri NSIS.
- Install scope: current user by default; non-elevated.
- Supported target: Windows 11 x64.
- WebView2: Evergreen with embedded bootstrapper fallback.
- Downgrades: blocked.
- Initial updates: controlled installer replacement.
- Production signing: external organisation-controlled Authenticode identity.
- Actual package execution remains mandatory at G8.
- Deployment profiles: immutable/bundled and native-validated; no user environment switcher.
- Canonical stage mapping: DEV/TEST→SYNTHETIC, STAGING→CERTIFICATION, PRODUCTION→PRODUCTION.
- Production/non-production packages use isolated Tauri identifiers/state namespaces.
- Server environment evidence must match the packaged expectation or the application fails closed.

## Gateway rule

No gateway may be marked PASS without evidence tied to the controlled branch/revision. Design/readiness PASS must not be misrepresented as installed-package proof.
