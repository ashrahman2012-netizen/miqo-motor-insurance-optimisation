# Blocker Register

## Active blockers

### B-G7-002 — Released Tauri build schema rejects scaffold Windows build field

**Type:** Internal configuration/toolchain compatibility blocker.  
**State:** ACTIVE for G7-B.  
**Validated run:** `35609979477` / Desktop workflow #109.  
**Validated head:** `377fee7f2a0df2bbe2a035974cf8c42686a427ef`.

**What is closed:** The prior Tauri CLI version-probe defect is closed. The CI now invokes the locked workspace binary directly and progressed beyond that check.

**Failure:** `tauri-build 2.6.3` rejected:

```text
build.windows.staticVCRuntime
```

with:

```text
unknown field 'windows'
```

during the Rust/Tauri build path.

**Impact:** `cargo clippy` fails before Tauri NSIS packaging. No NSIS installer, checksum, build-manifest or GitHub package artefact was produced.

**Control constraint:** Do not modify the Desktop scaffold, architecture, Tauri/Rust versions or packaging model merely to clear the gate without an explicit controlled correction decision.

**Required action:** Authorise the narrow scaffold-configuration compatibility correction, then rerun G7-B.

**User action:** A decision is required before modifying the scaffold configuration.

## Resolved blockers

### B-G7-001 — Desktop scaffold required for full package CI

WP-G8.1 created `apps/admin-desktop`; this planned sequencing dependency is resolved.

### B-G7-PROBE-001 — Tauri CLI version probe returned npm version

Resolved by commit `377fee7f2a0df2bbe2a035974cf8c42686a427ef`, which invokes `node_modules/.bin/tauri.cmd --version` directly.

### B-G0-001 — GitHub repository integration access

Previous 403 integration condition is resolved. Repository read/write access and branch creation are available.

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
