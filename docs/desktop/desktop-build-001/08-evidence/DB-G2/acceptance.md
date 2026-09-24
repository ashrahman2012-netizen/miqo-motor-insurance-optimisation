# DB-G2 acceptance — Desktop Application Foundation

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G2 — Desktop Application Foundation  
**Result:** PASS  
**Date:** 2026-09-22  
**Entry SHA:** `6e7328aa326859b8500dc1f7c1aaf1ac6511ffb8`  
**Accepted executable source:** `34ab244b28e6f97f89bc823e18232986e31e1144`

## Implemented foundation

DB-G2 replaces the G8 proof-only React entry surface with the real Windows Admin application foundation while retaining the previously proven native/API/package boundary.

Accepted implementation includes:

- canonical 13-area Admin navigation from the DB-G1 IA;
- packaged in-app routing without a new routing dependency;
- dynamic read-only profile/profile-version/selection-trace route recognition;
- shared `@miqo/ui` AppShell, environment semantics, layout primitives, page states and status semantics;
- local-only Admin navigation command field with an explicit no-global-business-search statement;
- Dashboard foundation with no fabricated KPIs/aggregates;
- inherited representative TEST/SYNTHETIC safe-read proof retained on the Dashboard;
- System route with safe build/runtime/deployment-profile identity;
- honest READ-ONLY, TRACE-DERIVED, RESERVED and not-found route states;
- removal of obsolete `ScaffoldApp`, `ScaffoldRoute`, scaffold identity and scaffold-only test;
- DB-G2 pure route/foundation tests.

No deep case/audit/trace application is claimed. Those remain DB-G4/DB-G5.

## Exact source delta

`6e7328aa326859b8500dc1f7c1aaf1ac6511ffb8` → `34ab244b28e6f97f89bc823e18232986e31e1144`:

- one commit ahead / zero behind;
- application changes confined to `apps/admin-desktop/src/**` and `apps/admin-desktop/test/**`;
- BUILD status/evidence docs under `docs/desktop/desktop-build-001/**`;
- no `src-tauri`, API, shared-package, dependency, workflow, database or lockfile change.

The executable source commit is:

`DESKTOP BUILD DB-G2: implement application foundation`

## Repository CI — exact branch source

Push `ci` #675 / run `35766441270`, head `34ab244b28e6f97f89bc823e18232986e31e1144`: **SUCCESS**

- target-stack-sprint1 job `106877060762` — SUCCESS
- postgres-contract job `106877061005` — SUCCESS
- locked-dependencies job `106877061084` — SUCCESS

PR `ci` #676 / run `35766445688`, associated head `34ab244b28e6f97f89bc823e18232986e31e1144`: **SUCCESS**

- postgres-contract job `106877074913` — SUCCESS
- target-stack-sprint1 job `106877075411` — SUCCESS
- locked-dependencies job `106877076291` — SUCCESS

## Windows Desktop G7 proof

`desktop-prep-g7` #213 / run `35766445779`: **SUCCESS**

Job `106877076275` — Windows Desktop preflight/full — SUCCESS.

The canonical Desktop CI log records successful stages including dependency pins, SYNTHETIC boundary, Desktop typecheck, Desktop tests, Desktop frontend build, Rust formatting, Clippy, Rust tests and Tauri NSIS build, ending in `DESKTOP_G7_FULL_PASS`.

Artifact:

- ID `10712319639`
- name `miqos-admin-windows-x64-2884adb0bab21ec75676caab039f7e825bad2fcb`
- digest `sha256:76c53c481a27241d7e0b511e12ea755f7f3c0287f3090e1a601748cc1bf27f80`

## Windows installed G8 regression proof

`desktop-prep-g8` #33 / run `35766445697`: **SUCCESS**

- Windows installed Desktop skeleton proof job `106877076310` — SUCCESS
- Desktop service / certified API integration job `106877076555` — SUCCESS

Windows job evidence includes:

- dependency pin PASS;
- prototype SYNTHETIC boundary PASS;
- Desktop typecheck PASS;
- Desktop tests PASS;
- Desktop frontend build PASS;
- Rust/Tauri package build PASS;
- `DESKTOP_G7_FULL_PASS`;
- installed UI/lifecycle proof ending `DESKTOP_G8_WINDOWS_PROOF_PASS`.

G8 artifacts:

- Windows proof ID `10712703007`, digest `sha256:acb2c9f3a6ad345f93e57580a5a43b37ace492a9b0e025923c43c532eab995e1`
- API proof ID `10712336904`, digest `sha256:7a13b058890933023567a5231e26664d6f9c01b9c98b6089d2bd01e509efdac3`

The API job retained the existing Desktop application-service proof, Admin Audit adapter proof and environment-attestation negative test.

## PR merge provenance

PR #6 remained draft/unmerged with:

- base SHA `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`;
- head SHA `34ab244b28e6f97f89bc823e18232986e31e1144`;
- GitHub synthetic merge SHA `2884adb0bab21ec75676caab039f7e825bad2fcb`.

The Windows G7/G8 artifact names correctly record the synthetic PR merge SHA. They are **not** misrepresented as exact branch-SHA packages. Exact branch-source regression is independently provided by push CI #675; the Windows proof validates the PR merge composed from the frozen G9 base and DB-G2 head.

## Installed-proof compatibility retained

The installed proof successfully continued to verify the inherited UI contract around the new application shell:

- controlled API-unavailable state;
- safe “Retry safe read” action;
- TEST/SYNTHETIC identity;
- ATTESTED environment result;
- representative `PRO-SYN-001` evidence;
- “Profile created” audit evidence;
- CI build identity;
- structured logging;
- runtime independence;
- install/launch;
- upgrade;
- downgrade rejection;
- uninstall;
- CSP/capability/direct-DB negative controls.

The representative fixed synthetic profile remains proof harness evidence, not a product case-list/search implementation.

## Boundary review

| Question | Result |
|---|---|
| Domain/business semantics changed? | No |
| Direct database access introduced? | No |
| Admin mutation introduced? | No |
| New API resource introduced? | No |
| Tauri/native command or capability changed? | No |
| Environment authority changed? | No |
| Identity/security authority changed? | No |
| Dependency/lockfile changed? | No |
| Workflow changed? | No |
| Live-provider capability introduced? | No |

## Exit

**DB-G2 = PASS.**

DB-G3 — Native Platform, Transport & Environment Boundary remains **NOT STARTED** and requires a separate controlled execution step.

This gateway does not certify deep Admin evidence surfaces, production identity/RBAC, non-synthetic environments, production signing, provider activation or release/go-live.
