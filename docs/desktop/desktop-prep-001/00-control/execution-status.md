# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G4 — Windows Runtime & Packaging
**Status:** PASS — DESIGN/READINESS
**Execution branch:** miqos/desktop-prep-001
**Upstream certified branch:** miqos/app-build-001
**Upstream certified SHA:** ce211bf4e23643f1eab75e865210f4de121841fb
**Desktop architecture:** Tauri 2 + React/TypeScript
**Primary package:** NSIS, current-user, Windows 11 x64
**WebView2:** Evergreen with embedded bootstrapper fallback
**Date:** 2026-09-21

## Current control position

G0 through G4 are complete.

G4 freezes:

- Windows 11 x64 as the normal target;
- Tauri NSIS as the primary installer;
- non-elevated current-user installation;
- per-machine/MSI only as controlled enterprise variants;
- WebView2 Evergreen with embedded bootstrapper fallback;
- downgrade prevention;
- controlled installer replacement as the initial update mechanism;
- production Authenticode signing through an external organisation-controlled signing identity;
- package/install/upgrade/uninstall proof requirements for G7/G8.

No real installer is claimed yet because apps/admin-desktop does not exist by design until the skeleton phase.

The next controlled gateway is:

G5 — Environment & Configuration Model
