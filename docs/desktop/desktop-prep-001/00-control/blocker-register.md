# Blocker Register

## Active blockers

### B-G8-PROOF-001 — Strict-mode uninstall-registry enumeration

**Type:** Internal G8 proof-harness robustness defect.  
**State:** ACTIVE.  
**Run:** `35624013907`.  
**Job:** `106414115119`.

The Windows package build completed successfully, including formatting, Clippy, tests, release compilation and NSIS generation.

The installed proof then failed at `scripts/desktop-g8-proof.ps1:33` because strict-mode registry enumeration dereferences `DisplayName` on registry objects where that property is absent.

**Required correction:** Make product filtering safely test for a `DisplayName` property before comparing it.

**Control boundary:** Do not change Tauri capabilities, command permissions, CSP, deployment profile, API transport, logging semantics, packaging configuration, native command set or application logic to resolve this blocker.

**Resume point:** Rerun permanent G8 workflow from the installed proof sequence after the narrow harness correction.

## Resolved blockers

### B-G8-CLIPPY-001 — G8 native proof source failed cargo clippy

Resolved with the three Clippy-prescribed semantics-preserving rewrites in `src/lib.rs`:

- two `map_err` logging transformations to `inspect_err`;
- descending timestamp sort rewritten to `sort_by_key(Reverse(...))`.

Formatting was reapplied with Rust 1.98.1. Current G7 regression run `35624013728` is SUCCESS and G8 package build progressed through Clippy/NSIS.

### B-G8-RUSTFMT-001 — G8 native proof source failed cargo fmt

Resolved by applying Rust 1.98.1 rustfmt only to `build.rs` and `src/lib.rs`.

### B-G7-002 — Tauri build schema rejected explicit Windows build field

Resolved by authorised removal of the incompatible explicit `build.windows.staticVCRuntime` field.

Subsequent Windows CI progressed through Rust/Tauri compilation.

### B-G7-RESOURCE-001 — Windows resource icon missing

Resolved by adding the required scaffold-only `src-tauri/icons/icon.ico`.

### B-G7-CMD-001 — NSIS CLI argument forwarding

Resolved by invoking the locked Tauri binary directly:

```text
tauri.cmd build --bundles nsis
```

### B-G7-EVIDENCE-001 — Single NSIS result PowerShell collection handling

Resolved by coercing the `Get-ChildItem` result to an array before enforcing exactly-one-package evidence.

Successful full package run: `35615450461`.

### B-G7-001 — Desktop scaffold required for full package CI

Resolved by WP-G8.1.

### B-G7-PROBE-001 — Tauri CLI version probe returned npm version

Resolved by invoking `node_modules/.bin/tauri.cmd --version` directly.

### B-G0-001 — GitHub repository integration access

Previous 403 integration condition is resolved.

## Known external dependencies — not currently blocking

### D-G3-IDP-001 — Identity-provider registration

**Need:** Real environment OIDC native/public-client registration, issuer configuration, redirect registration, MIQOS API audience/scopes and group/role assignment.

**Checkpoint:** UI-IDP.

**Resume rule:** Resume at environment registration/authentication proof; do not repeat G0-G4.

### D-G4-SIGN-001 — Production Windows signing identity

**Need:** Organisation-controlled trusted Windows code-signing identity and least-privilege release-pipeline access.

**Current state:** Not required for G4 packaging-design closure or an explicitly non-production G8 mechanical package proof.

**Checkpoint:** UI-SIGN.

**Becomes blocking for:** production signing evidence and G9 certification if production-signed release readiness is in certification scope.

**Security rule:** private signing keys/secrets must not be pasted into chat, committed to Git or placed in ordinary build artefacts.

**Resume rule:** resume at G7 signing integration/verification; do not repeat G0-G4.


### D-G5-ENV-001 — Real environment deployment profile values

**Need:** When STAGING/PRODUCTION execution is attempted, provide approved API base URL, API audience, OIDC issuer, native client ID/scopes and environment/package profile values.

**Current state:** Not required for G5 architecture closure. TEST/SYNTHETIC G8 proof can use the controlled synthetic environment.

**Checkpoint:** UI-ENV, coordinated with UI-IDP where identity registration is also required.

**Security rule:** supply identifiers/endpoints through controlled deployment configuration; do not place secrets in the bundled profile or renderer variables.

**Resume rule:** resume at profile generation/environment attestation proof; do not repeat G0-G5.

## Resolved blockers

### B-G0-001 — GitHub repository integration access

Previous 403 integration condition is resolved. Repository read/write access and branch creation are available.
