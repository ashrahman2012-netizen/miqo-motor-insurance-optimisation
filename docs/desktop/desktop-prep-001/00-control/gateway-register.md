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
| G8 | Desktop Skeleton Proof | **PASS** | 07-skeleton-proof/proof-scope.md; 08-evidence/G8/skeleton-proof.md; run `35736586909` |
| G9 | PREP Certification | NOT STARTED | — |

## G7 closure evidence

- canonical entry point: `scripts/desktop-ci.ps1`
- workflow: `.github/workflows/desktop-prep-g7.yml`
- runner: `windows-2025` x64
- Node/npm: 22.16.0 / 10.9.2
- Rust/Cargo: 1.98.1
- Tauri CLI: 2.11.4
- cache mode: none
- environment: SYNTHETIC / liveProviders=false
- G7-A preflight: run `35601094369` SUCCESS
- G7-B full package: run `35615450461` SUCCESS
- same-head certified CI: run `35615450454` SUCCESS
- package artefact ID: `10646138442`
- installer SHA-256: `a5e40412b3b9814c4d68d5e93c779f54cade1cd5ff4f4dec3d79e81c01e3c102`
- Cargo.lock SHA-256: `b2f3cdeeef282c1fecc7c477066822fec0574163222f4bbafcb34c116be83e07`
- Actions artefact digest: `sha256:795cd43a99da0d80311a1a87f1659d445eeb2fe31c8d05d5f54f3a61ebd58457`
- production signing: still external via UI-SIGN; mechanical package is explicitly unsigned.

## Sequencing rule

G7-B has passed.

G8 has passed. G9 is authorised and remains gated on final PREP evidence review.

## Gateway rule

No gateway may be marked PASS without executable evidence tied to a controlled source revision.


## Current regression evidence on G8 source

- source head: `d8eb075b894ead75b00f7a501a2acde032d7a6c3`
- certified CI run `35736586648` / #661 — **SUCCESS**
- Desktop G7 regression run `35736586650` / #208 — **SUCCESS**
- G8 API integration job `106775277382` — **SUCCESS**
- G8 Windows installed proof job `106775277095` — **SUCCESS**
- G8 Windows evidence artefact `10698328970` — **UPLOADED**
