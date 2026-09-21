# G8 Evidence — Desktop Skeleton Proof

**Gateway:** G8 — Desktop Skeleton Proof  
**Current result:** IN EXECUTION — API/PACKAGE PROOF PASS / INSTALLED PROOF BLOCKED  
**Date:** 2026-09-21

## Validated application source revision

```text
3346a5cd713242c8997a25586df753171bf6d9e4
```

This revision is an empty-content retrigger commit over the Clippy-converged source tree. Comparing it with the preceding formatter commit shows zero file changes.

The Clippy convergence source delta from pre-correction head `d75a82b82088e38297714c25d8d9d2d37055896b` is confined to:

```text
apps/admin-desktop/src-tauri/src/lib.rs
```

and contains only:

- two `map_err` → `inspect_err` logging transformations;
- one descending `sort_by` → `sort_by_key(std::cmp::Reverse(...))` transformation;
- rustfmt layout.

## Certified regression evidence

Normal repository CI on the validated source:

```text
workflow: ci
run:      35624013703
run #:    637
result:   SUCCESS
```

Desktop G7 regression:

```text
workflow: desktop-prep-g7
run:      35624013728
run #:    189
job:      106414122940
result:   SUCCESS
```

The G7 regression completed:

- canonical Desktop Full contract — SUCCESS;
- Rust formatting — SUCCESS;
- Rust Clippy with warnings denied — SUCCESS;
- Rust tests — SUCCESS;
- Tauri NSIS build — SUCCESS;
- packaged artefact detection — SUCCESS;
- Desktop package evidence upload — SUCCESS.

Historical G7 closure therefore remains valid and the current G8 source is green against the G7 regression guard.

## G8 API/application-service lane

```text
workflow: desktop-prep-g8
run:      35624013907
job:      106414115309
result:   SUCCESS
```

Proved:

- PostgreSQL 16 service;
- certified migrations;
- certified Fastify API startup;
- TEST/SYNTHETIC health contract;
- Desktop application service;
- existing Admin Audit adapter/ViewModel composition;
- contradictory environment/provider classification fails closed;
- API proof artefact upload.

## G8 Windows package lane

```text
workflow: desktop-prep-g8
run:      35624013907
job:      106414115119
package build stage: SUCCESS
installed proof stage: FAILURE
```

The Windows job successfully completed:

- checkout;
- Node 22.16.0;
- Rust/Cargo 1.98.1;
- MSVC verification;
- locked npm dependency restore;
- dependency/security boundary verification;
- Desktop typecheck;
- Desktop tests;
- Desktop frontend build;
- `cargo fmt --check`;
- `cargo clippy -- -D warnings`;
- `cargo test`;
- Tauri release build;
- NSIS package generation.

The log records:

```text
Finished 1 bundle:
...\bundle\nsis\MIQOS Admin [TEST]_0.1.0_x64-setup.exe

DESKTOP_G7_FULL_PASS
```

Therefore the Clippy convergence objective is complete and the NSIS/package substrate remains healthy.

## Active installed-proof blocker

The installed proof starts with PowerShell strict mode enabled.

At `scripts/desktop-g8-proof.ps1:33`, machine uninstall-registry enumeration currently executes:

```powershell
Get-ItemProperty $path -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -eq $ProductName }
```

At least one registry object returned by the hosted Windows runner has no `DisplayName` property.

PowerShell therefore terminates under strict mode with:

```text
The property 'DisplayName' cannot be found on this object.
```

This failure occurs in the proof harness before installation assertions.

It is not evidence of failure in:

- Tauri capability configuration;
- native command permissions;
- CSP;
- deployment profile;
- native API transport;
- structured logging semantics;
- Tauri release compilation;
- NSIS generation.

## Unproven G8 criteria

The following remain unproven and must not be inferred from the successful build:

- installed package registration/scope;
- installed application launch;
- controlled API-unavailable UI;
- safe retry against SYNTHETIC loopback service;
- visible SYNTHETIC/ATTESTED evidence;
- installed structured-log assertions;
- runtime independence from Node/npm/Rust/Cargo/PostgreSQL/libpq;
- 0.1.0 → 0.1.1 upgrade;
- downgrade rejection;
- silent uninstall;
- installed-proof artefact upload.

## Next controlled operation

Correct only the registry filtering in `scripts/desktop-g8-proof.ps1` so registry entries without `DisplayName` are safely ignored while strict mode remains enabled.

Then rerun the permanent `desktop-prep-g8` workflow.

G8 may be marked PASS only when the installed proof and proof artefact upload complete successfully.
