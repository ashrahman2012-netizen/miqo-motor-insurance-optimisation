# DB-G9 — Installed Windows Application & Package Lifecycle Proof
## Controller execution block

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Decision:** AUTHORISED  
**Status at opening:** NOT STARTED  
**Programme entry:** `c1fb5ad5349186030e10140deb5fd04ce7916f80`  
**Accepted executable predecessor:** `7e11769cf78c0d3e70082226d231316cee1b765c`

## 1. Objective

Produce exact-source executable evidence that the current MIQOS Admin Desktop package behaves correctly through the supported Windows lifecycle:

```text
controlled source
→ Windows x64 release build
→ NSIS package
→ checksum/provenance inspection
→ current-user install
→ installed launch + TEST/SYNTHETIC authenticated read
→ versioned upgrade
→ downgrade rejection
→ uninstall
→ post-uninstall verification
```

DB-G9 certifies package/lifecycle mechanics only. It does not authorise production distribution.

## 2. Frozen package model

Preserve the certified PREP design:

- Windows 11 x64 baseline;
- Tauri NSIS primary package;
- default current-user installation;
- no administrator elevation for the normal install;
- WebView2 Evergreen with embedded bootstrapper remediation;
- no initial Tauri self-updater;
- controlled versioned installer replacement;
- semantic-version increase for upgrade;
- downgrade blocked;
- no local authoritative MIQOS datastore;
- production Authenticode signing external to ordinary PR/BUILD execution.

Do not substitute a different installer technology or update model.

## 3. Mandatory package provenance

The DB-G9 evidence must record for the exact candidate package:

- package semantic version;
- installer filename;
- byte size;
- SHA-256;
- exact source commit;
- CI/build/run identity;
- Node version;
- npm version;
- Rust/Cargo version;
- Tauri CLI version;
- Windows target architecture;
- WebView2 install mode;
- signed/unsigned/test-signed state.

A package from a different source SHA is not DB-G9 evidence.

## 4. Installation proof

On the controlled Windows runner/machine prove:

1. checksum matches the produced artefact;
2. default silent/current-user install succeeds without elevation;
3. Windows Installed Apps/uninstall registration is current-user scoped;
4. package installs under the authorised per-user location;
5. Start Menu application entry exists;
6. no auto-start entry is added;
7. no Windows service/daemon is installed;
8. no firewall rule is added;
9. no protocol/file association is added unless already explicitly authorised (none currently is);
10. no machine-wide environment variable is added.

A machine-wide install or privileged service is not an acceptable substitute.

## 5. Runtime prerequisites and package inspection

Prove the installed package has no hidden client dependency on:

- Node/npm;
- Rust/Cargo;
- PostgreSQL/local MIQOS backend;
- Git;
- Visual Studio/build tools.

Verify WebView2 Evergreen is present or the configured bootstrapper remediation path is valid.

Inspect the package/install tree and reject evidence containing:

- `.env` secrets;
- OAuth tokens;
- signing private keys;
- database credentials;
- provider credentials;
- unexpected shell/sidecar binaries;
- release-prohibited development/debug material.

Devtools/CSP/native least-privilege boundaries from earlier gateways must remain intact.

## 6. Installed application proof

Launch from the installed location, not the build tree.

Using only the deterministic TEST/SYNTHETIC authority:

- prove the main window launches;
- prove package/version/build/source/environment identity is visible or otherwise captured by the installed proof;
- perform native OIDC Authorization Code + PKCE sign-in;
- prove SYNTHETIC / liveProviders=false boundary;
- execute at least one protected representative Admin read;
- prove tokens/credentials do not appear in renderer-visible state, ordinary logs or proof artefacts;
- close the installed application cleanly.

Real IdP registration is not required.

## 7. Upgrade proof

Build a controlled higher semantic version from the same authorised source content or an explicitly evidence-only version bump.

Prove:

- higher-version installer succeeds over the baseline;
- Windows registration reflects the higher version;
- installed executable/version identity changes to the higher version;
- only approved non-sensitive local settings/log ownership survive as designed;
- no local authoritative MIQOS data migration occurs because no such store is permitted.

Evidence-only version mutation must be restored before the final repository revision.

## 8. Downgrade proof

Attempt to install the older baseline package over the higher version.

Acceptance requires the older package **not** to replace the installed higher version.

