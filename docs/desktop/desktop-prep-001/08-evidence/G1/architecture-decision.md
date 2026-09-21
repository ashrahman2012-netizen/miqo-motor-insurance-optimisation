# G1 Evidence — Desktop Architecture Decision

**Gateway:** G1  
**Result:** PASS  
**Date:** 2026-09-21  
**ADR:** `01-architecture/adr/ADR-001-tauri-react-windows-admin.md`

## Evidence reviewed

Repository evidence established that:

- the certified platform is TypeScript/React with npm workspaces;
- `@miqo/application-contracts` is framework-neutral;
- `@miqo/application-adapters` is a pure mapping boundary and does not own network transport;
- `@miqo/ui` is React-based but not Next.js-dependent;
- `apps/admin-web` contains Next-specific routing/server/environment orchestration;
- authoritative business/domain state remains behind the Fastify API;
- production authentication/RBAC is deferred and must not be invented during architecture selection.

External current documentation was reviewed for Tauri 2, Electron and WinUI 3 deployment/security architecture.

## Options considered

- Tauri 2 + React/TypeScript;
- Electron + React/TypeScript;
- WinUI 3 / Windows App SDK;
- installed web/PWA-only model.

The weighted matrix is recorded in `01-architecture/candidate-evaluation.md`.

## Decision

**Tauri 2 + React/TypeScript is selected.**

The architecture uses a new `apps/admin-desktop` workspace. It reuses the certified contracts/adapters/UI layer and keeps `apps/api` as the authoritative remote trust boundary.

The Rust/Tauri core is restricted to desktop lifecycle and explicitly authorised native capabilities. It is not a second domain backend.

## G1 exit criteria

| Criterion | Result |
|---|---|
| One target architecture selected | PASS |
| Decision documented in ADR | PASS |
| Compatible with frozen certified baseline | PASS |
| Runtime/packaging implications identified | PASS |
| No unresolved architecture question prevents scaffolding | PASS |
| Skeleton proof shape defined | PASS |

## Residual risks handed forward

- Rust/MSVC toolchain introduction — G4/G7.
- WebView2 deployment policy — G4.
- production identity/token handling — G3.
- client-side route/navigation adaptation — implementation detail under G8/BUILD.
- API CORS/origin policy for Desktop transport — G3/G5.
- exact Tauri/Vite crate/package pins — scaffold/build dependency-lock step.

## Gateway decision

**G1 = PASS**

Next controlled gateway:

`MIQOS-DESKTOP-PREP-001 / BC-02 / G2 — Admin Application Boundary`
