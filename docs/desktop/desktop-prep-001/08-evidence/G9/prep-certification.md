# G9 Evidence — Desktop PREP Certification

**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G9 — PREP Certification  
**Result:** PASS  
**Date:** 2026-09-22  
**Execution branch:** `miqos/desktop-prep-001`  
**Frozen upstream baseline:** `miqos/app-build-001` @ `ce211bf4e23643f1eab75e865210f4de121841fb`  
**Certified evidence head:** `ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0`  
**Validated executable source:** `d8eb075b894ead75b00f7a501a2acde032d7a6c3`

## Certification basis

G0 through G8 are PASS and the final G9 evidence review found no blocking PREP defect.

The certified evidence head is one documentation-only commit after the validated executable source. The comparison from `d8eb075b894ead75b00f7a501a2acde032d7a6c3` to `ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0` changes only G8 control/evidence documentation; no executable source is changed.

The full Desktop PREP branch remains based on the frozen certified application baseline. Final comparison against `ce211bf4e23643f1eab75e865210f4de121841fb` is 219 commits ahead and 0 behind. The delta is confined to the dedicated Desktop host/proof surface, Desktop PREP documentation, Desktop CI/proof workflows and scripts, and the workspace lockfile additions required by the Desktop package. No pre-existing certified application/domain source file is modified.

## Exact-head executable evidence

The certified evidence head `ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0` has the following successful runs:

| Control | Run | Job / scope | Result |
|---|---:|---|---|
| repository `ci` #663 | `35739112140` | locked-dependencies, postgres-contract, target-stack-sprint1 | SUCCESS |
| `desktop-prep-g7` #210 | `35739112040` | Windows Desktop preflight/full `106783918880` | SUCCESS |
| `desktop-prep-g8` #31 | `35739112027` | API integration `106783896507` | SUCCESS |
| `desktop-prep-g8` #31 | `35739112027` | Windows installed proof `106783896660` | SUCCESS |

## Exact-head artefacts

- G7 Windows package artefact `10698434765`, digest `sha256:e04b8354808216b385dbec2742a31a0543274a3d6f17cdf31aed904bb625b45f`.
- G8 Windows installed-proof artefact `10699900330`, digest `sha256:5e66b813385823edf99d6601162b467e7c8c4f60c0e675078b116fe2f5800edf`.
- G8 API proof artefact `10699326398`, digest `sha256:70718cfcbd6a6148b8bc8c8e5bb9991dfaac24a65cc68a4b126c438031b57a06`.

## Certified PREP outcomes

The programme has now established and proved the bounded Desktop foundation required to begin the Windows Admin application build:

- Tauri 2 + React/TypeScript dedicated Windows Admin host;
- remote Fastify/API/domain/PostgreSQL authority retained;
- Desktop Admin read/inspect boundary with no direct database authority;
- native OIDC/PKCE security architecture and least-privilege native capability model;
- Windows 11 x64 / NSIS current-user packaging baseline;
- immutable deployment-profile and fail-closed environment-attestation model;
- local-first structured observability and supportability contracts;
- reproducible Windows CI with exact Node/Rust toolchains;
- real NSIS package generation and artefact evidence;
- installed launch, unavailable/retry behaviour and SYNTHETIC/ATTESTED evidence;
- runtime independence from development services/tools;
- upgrade, downgrade rejection and uninstall lifecycle proof.

## Controlled dependencies carried forward

The following items remain open but are not blockers to PREP certification or to beginning bounded application implementation:

- real IdP/native-client registration and environment-specific identity configuration;
- production API token validation/RBAC/access-audit platform extension;
- certification/production environment authority and endpoint values;
- organisation-controlled Authenticode signing identity;
- enterprise MSI/per-machine deployment variant if later required;
- Windows targets outside the current Windows 11 x64 baseline;
- controlled remediation/assessment of inherited npm audit findings before production release as appropriate.

These items become blocking only at the downstream gateway where the associated real-environment, security, signing or production-release evidence is required. They must not be bypassed by weakening the SYNTHETIC/live-provider boundary or local security controls.

## Explicit non-certifications

G9 PREP certification is not a production release, go-live, security accreditation or live-provider activation decision. It does not certify:

- production Authenticode signing;
- production OIDC/IdP integration or production RBAC;
- STAGING/CERTIFICATION or PRODUCTION environment operation;
- live insurer/provider connectivity, purchase or binding;
- enterprise deployment variants beyond the proved NSIS current-user baseline;
- ARM64 or legacy Windows support;
- penetration testing, external accessibility attestation or regulatory approval.

## G9 decision

G9 is **PASS** and MIQOS-DESKTOP-PREP-001 is **CERTIFIED COMPLETE** for its bounded preparation scope.

The Windows Admin application build is authorised to begin from the G9 closeout commit. The commit that records this certification is documentation-only; the executable evidence remains tied to the exact green head `ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0`.

Any later executable-source change requires the applicable regression/certification controls before it can inherit this PREP evidence.
