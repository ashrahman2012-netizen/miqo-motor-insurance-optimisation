# MIQOS Desktop Canonical Build Contract v1.0

**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G7 — Build & CI/CD Preparation  
**Status:** FROZEN AT G7  
**Date:** 2026-09-21

## Canonical entry point

~~~powershell
./scripts/desktop-ci.ps1 -Mode Auto
~~~

Modes:

- `Preflight` — executable before the G8 Desktop scaffold exists.
- `Full` — requires `apps/admin-desktop` and produces the Windows package.
- `Auto` — canonical CI mode; chooses `Full` when the Desktop workspace exists, otherwise `Preflight`.

## Common stages

Both modes execute:

1. exact Node/npm verification;
2. exact Rust/Cargo verification;
3. `npm ci`;
4. dependency-pin verification;
5. synthetic/live-provider boundary verification;
6. application-adapter typecheck/tests;
7. shared UI typecheck/tests;
8. existing certified application build.

## Full-mode stages

Full mode additionally requires:

1. `apps/admin-desktop/package.json`;
2. `apps/admin-desktop/src-tauri/Cargo.toml`;
3. Desktop TypeScript typecheck;
4. Desktop tests;
5. Desktop frontend production build;
6. `cargo fmt --check`;
7. `cargo clippy -- -D warnings`;
8. `cargo test`;
9. Tauri release build targeting NSIS;
10. exactly one NSIS setup executable;
11. canonical artefact copy/rename;
12. SHA-256 sidecar;
13. build manifest.

## Required G8 workspace scripts

The G8 scaffold must expose these scripts under workspace `@miqo/admin-desktop`:

~~~text
typecheck
test
build
tauri
~~~

## Failure policy

Any command failure terminates the build.

The contract does not silently retry failed tests/builds, switch environment, relax the synthetic boundary, bypass type/lint failures or fabricate package evidence.

## Current state

Preflight is executable now.

Full mode is intentionally unavailable until WP-G8.1 creates the Desktop scaffold.
