# MIQOS Desktop Packaging Proof Contract v1.0

**Gateway:** G4
**Status:** EXECUTABLE CONTRACT FOR G7/G8

## Purpose

G4 freezes a reproducible packaging design. G7/G8 execute the real Windows package and clean-machine proof after the Desktop scaffold and Windows runner exist.

## Expected build flow

~~~text
npm ci
desktop typecheck/test
desktop frontend build
Tauri release build
NSIS bundle
signature step when authorised
checksum/provenance capture
~~~

## Expected artefact

Primary artefact: MIQOS Admin x64 NSIS setup executable.

Evidence must record:

- semantic version
- SHA-256
- byte size
- source commit
- Node/npm/Rust/Tauri versions
- target architecture
- WebView2 install mode
- signed/unsigned state

## Clean Windows 11 proof

~~~text
verify checksum
→ verify signature state
→ install
→ record installation/uninstall registration
→ launch
→ record app/version/environment identity
→ execute representative synthetic read
→ close
→ install higher version
→ verify upgraded version
→ attempt older version and prove rejection
→ uninstall
→ verify package-owned files/shortcuts removed
~~~

## Runtime proof

Prove:

- no Node/npm/Rust runtime dependency
- WebView2 present or fallback works
- no PostgreSQL/local MIQOS backend installed
- no service/firewall rule added
- current-user install requires no elevation

## Package inspection

Reject a package containing:

- .env secrets
- OAuth tokens
- signing private keys
- database/provider credentials
- unexpected shell/sidecar binaries
- release-prohibited development material

## Exit interpretation

G4 is a design/readiness gateway. Actual package generation/install/uninstall evidence remains mandatory in G8 and final PREP certification.
