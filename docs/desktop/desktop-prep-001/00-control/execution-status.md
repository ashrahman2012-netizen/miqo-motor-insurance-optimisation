# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G7 — Build & CI/CD Preparation
**Status:** PARTIAL PASS — G7-A PASS / G7-B PENDING G8.1
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

G7 cannot honestly close as PASS until Full mode produces a real NSIS artefact and a full CI run passes.

That evidence depends on WP-G8.1 creating apps/admin-desktop, which the original blueprint deliberately assigns to G8.

## Next controlled operation

G8 / WP-G8.1 — Desktop Scaffold ONLY

Immediately after that scaffold exists:

G7-B — Full Package CI Closure

must execute before the remainder of G8.
