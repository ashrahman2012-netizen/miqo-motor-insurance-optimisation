# MIQOS Desktop Install, Update & Uninstall Contract v1.0

**Gateway:** G4
**Status:** FROZEN AT G4

## Installation

Primary package:

~~~text
Tauri NSIS
Windows 11 x64
current-user installation
~~~

Required characteristics:

- no administrator elevation for the default install
- registered Windows Installed Apps/uninstall entry
- Start Menu entry
- no auto-start
- no Windows service/daemon
- no firewall rule
- no protocol/file association unless separately authorised
- no machine-wide environment-variable changes
- silent install supported through NSIS /S for managed/test automation

A per-machine NSIS deployment is an approved alternative only when enterprise policy requires it. The application process itself must still run non-elevated.

## Update model

Initial update mechanism: **controlled versioned installer replacement**.

The Tauri self-updater is disabled for the initial PREP/G8 skeleton.

Rules:

- semantic version increases per package
- downgrade blocked
- only approved non-sensitive local settings survive upgrade
- no local authoritative MIQOS data migration exists because no such cache is permitted
- release provenance remains tied to controlled CI/release artefacts

## Future self-updater

Before Tauri updater activation, require:

- owned HTTPS update endpoint
- updater public-key pinning
- updater private signing key outside source
- CI signature generation/verification
- rollout/channel policy
- rollback procedure
- interaction with Authenticode signing documented

Updater signing is separate from Windows Authenticode signing.

## Rollback

Rollback is not uncontrolled end-user downgrade. Preferred recovery is a new higher-version package containing known-good/remediated content.

## Uninstall

Uninstaller must remove application binaries, shortcuts, uninstaller registration and intentionally owned non-sensitive local settings/cache.

It must not delete server-side MIQOS data or domain/audit evidence.

G3 logout remains the authoritative mechanism for current-user credential deletion and remote session revocation; uninstall is not the sole security lifecycle mechanism.

## G8 proof

G8 must prove:

1. package generated;
2. SHA-256 recorded;
3. default install requires no elevation;
4. application launches from installed location;
5. WebView2 present/remediation path works;
6. version/build identity visible;
7. representative synthetic Admin read works;
8. a higher version upgrades correctly;
9. an older version is rejected;
10. uninstall completes and installed binaries/shortcuts are removed.
