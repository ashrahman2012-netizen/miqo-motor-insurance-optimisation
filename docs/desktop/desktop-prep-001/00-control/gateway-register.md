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
| G7 | Build & CI/CD Preparation | **PASS** | 08-evidence/G7/build-ci-preparation.md; 08-evidence/G7/windows-preflight-run.md; 08-evidence/G7/full-package-ci.md |
| G8 | Desktop Skeleton Proof | **PASS** | 07-skeleton-proof/proof-scope.md; 08-evidence/G8/skeleton-proof.md; run `35739112027` |
| G9 | PREP Certification | **PASS** | 08-evidence/G9/prep-certification.md; MIQOS-DESKTOP-PREP-001-CLOSEOUT.md |

## G7 closure evidence

- canonical entry point: `scripts/desktop-ci.ps1`
- workflow: `.github/workflows/desktop-prep-g7.yml`
- runner: `windows-2025` x64
- Node/npm: 22.16.0 / 10.9.2
- Rust/Cargo: 1.98.1
- Tauri CLI: 2.11.4
- cache mode: none
- environment: SYNTHETIC / liveProviders=false
- production signing: external via UI-SIGN; PREP package evidence is explicitly non-production.

## G9 exact-head certification evidence

Certified evidence head:

```text
ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0
```

- repository CI #663 / run `35739112140` — **SUCCESS**
- Desktop G7 #210 / run `35739112040`, job `106783918880` — **SUCCESS**
- Desktop G8 #31 / run `35739112027` — **SUCCESS**
- G8 API integration job `106783896507` — **SUCCESS**
- G8 Windows installed proof job `106783896660` — **SUCCESS**
- G7 package artefact `10698434765`, digest `sha256:e04b8354808216b385dbec2742a31a0543274a3d6f17cdf31aed904bb625b45f`
- G8 Windows proof artefact `10699900330`, digest `sha256:5e66b813385823edf99d6601162b467e7c8c4f60c0e675078b116fe2f5800edf`
- G8 API proof artefact `10699326398`, digest `sha256:70718cfcbd6a6148b8bc8c8e5bb9991dfaac24a65cc68a4b126c438031b57a06`

## Sequencing rule

G0 through G9 are PASS.

MIQOS-DESKTOP-PREP-001 is complete. The Windows Admin application build may begin from the G9 closeout commit.

Production signing, real IdP/environment configuration and live-provider activation remain separately gated downstream dependencies.

## Gateway rule

No gateway may be marked PASS without executable evidence tied to a controlled source revision.
