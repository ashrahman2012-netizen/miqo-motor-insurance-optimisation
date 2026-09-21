# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G7 — Build & CI/CD Preparation
**Status:** PARTIAL PASS — G7-A PASS / WP-G8.1 CREATED / G7-B BLOCKED
**Execution branch:** miqos/desktop-prep-001
**Upstream certified branch:** miqos/app-build-001
**Upstream certified SHA:** ce211bf4e23643f1eab75e865210f4de121841fb
**Desktop CI:** Windows 2025 x64; canonical scripts/desktop-ci.ps1; exact Node/Rust toolchains
**Date:** 2026-09-21

## Current control position

G0 through G6 are PASS.

G7-A is complete and live Windows CI-proven:

- canonical Windows build entry point exists;
- actual GitHub Actions Windows workflow exists;
- Windows 2025 x64 runner selected;
- Node 22.16.0 / npm 10.9.2 retained;
- Rust/Cargo 1.98.1 selected;
- MSVC toolchain verification included;
- full-SHA action pinning and least-privilege workflow permissions frozen;
- caches disabled for the initial controlled path;
- NSIS artefact naming/checksum/manifest contract defined;
- Authenticode signing insertion point defined;
- release pipeline defined;
- Windows Desktop preflight run `35601094369` passed;
- existing certified CI run `35601094316` passed all three required jobs on the same validated head.

WP-G8.1 now exists and Full mode executes.

The original Tauri CLI version-probe defect is closed. Commit `377fee7f2a0df2bbe2a035974cf8c42686a427ef` invokes the locked `node_modules/.bin/tauri.cmd` directly.

Dedicated Desktop run `35609979477` / #109 progressed through:

- npm ci;
- dependency pin verification;
- SYNTHETIC boundary verification;
- application-adapter typecheck/tests;
- shared UI typecheck/tests;
- certified application build;
- corrected Tauri CLI version probe;
- Desktop/Rust build path up to `cargo clippy`.

It then failed because released `tauri-build 2.6.3` rejected `build.windows.staticVCRuntime` in `tauri.conf.json` as an unknown field.

No NSIS artefact, SHA-256, build-manifest or package upload exists yet.

Because the current controlled instruction prohibits changing the scaffold merely to clear G7-B, the gateway remains blocked pending an explicit scaffold-configuration correction decision.

## Next controlled operation

Resolve only the G7-B Tauri configuration-schema blocker under controlled change.

Do not proceed into the remainder of G8.

After an authorised correction, rerun G7-B and require:

- Desktop typecheck/tests/build;
- cargo fmt/clippy/test;
- Tauri NSIS package;
- SHA-256;
- Cargo.lock evidence;
- build-manifest.json;
- GitHub package artefact.

G7 remains PARTIAL PASS until that evidence exists.
