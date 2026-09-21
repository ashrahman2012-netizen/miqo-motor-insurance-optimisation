# MIQOS Desktop Support Bundle Contract v1.0

**Gateway:** G6
**Status:** FROZEN AT G6

## 1. Purpose

The support bundle is an explicitly generated, redacted diagnostic artefact.

It is not an automatic upload and is not a backup of MIQOS business data.

## 2. Generation

Support bundle generation is a narrow Tauri native capability available from the Desktop System/Diagnostics surface, including when API authentication/connectivity is unavailable.

The user/operator explicitly initiates creation and chooses a destination using an approved save dialog.

No automatic email/upload/transmission is introduced by G6.

## 3. Bundle format

Preferred:

~~~text
miqos-admin-support-<utc-timestamp>-<short-reference>.zip
~~~

Bundle contains a manifest plus selected redacted diagnostic files.

## 4. Required manifest

~~~text
schemaVersion
createdAtUtc
supportReference
appVersion
buildId
sourceCommit
packageArchitecture
deploymentStage
applicationEnvironment
deploymentProfileId
deploymentProfileFingerprint
Windows version/build
WebView2 version if available
Tauri/runtime version
last API health status
last safe trace/request references
logFilesIncluded[]
redactionPolicyVersion
~~~

## 5. Included by default

- support manifest;
- bounded recent MIQOS Desktop operational logs;
- crash/unclean-run marker metadata;
- configuration validation result and non-secret profile fingerprint;
- diagnostic check results;
- package/application identity.

## 6. Excluded

Support bundle must not contain:

- access/refresh/ID tokens;
- authorisation codes/PKCE verifier;
- Windows Credential Manager contents;
- signing/private keys;
- database/provider credentials;
- raw provider response payloads;
- full profile/customer payloads;
- browser cookies/storage dump;
- memory dump;
- arbitrary user files;
- server database/audit export.

## 7. Redaction

Before packaging, run a deterministic redaction/scanner over selected text files for:

- Authorization/Bearer values;
- cookie/session headers;
- known token/JWT patterns;
- URLs with credentials/query secrets;
- known secret-key configuration names;
- email/address/registration fields where encountered unexpectedly.

The bundle creation fails rather than silently include a file that cannot be safely processed.

## 8. Size/retention

Target maximum generated bundle size: **25 MiB**.

If logs exceed that bound, include the most recent redacted files required to stay within the limit and record omissions in the manifest.

The application does not retain generated bundles in its private application directory after saving to the operator-selected destination.

## 9. Integrity

Create and display a SHA-256 checksum for the generated zip so a support exchange can verify that the artefact was not changed in transit.

## 10. Support transfer

G6 does not create a support-ticket, email or upload integration.

The operator follows the organisation's approved support channel.

Any future automatic upload requires a separate security/privacy/data-retention design.
