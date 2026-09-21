# MIQOS Desktop Crash & Failure Handling v1.0

**Gateway:** G6
**Status:** FROZEN AT G6

## 1. Failure classes

~~~text
controlled application error
renderer unhandled error/rejection
native command error
native Rust panic
process crash/abnormal termination
configuration/security fail-closed event
API/network outage
~~~

These conditions are handled differently and must not be collapsed into a generic empty UI state.

## 2. Renderer failures

The Desktop renderer must include:

- top-level React error boundary;
- global unhandled error listener;
- unhandled promise rejection listener.

On unexpected renderer failure:

1. generate a safe error reference;
2. log sanitised metadata;
3. present an ERROR/recovery screen;
4. retain build/environment/support-bundle access;
5. do not expose raw stack/error payload to normal users.

## 3. Native failures

Rust/native boundary must:

- return typed command failures where recovery is possible;
- install a panic hook that writes sanitised panic metadata to the operational log;
- avoid printing credentials/request bodies;
- allow process termination when continuing would be unsafe.

## 4. Crash marker

On clean startup, create/update a current-run marker containing only:

- run/session correlation ID;
- app version/build;
- startup time.

On normal shutdown, mark the run clean.

If a later startup detects an unclean previous run, record:

~~~text
PREVIOUS_RUN_UNCLEAN
~~~

with the previous run reference and provide the user/support UI with an option to generate diagnostics.

## 5. Memory/core dumps

MIQOS does not deliberately collect or package process memory dumps by default.

Reason: memory may contain access tokens, decrypted response data or sensitive customer/provider evidence.

A full/minidump may be collected only under a separately authorised diagnostic procedure with explicit security/data-handling controls.

Windows Error Reporting may operate according to the device/organisation OS policy, but MIQOS support bundles do not automatically collect WER dumps.

## 6. Automatic crash upload

No automatic third-party crash upload is enabled by the G6 baseline.

A future crash service must define:

- data processor/vendor;
- payload schema;
- UK/EU data handling;
- retention;
- environment scope;
- consent/employee-notice implications;
- redaction;
- sampling;
- security review.

## 7. Recovery

Permitted recovery actions:

- retry safe read;
- reauthenticate after auth failure;
- restart application;
- generate support bundle;
- use controlled installer repair/reinstall path if binaries are corrupt.

Do not automatically replay a future mutation after a crash unless a separately designed idempotency contract authorises it.
