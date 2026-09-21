# G4 Evidence — Windows Runtime & Packaging

**Gateway:** G4
**Result:** PASS — DESIGN/READINESS
**Date:** 2026-09-21
**ADR:** 04-packaging/adr/ADR-003-nsis-evergreen-user-scope.md

## Evidence reviewed

Official Tauri documentation establishes that:

- Windows Tauri development requires Microsoft C++ Build Tools, WebView2 and Rust;
- Windows installers can be MSI or NSIS;
- MSI uses WiX v3 and requires Windows VBSCRIPT;
- Tauri notes VBSCRIPT may be disabled in future Windows versions;
- NSIS supports currentUser, perMachine and both install modes;
- currentUser does not require administrator privilege;
- NSIS supports silent /S installation;
- Tauri supports multiple WebView2 provisioning modes;
- Tauri can block downgrade installations;
- Tauri supports SHA-256/timestamp Windows signing and custom signing commands;
- Tauri updater artefacts use a separate signature mechanism.

Microsoft documentation establishes that:

- WebView2 Runtime is required;
- Evergreen is recommended for most applications;
- Evergreen is recommended for enterprise environments unless a critical compatibility need requires Fixed Version;
- Evergreen receives continuing security updates;
- Windows 10 standard support ended on 14 October 2025.

## G4 decisions

1. Windows 11 x64 normal support baseline.
2. Primary installer: Tauri NSIS.
3. Default install: current user, non-elevated.
4. Per-machine is an alternate enterprise profile.
5. MSI is secondary only if deployment tooling mandates it.
6. WebView2 Evergreen with embedded bootstrapper fallback.
7. Fixed WebView2 rejected by default.
8. Downgrades blocked.
9. Initial updates use controlled installer replacement.
10. Tauri self-updater disabled initially.
11. Production package requires Authenticode signing; signing key remains external.
12. G8 package proof may be unsigned/test-signed but must be labelled correctly.
13. No Node/Rust/PostgreSQL client runtime.
14. Packaging/install/upgrade/uninstall proof contract frozen for G7/G8.

## Exit criteria

| Criterion | Result |
|---|---|
| Windows target/runtime baseline selected | PASS |
| Installer format selected | PASS |
| Install scope selected | PASS |
| Application identity/version strategy defined | PASS |
| WebView2 strategy selected | PASS |
| Runtime prerequisites classified | PASS |
| Upgrade/downgrade policy defined | PASS |
| Uninstall responsibilities defined | PASS |
| Signing insertion point defined | PASS |
| Production signing secret externalised | PASS |
| Executable packaging-proof contract defined | PASS |
| Certified application source unchanged | PASS |

## Deferred execution evidence

Actual package generation cannot be claimed before apps/admin-desktop exists. By programme design, the real build/install/uninstall proof belongs to G7/G8.

G4 therefore certifies packaging design/readiness, not an installed application.

UI-SIGN is not blocking G4; it becomes required for production signing/release certification.

## Gateway decision

**G4 = PASS — DESIGN/READINESS**

Next controlled gateway:

MIQOS-DESKTOP-PREP-001 / BC-05 / G5 — Environment & Configuration Model
