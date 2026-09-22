# MIQOS Desktop Windows Packaging Decision v1.0

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G4 — Windows Runtime & Packaging
**Status:** FROZEN AT G4
**Date:** 2026-09-21

## Target platform

Initial supported certification/production target:

- Windows 11
- x64
- Rust target: x86_64-pc-windows-msvc

Windows 10 is not a normal supported target because standard support ended on 14 October 2025. Windows 10 ESU/LTSC requires an explicit deployment exception and separate compatibility evidence. ARM64 is deferred until a deployment requirement exists.

## Primary installer

Selected bundle: **Tauri NSIS setup executable**.

Selected default install mode: **currentUser**.

MIQOS Admin permissions are business permissions, not Windows administrator privileges. The application does not require services, drivers or machine-wide privileged components, so the default installer must not require elevation.

NSIS is preferred to MSI because it supports current-user/per-machine modes and silent installation while avoiding Tauri's MSI build dependency on WiX v3 and the Windows VBSCRIPT optional feature.

MSI remains a secondary enterprise deployment format only when explicitly required and proven in G7.

## Frozen application identity

~~~text
Product name:         MIQOS Admin
Executable name:      miqos-admin
Tauri identifier:     com.miqos.admin.desktop
Architecture:         x64
Initial PREP version: 0.1.0
~~~

The identifier is a technical application identifier, not a claim of DNS ownership. Changing it after G8 is a packaging-breaking change requiring change control. Final publisher display name is bound to the external production signing identity.

## Bundle contract

~~~json
{
  "productName": "MIQOS Admin",
  "identifier": "com.miqos.admin.desktop",
  "version": "0.1.0",
  "mainBinaryName": "miqos-admin",
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "windows": {
      "allowDowngrades": false,
      "webviewInstallMode": { "type": "embedBootstrapper" },
      "nsis": { "installMode": "currentUser" }
    }
  }
}
~~~

This is the G4 packaging contract; exact dependency/schema validation occurs when the Desktop scaffold exists.

## Downgrade policy

Downgrades are blocked. Rollback is a release-engineering action, normally by issuing a new higher-version signed package containing remediated known-good content.

## Build dependencies

Build-time dependencies:

- Windows x64 runner
- Microsoft C++ Build Tools / Desktop Development with C++
- Rust MSVC toolchain
- Node 22.16.0 / npm 10.9.2 repository baseline
- exact-pinned Tauri/frontend dependencies
- NSIS tooling
- Windows signing tool or approved managed signing service when production signing is enabled

Client runtime dependencies:

- supported Windows 11 x64
- Microsoft Edge WebView2 Evergreen Runtime
- authorised MIQOS API/IdP network connectivity for authoritative functions

The client must not require separately installed Node, npm, Rust, Git, PostgreSQL or a local MIQOS domain server.

## Package content prohibition

The installer must not contain production OAuth tokens/secrets, signing private keys, database/provider credentials, authoritative MIQOS data snapshots or a fixed WebView2 runtime unless separately approved.
