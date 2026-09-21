# G7 Evidence — Full Windows Package CI Closure

**Gateway:** G7-B — Full Package CI Closure  
**Result:** PASS  
**Date:** 2026-09-21

## Validated source revisions

Controlled Desktop head:

```text
65d1b7b04a09aab787baaafd8addabacb0662265
```

Frozen certified upstream:

```text
ce211bf4e23643f1eab75e865210f4de121841fb
```

GitHub PR synthetic merge revision used by the successful package workflow:

```text
5c29a38aed48495ecf5e1c089da2ae7a8a52ee32
```

GitHub records that revision as:

```text
Merge 65d1b7b04a09aab787baaafd8addabacb0662265
into ce211bf4e23643f1eab75e865210f4de121841fb
```

## Successful dedicated Desktop workflow

```text
workflow: desktop-prep-g7
run:      35615450461
run #:    130
job:      106384830231
result:   SUCCESS
```

The following workflow stages all completed successfully:

- checkout;
- exact Node setup;
- exact Rust toolchain selection;
- MSVC toolchain verification;
- canonical Desktop Full CI contract;
- packaged artefact detection;
- package evidence upload.

## Same-head certified CI

```text
workflow: ci
run:      35615450454
run #:    570
result:   SUCCESS
```

Required certified jobs:

- `locked-dependencies` — SUCCESS;
- `postgres-contract` — SUCCESS;
- `target-stack-sprint1` — SUCCESS.

## GitHub Actions artefact

```text
artifact id:
10646138442

artifact name:
miqos-admin-windows-x64-5c29a38aed48495ecf5e1c089da2ae7a8a52ee32

archive size:
3,079,468 bytes

GitHub artefact digest:
sha256:795cd43a99da0d80311a1a87f1659d445eeb2fe31c8d05d5f54f3a61ebd58457
```

The downloaded archive digest was independently recomputed and matched GitHub's digest exactly.

## Archive contents

The artefact contains exactly the expected evidence set:

```text
build-manifest.json
miqos-admin_0.1.0_windows-x64_nsis.exe
miqos-admin_0.1.0_windows-x64_nsis.exe.sha256
Cargo.lock
```

## Installer evidence

```text
filename:
miqos-admin_0.1.0_windows-x64_nsis.exe

bytes:
2,963,575

SHA-256:
a5e40412b3b9814c4d68d5e93c779f54cade1cd5ff4f4dec3d79e81c01e3c102
```

The installer SHA-256 independently recomputed from the downloaded executable matches:

1. the sidecar checksum file; and
2. `build-manifest.json`.

## Cargo.lock evidence

```text
SHA-256:
b2f3cdeeef282c1fecc7c477066822fec0574163222f4bbafcb34c116be83e07
```

The independently recomputed lockfile hash matches `build-manifest.json`.

## Manifest evidence

The manifest records:

```text
schemaVersion:          miqos-desktop-artifact-v1
product:                MIQOS Admin
version:                0.1.0
architecture:           x64
installer:              NSIS
sourceCommit:           5c29a38aed48495ecf5e1c089da2ae7a8a52ee32
buildId:                35615450461
node:                   v22.16.0
npm:                    10.9.2
rustc:                  1.98.1
cargo:                  1.98.1
tauriCli:               2.11.4
dataClassification:     SYNTHETIC
liveProvidersEnabled:   false
authentiCodeStatus:     NotSigned
```

## G7-B correction trail

The final successful run followed evidence-led correction of narrow package/CI defects only:

1. Tauri CLI version probe argument handling;
2. invalid explicit `build.windows.staticVCRuntime` configuration;
3. missing required Windows resource icon;
4. Tauri NSIS command forwarding;
5. PowerShell single-result collection handling for the NSIS artefact.

No correction changed:

- domain/business logic;
- certified API behaviour;
- Tauri version;
- Rust version;
- NSIS/current-user packaging model;
- SYNTHETIC/live-provider boundary.

## Signing boundary

The package is intentionally unsigned:

```text
authentiCodeStatus = NotSigned
```

This is acceptable for G7/G8 mechanical package proof only.

It does not satisfy production release signing. UI-SIGN and G9/release controls remain applicable.

## G7-B decision

**PASS**

G7 overall is therefore **PASS**.

The remaining G8 Desktop Skeleton Proof is authorised.
