# MIQOS Desktop Release Pipeline v1.0

**Gateway:** G7  
**Status:** FROZEN AT G7

## Controlled stages

~~~text
source revision
   ↓
ordinary CI
   ├─ locked dependencies
   ├─ certified shared-baseline checks
   ├─ Desktop TS/Rust checks
   └─ unsigned NSIS + checksum + provenance
   ↓
release-candidate approval
   ↓
protected release/signing stage
   ├─ source/provenance verification
   ├─ Authenticode signing
   ├─ timestamp
   ├─ signature verification
   ├─ final checksum
   └─ release provenance
   ↓
authorised publication/deployment
~~~

## PR rule

Production signing credentials are never available to PR builds.

## Signing insertion point

`UI-SIGN` remains the external dependency.

When provisioned, release evidence records:

- signing identity/key reference;
- publisher subject;
- timestamp result;
- signature verification;
- final checksum;
- source commit;
- release/CI run ID.

No private signing key is stored as an artefact.

## Publication

G7 does not authorise automatic GitHub Release publication or endpoint deployment.

Those actions require downstream release/deployment governance.

## Updater

The Tauri self-updater remains disabled under G4.

Initial releases are versioned signed NSIS replacement installers.
