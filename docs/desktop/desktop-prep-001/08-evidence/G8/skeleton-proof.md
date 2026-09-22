# G8 Evidence — Desktop Skeleton Proof

**Gateway:** G8 — Desktop Skeleton Proof
**Result:** PASS
**Date:** 2026-09-22

## Validated source revision

```text
d8eb075b894ead75b00f7a501a2acde032d7a6c3
```

The bounded correction adds an NSIS pre-install hook that reads the registered installed version, compares it with the incoming package version and aborts an older package before file copy. It does not change Tauri capabilities, native commands, CSP, API transport, application semantics or the security classification boundary.

The proof harness retains its independent post-attempt check that the installed 0.1.1 package remains registered after invoking the 0.1.0 installer.

## Same-head executable evidence

| Workflow | Run | Job | Result |
|---|---:|---:|---|
| `ci` #661 | `35736586648` | all mandatory jobs | SUCCESS |
| `desktop-prep-g7` #208 | `35736586650` | `106775275617` | SUCCESS |
| `desktop-prep-g8` #30 | `35736586909` | `106775277095` Windows installed proof | SUCCESS |
| `desktop-prep-g8` #30 | `35736586909` | `106775277382` API integration | SUCCESS |

## Completed Windows proof

The successful Windows job proves:

- locked Node/Rust/MSVC and dependency boundary;
- Desktop typecheck, tests and frontend build;
- Rust formatting, Clippy with warnings denied and Rust tests;
- Tauri release and NSIS package generation;
- current-user install and installed application launch;
- controlled API-unavailable state and safe retry;
- SYNTHETIC/ATTESTED environment evidence;
- structured local logging assertions;
- installed-runtime independence from development tools/services;
- 0.1.0 → 0.1.1 upgrade;
- rejection of the 0.1.0 downgrade attempt without replacement evidence;
- silent uninstall;
- proof artefact upload.

## Evidence artefacts

```text
Windows proof artefact: 10698328970
digest: sha256:49974751bd01a4cce48b837cbe8c98eaf4ef740a2608e46580bca1401afd69a8

API proof artefact: 10697247792
digest: sha256:565d383a990a29f37871f2f2daae2c3b48435358318a5b00f2f16008d7a8cc85

G7 package artefact: 10699045077
digest: sha256:c33a935edbaafb00ca26ecd9b14f00226a36ce05778cf75c980ce261eeec78ec
```

## Gate conclusion

G8 is PASS. The Windows installed Desktop skeleton proof is complete on the validated source revision. G9 PREP certification and final evidence review are now authorised; production signing and real-environment dependencies remain separately controlled.
