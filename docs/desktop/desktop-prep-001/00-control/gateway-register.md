# Gateway Register

| Gateway | Title | Status | Evidence |
|---|---|---|---|
| G0 | Baseline & Dependency Freeze | PASS | 08-evidence/G0/baseline-and-dependency-freeze.md |
| G1 | Desktop Architecture Decision | PASS | 08-evidence/G1/architecture-decision.md; ADR-001 |
| G2 | Admin Application Boundary | PASS | 08-evidence/G2/admin-application-boundary.md |
| G3 | Security & Identity Architecture | PASS | 08-evidence/G3/security-and-identity-architecture.md; ADR-002 |
| G4 | Windows Runtime & Packaging | PASS — DESIGN/READINESS | 08-evidence/G4/windows-runtime-and-packaging.md; ADR-003 |
| G5 | Environment & Configuration Model | PASS | 08-evidence/G5/environment-and-configuration-model.md; ADR-004 |
| G6 | Observability & Supportability | PASS | 08-evidence/G6/observability-and-supportability.md; ADR-005 |
| G7 | Build & CI/CD Preparation | **PARTIAL PASS — G7-A COMPLETE / G7-B PENDING G8.1** | 08-evidence/G7/build-ci-preparation.md |
| G8 | Desktop Skeleton Proof | NOT STARTED — WP-G8.1 AUTHORISED AS G7 DEPENDENCY UNLOCK | 07-ci-cd/gateway-sequencing.md |
| G9 | PREP Certification | NOT STARTED | — |

## G7 build/CI baseline

- canonical entry point: scripts/desktop-ci.ps1
- workflow: .github/workflows/desktop-prep-g7.yml
- runner: windows-2025 x64
- Node/npm: 22.16.0 / 10.9.2
- Rust/Cargo: 1.98.1
- ordinary CI permissions: contents: read
- GitHub Actions pinned to full commit SHAs
- cache mode: none
- environment: SYNTHETIC / liveProviders=false
- full mode output: NSIS + SHA-256 + build-manifest.json
- CI artefact retention: 14 days
- production signing: protected downstream stage via UI-SIGN

## Sequencing rule

WP-G8.1 may create only the approved Desktop scaffold needed to unlock G7-B.

The remainder of G8 must not proceed until G7-B full package CI has passed.

## Gateway rule

No gateway may be marked PASS without evidence tied to the controlled branch/revision. PARTIAL PASS and blockers remain explicit.
