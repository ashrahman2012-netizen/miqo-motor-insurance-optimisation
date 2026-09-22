# MIQOS Desktop Version & Diagnostic Identity v1.0

**Gateway:** G6
**Status:** FROZEN AT G6

## 1. Application identity

The Desktop application must expose, in an About/System/Diagnostics surface:

~~~text
productName
semanticVersion
buildId
sourceCommit
deploymentStage
applicationEnvironment
deploymentProfileId
deploymentProfileFingerprint
packageArchitecture
Tauri version
WebView2 runtime version where retrievable
Windows version/build
~~~

Tauri provides application-version access through its application API, and G4/G5 already define package/build/profile identity.

## 2. API identity

Supportability also requires safe server identity:

~~~text
API health status
API environment/classification
API build/service version when the platform later exposes it
server request ID for last relevant operation
~~~

The frozen current API health resource exposes status, dataClassification and liveProvidersEnabled, but not source/build identity.

A downstream observability extension is therefore recorded for server build/version metadata.

## 3. Diagnostics checks

The Desktop System/Diagnostics surface should show controlled status for:

- deployment-profile validation;
- application environment attestation;
- WebView2/runtime availability;
- OS credential-store availability;
- sign-in/session state;
- API reachability/health;
- current app/build identity;
- log-directory health/writability;
- support-bundle generation capability.

It must not expose:

- tokens;
- credential contents;
- raw provider payloads;
- hidden customer data;
- secret configuration values.

## 4. No self-certification

A green diagnostics page means the local/runtime checks passed.

It does not certify:

- live provider connectivity;
- regulatory compliance;
- integrity correctness;
- production go-live;
- signing trust beyond the signature verification actually performed.

## 5. User-visible error reference

Unexpected errors should expose a short support reference derived from safe correlation data, for example:

~~~text
Reference: 8f15c2ab
~~~

The reference is not a secret and can be supplied to support to locate the relevant log/trace.

## 6. Build provenance

G7 CI must stamp the Desktop deployment profile/build metadata from controlled source revision and build run.

G8 must prove the installed application reports the same identity as the produced package evidence.
