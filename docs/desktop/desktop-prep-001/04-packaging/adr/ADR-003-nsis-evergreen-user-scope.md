# ADR-003 — NSIS Current-User Packaging with Evergreen WebView2

**Status:** ACCEPTED
**Date:** 2026-09-21
**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G4

## Decision

Use:

- Tauri NSIS installer
- currentUser install mode
- Windows 11 x64 normal support baseline
- WebView2 Evergreen Runtime
- embedded Evergreen bootstrapper fallback
- downgrades disabled
- controlled installer replacement as initial update mechanism
- production Authenticode signing through an external managed identity
- no Tauri self-updater in the initial skeleton

## Rationale

Current-user installation preserves least privilege because MIQOS Admin business permissions do not require Windows OS administrator privilege.

NSIS supports both user/machine deployment and silent installation while avoiding Tauri's MSI/WiX v3/VBSCRIPT build dependency.

Evergreen WebView2 leaves browser-engine security servicing with Microsoft's supported runtime instead of transferring Chromium patch ownership into each MIQOS release.

The self-updater is deferred because it adds a second update-signing trust mechanism, endpoint governance and rollout/rollback controls that are unnecessary for the first certified package.

## Secondary profiles

Controlled variants may be introduced for:

- enterprise-mandated MSI
- per-machine deployment
- offline WebView2 installation
- ARM64
- Tauri self-update

Each variant requires evidence and must not silently replace the certified package baseline.
