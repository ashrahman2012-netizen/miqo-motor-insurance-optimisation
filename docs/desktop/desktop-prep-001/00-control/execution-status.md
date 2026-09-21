# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G7 — Build & CI/CD Preparation
**Status:** PASS
**Execution branch:** miqos/desktop-prep-001
**Upstream certified branch:** miqos/app-build-001
**Upstream certified SHA:** ce211bf4e23643f1eab75e865210f4de121841fb
**Validated Desktop head:** 65d1b7b04a09aab787baaafd8addabacb0662265
**Validated PR merge revision:** 5c29a38aed48495ecf5e1c089da2ae7a8a52ee32
**Desktop CI:** Windows 2025 x64; canonical scripts/desktop-ci.ps1; exact Node/Rust toolchains
**Date:** 2026-09-21

## Current control position

G0 through G7 are PASS.

G7-A preflight is proven by:

- Desktop workflow run `35601094369` — SUCCESS;
- certified CI run `35601094316` — SUCCESS.

G7-B full package closure is proven by:

- Desktop workflow run `35615450461` / #130 — SUCCESS;
- job `106384830231` — SUCCESS;
- package detection — SUCCESS;
- package artefact upload — SUCCESS;
- certified CI run `35615450454` / #570 — SUCCESS;
- certified jobs `locked-dependencies`, `postgres-contract`, and `target-stack-sprint1` — all SUCCESS.

## Package evidence

GitHub Actions artefact:

```text
id:      10646138442
name:    miqos-admin-windows-x64-5c29a38aed48495ecf5e1c089da2ae7a8a52ee32
size:    3,079,468 bytes
digest:  sha256:795cd43a99da0d80311a1a87f1659d445eeb2fe31c8d05d5f54f3a61ebd58457
```

Artefact contents:

- `miqos-admin_0.1.0_windows-x64_nsis.exe`;
- installer SHA-256 sidecar;
- `Cargo.lock`;
- `build-manifest.json`.

Validated installer evidence:

```text
installer SHA-256:
a5e40412b3b9814c4d68d5e93c779f54cade1cd5ff4f4dec3d79e81c01e3c102

installer bytes:
2,963,575

Cargo.lock SHA-256:
b2f3cdeeef282c1fecc7c477066822fec0574163222f4bbafcb34c116be83e07
```

The manifest matches both hashes and records:

- product MIQOS Admin;
- version 0.1.0;
- x64 / NSIS;
- Node 22.16.0;
- npm 10.9.2;
- Rust/Cargo 1.98.1;
- Tauri CLI 2.11.4;
- SYNTHETIC;
- liveProviders=false;
- Authenticode status NotSigned.

The unsigned status is acceptable only for the G7/G8 mechanical package proof. Production signing remains governed by UI-SIGN and G9/release controls.

## Provenance interpretation

PR-triggered GitHub Actions checked out synthetic merge revision:

`5c29a38aed48495ecf5e1c089da2ae7a8a52ee32`

whose commit message records:

```text
Merge 65d1b7b04a09aab787baaafd8addabacb0662265
into ce211bf4e23643f1eab75e865210f4de121841fb
```

Therefore the successful package proves the exact controlled Desktop head against the frozen certified upstream baseline.

## Next controlled operation

Proceed to the **remaining G8 — Desktop Skeleton Proof**.

G8 must now prove the installed package/runtime behaviour, including the approved install/launch/uninstall and representative synthetic Admin proof scope.

G9 remains NOT STARTED.
