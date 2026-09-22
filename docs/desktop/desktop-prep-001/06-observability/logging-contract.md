# MIQOS Desktop Structured Logging Contract v1.0

**Gateway:** G6
**Status:** FROZEN AT G6

## 1. Logging implementation family

Use Tauri's maintained logging integration (tauri-plugin-log or an equivalently controlled Rust logging target) with the application log directory.

Windows default location follows the Tauri application log path under the current user's Local AppData and the environment-specific Tauri identifier.

Production file output must use a machine-parseable one-record-per-line structured format, preferably JSON Lines.

## 2. Core log schema

Each record should contain only fields that apply:

~~~text
timestampUtc
level
component
eventCode
message
appVersion
buildId
sourceCommit
deploymentStage
applicationEnvironment
profileId
sessionCorrelationId
traceId
serverRequestId
operation
durationMs
outcome
reasonCode
resourceType
resourceId
~~~

The schema is an operational envelope, not a requirement to populate every field.

## 3. Components

Expected component names include:

~~~text
desktop.bootstrap
desktop.config
desktop.auth
desktop.transport
desktop.renderer
desktop.native
desktop.support
desktop.update
~~~

Server-side API logs remain separate and may use their own component/service labels.

## 4. Event-code requirement

Operationally meaningful records use stable event codes instead of relying only on free text.

Examples:

~~~text
APP_START
APP_READY
APP_SHUTDOWN
CONFIG_VALID
CONFIG_INVALID
ENV_ATTEST_PASS
ENV_ATTEST_FAIL
AUTH_START
AUTH_SUCCESS
AUTH_FAILURE
TOKEN_REFRESH_FAILURE
API_REQUEST_COMPLETE
API_REQUEST_FAILURE
CAPABILITY_DENIED
RENDERER_ERROR
NATIVE_PANIC
SUPPORT_BUNDLE_CREATED
SUPPORT_BUNDLE_FAILED
~~~

## 5. Prohibited fields/content

Never log:

- access token;
- refresh token;
- ID token;
- authorisation code;
- PKCE verifier;
- password;
- client/private key;
- code-signing private material;
- raw HTTP Authorization/Cookie headers;
- raw provider response body;
- full profile/customer payload;
- database connection string/password;
- full support bundle content;
- arbitrary request/response bodies.

URLs must have query/fragment/user-info removed before logging unless a specifically approved safe field is required.

## 6. Sensitive identifiers

Opaque MIQOS technical IDs may be logged only when needed for correlation and subject to G6 support use.

Human names, addresses, registration numbers and other direct personal data are not operational log fields by default.

Subject identity should use an approved stable/pseudonymous subject reference rather than display name/email unless a security audit specifically requires otherwise.

## 7. Errors

Errors are logged as:

- controlled error class/code;
- safe message;
- operation;
- correlation identifiers;
- stack trace in DEVELOPMENT/TEST where appropriate;
- sanitised native stack/backtrace in production only when it does not contain prohibited data.

Do not serialise arbitrary exception/request objects wholesale because they may contain credentials or payloads.

## 8. Rotation and retention

Initial production local policy:

- 5 MiB maximum per active log file;
- rotation enabled;
- keep at most 5 application log files;
- maximum local retention 7 days;
- whichever limit is reached first triggers deletion of oldest files.

The implementation may use the Tauri log plugin's size/rotation support plus application startup pruning to enforce the bounded count/age.

TEST/DEVELOPMENT may use shorter or ephemeral retention.

## 9. Output targets

Production:

- local application log files only;
- no automatic WebView console mirroring;
- no remote telemetry by default.

DEVELOPMENT/TEST:

- local file plus console may be enabled.

## 10. Log failure

Failure to write non-security operational logs must not silently grant capability or change MIQOS domain behaviour.

Security-critical failures that require an audit record follow the G3 server-side security-audit policy and fail closed where that policy requires it.
