# MIQOS Desktop Windows Signing Readiness v1.0

**Gateway:** G4
**Status:** READY — PRODUCTION SIGNING IDENTITY EXTERNAL

## Production signing requirement

Production-distributed MIQOS Admin executables/installers must be Authenticode-signed using an organisation-controlled trusted Windows code-signing identity.

Baseline:

- SHA-256 file digest
- trusted timestamping
- RFC 3161/TSP timestamping where supported by the signing provider
- certificate chain validation on supported Windows devices

## Private-key custody

The signing private key must never be committed to Git, bundled into the installer, exposed to PR builds or copied into normal developer machines for convenience.

Preferred model: managed/hardware-backed signing capability accessible only to the controlled release job.

Tauri supports standard Windows signing configuration and custom signCommand integration, allowing a managed external signing service.

## Pipeline insertion point

~~~text
compile
→ test
→ build Tauri binary
→ sign executable/native binaries
→ bundle NSIS installer
→ sign installer
→ verify signature + timestamp
→ calculate SHA-256
→ publish controlled artefact
~~~

G7 implements the exact signing provider integration.

## Production signing evidence

Record:

- publisher subject
- certificate thumbprint or managed key identifier
- validity window
- digest algorithm
- timestamp result
- signature verification
- installer SHA-256
- source commit
- CI/build ID
- release version

Never record private-key material.

## G8 mechanical proof

G8 may use an unsigned or policy-approved test-signed package. That proves packaging mechanics only and must not be described as production signing completion.

## UI-SIGN checkpoint

Production signing remains dependent on UI-SIGN:

- provision/authorise organisation-controlled Windows signing identity;
- grant least-privilege release-pipeline access;
- never paste/export the private key into chat/source;
- resume at release-signing integration without repeating G0-G4.
