# MIQOS Desktop Runtime Prerequisites v1.0

**Gateway:** G4
**Status:** FROZEN AT G4

## Supported OS

Normal baseline: supported, patched Windows 11 x64.

Windows 10 is outside the normal baseline in 2026 because standard support ended on 14 October 2025.

## WebView2

Selected runtime: **Microsoft Edge WebView2 Evergreen**.

Selected missing-runtime fallback: **embedded Evergreen bootstrapper**.

Reasons:

- Tauri uses WebView2 to render on Windows.
- Microsoft recommends Evergreen for most applications.
- Microsoft recommends Evergreen for enterprise environments unless a business-critical compatibility need requires Fixed Version.
- Evergreen receives security servicing independently of MIQOS application releases.
- Windows 11 normally already contains WebView2.
- Embedding the small bootstrapper provides a recovery path without bundling a full browser runtime.

## Rejected default modes

**Fixed Version:** rejected because MIQOS would inherit browser-engine patch ownership and package size increases materially.

**skip:** rejected because a machine without WebView2 would fail without installer remediation.

**offlineInstaller:** approved only as an alternate disconnected-enterprise deployment profile; not the default because of package-size overhead.

## Minimum version

G4 does not invent a higher WebView2 minimum. If G8 uses an API requiring a newer version, the tested minimum must be configured and installer remediation proved.

## Native runtime

Use the normal statically linked MSVC runtime posture unless a later native dependency proves a separate Visual C++ runtime is necessary.

No hidden client requirement for Node, Rust, PostgreSQL, Git or Visual Studio is permitted.