Record:
- installer exit result;
- post-attempt registered version;
- installed executable version/state;
- explicit downgrade-rejected result.

Do not weaken the NSIS guard to make the test deterministic.

## 9. Uninstall proof

Using the registered uninstaller:

- uninstall succeeds;
- Installed Apps/uninstall registration is removed;
- installed application binaries are removed;
- Start Menu/package-owned shortcuts are removed;
- no service/firewall/protocol/machine-environment artefact remains;
- server-side MIQOS domain/audit data is not targeted or deleted.

Uninstall is not the sole credential lifecycle control; native logout/session revocation remains the security mechanism established in DB-G7.

## 10. Signing boundary

Production-distributed MIQOS installers must eventually be Authenticode-signed, but **production signing is not a DB-G9 prerequisite**.

DB-G9 may accept:
- unsigned TEST package; or
- policy-approved test-signed package.

Evidence must state the signature condition accurately.

DB-G9 MUST NOT:
- request or ingest the organisation signing private key;
- expose signing credentials to PR builds;
- claim unsigned/test-signed proof is production signing;
- publish a GitHub Release or deploy the package.

`D-G4-SIGN-001 / UI-SIGN` remains OPEN.

## 11. Existing G8 proof

The inherited `desktop-prep-g8` installed lifecycle proof already demonstrates much of the required mechanism and may be reused or extended.

However DB-G9 must create **dedicated DB-G9 evidence tied to its exact final source SHA**. A previous G8 PASS is predecessor evidence, not an automatic DB-G9 PASS.

Use the smallest implementation change possible. If the existing proof already satisfies a criterion, promote it into DB-G9 only by rerunning/capturing it at the DB-G9 candidate revision and documenting the result.

## 12. Required regression chain

At the final DB-G9 candidate source run:

- repository push CI;
- repository PR CI;
- Desktop G7 package CI;
- Desktop G8 API + installed regression;
- dedicated DB-G9 package lifecycle proof (new workflow/job or an explicitly DB-G9-labelled proof step);
- dependency/boundary checks;
- Desktop TypeScript tests/build;
- Rust format/clippy/tests;
- package checksum/provenance capture.

Cancelled or superseded runs are not acceptance evidence.

## 13. Required evidence

Create/update:

`docs/desktop/desktop-build-001/08-evidence/DB-G9/`

Minimum final evidence:

- `README.md`;
- `package-provenance.md`;
- `install-proof.md`;
- `runtime-prerequisites-and-inspection.md`;
- `installed-app-proof.md`;
- `upgrade-downgrade-proof.md`;
- `uninstall-proof.md`;
- `acceptance.md`.

Also update `06-packaging/README.md` and the control registers as supported by executable evidence.

Machine-readable proof JSON is strongly preferred for installer hash, source SHA, installed version, upgrade/downgrade/uninstall and prerequisite assertions.

## 14. Explicitly prohibited

DB-G9 does not authorise:

- production signing identity provisioning;
- GitHub Release publication;
- production deployment;
- self-updater activation;
- updater private-key material;
- STAGING/PRODUCTION environment activation;
- real provider connectivity;
- domain/API business changes;
- Admin mutation;
- new native business capability;
- direct database access;
- weakening downgrade protection;
- broadening install scope merely to pass automation;
- DB-G10 implementation.

## 15. Stop conditions

Stop and return to controller review if DB-G9 would require:

1. administrator/machine-wide authority not already in the frozen package contract;
2. a production signing credential;
3. a production/non-synthetic environment;
4. a new service, firewall rule, protocol handler or generic native capability;
5. a local authoritative MIQOS datastore;
6. a different installer/updater architecture;
7. weakening a prior security/domain invariant.

Routine build, test, NSIS, PowerShell, fixture or proof-harness repairs within this authority should be handled autonomously.

## 16. Acceptance

**DB-G9 = PASS** only when all package/lifecycle criteria are proved at one exact controlled candidate revision and the complete regression chain is green.

A PASS confirms:
- installed Windows application mechanics;
- package provenance;
- clean supported runtime dependency posture;
- controlled upgrade;
- downgrade rejection;
- uninstall cleanup.

A PASS does **not** certify production signing, deployment or go-live.

After DB-G9 PASS, DB-G10 remains closed until separately authorised.
