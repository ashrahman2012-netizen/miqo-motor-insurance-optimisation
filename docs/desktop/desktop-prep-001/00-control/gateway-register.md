# Gateway Register

| Gateway | Title | Status | Evidence |
|---|---|---|---|
| G0 | Baseline & Dependency Freeze | PASS | 08-evidence/G0/baseline-and-dependency-freeze.md |
| G1 | Desktop Architecture Decision | PASS | 08-evidence/G1/architecture-decision.md; ADR-001 |
| G2 | Admin Application Boundary | PASS | 08-evidence/G2/admin-application-boundary.md |
| G3 | Security & Identity Architecture | PASS | 08-evidence/G3/security-and-identity-architecture.md; ADR-002 |
| G4 | Windows Runtime & Packaging | PASS — DESIGN/READINESS | 08-evidence/G4/windows-runtime-and-packaging.md; ADR-003 |
| G5 | Environment & Configuration Model | PASS | 08-evidence/G5/environment-and-configuration-model.md; ADR-004 |
| G6 | Observability & Supportability | **PASS** | 08-evidence/G6/observability-and-supportability.md; ADR-005 |
| G7 | Build & CI/CD Preparation | NOT STARTED | — |
| G8 | Desktop Skeleton Proof | NOT STARTED | — |
| G9 | PREP Certification | NOT STARTED | — |

## Frozen Desktop baseline through G6

- Host: Tauri 2 + React/TypeScript.
- Domain authority: Fastify/API/domain/PostgreSQL.
- Admin business-state access: read-only.
- Authentication: native public client; external browser; Authorization Code + PKCE.
- Token boundary: native broker; no WebView credential persistence.
- Package: Tauri NSIS, current-user, Windows 11 x64.
- WebView2: Evergreen with embedded bootstrapper fallback.
- Production signing: external organisation-controlled Authenticode identity.
- Deployment configuration: immutable bundled profile + server attestation.
- Environment/package state isolated across DEV/TEST/CERTIFICATION/PRODUCTION.
- Observability: structured local logs, bounded retention, W3C trace correlation.
- Crash model: sanitised metadata only by default; no automatic memory dumps/upload.
- Support bundle: explicit, redacted, checksum-producing diagnostic artefact.
- Operational logs do not replace security audit or immutable MIQOS domain evidence.
- Actual package, capability, logging and support-bundle execution proof remains mandatory at G8.

## Gateway rule

No gateway may be marked PASS without evidence tied to the controlled branch/revision. Design/readiness controls must not be misrepresented as executable proof.
