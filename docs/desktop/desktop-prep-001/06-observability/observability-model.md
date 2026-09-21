# MIQOS Desktop Observability & Supportability Model v1.0

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G6 — Observability & Supportability
**Status:** FROZEN AT G6
**Date:** 2026-09-21

## 1. Objective

The Windows Admin Application must be supportable without turning diagnostics into a second source of MIQOS truth or a leakage path for sensitive evidence.

G6 separates:

1. operational application logs;
2. security/access audit;
3. immutable MIQOS domain/audit evidence;
4. support-bundle diagnostics.

These classes may correlate through identifiers, but they are not interchangeable.

## 2. Observability posture

Initial Desktop observability is **local-first and vendor-neutral**.

The baseline does not require a remote crash/telemetry SaaS to certify PREP.

The application produces:

- structured local operational logs;
- explicit startup/shutdown/version/environment records;
- request/trace correlation identifiers;
- renderer/native failure records;
- health/diagnostic status;
- an explicitly generated redacted support bundle.

Server-side API logging remains the platform's central operational record.

A later central telemetry/OpenTelemetry/vendor integration may be added through a separate operational/security decision without changing the G6 local support contract.

## 3. Layers

~~~text
Desktop React renderer
    │
    ├─ structured operational events
    │
    ▼
Tauri native logging boundary
    ├─ app lifecycle
    ├─ auth/config/transport outcomes
    ├─ crash/panic metadata
    └─ local rotated logs
             │
             ├──────────────┐
             │              │
             ▼              ▼
      support bundle   MIQOS API request
                          │ traceparent
                          ▼
                    Fastify API logs
                          │
                          ▼
               service/domain audit where applicable
~~~

## 4. What observability may prove

Operational observability may prove:

- which Desktop build/version ran;
- which deployment profile/environment was loaded;
- whether configuration validation passed;
- whether authentication/session steps succeeded or failed;
- whether the API was reachable;
- which correlation/trace identifier belongs to a request;
- how long an operation took;
- whether a renderer/native exception occurred;
- whether native capability/configuration was denied;
- package/runtime diagnostics.

It must not independently assert:

- factual truth;
- quote eligibility/rank;
- recommendation correctness;
- integrity PASS;
- provider certification;
- customer consent;
- business-state mutation success beyond the authoritative API response.

## 5. Production log level

Default production local log level: **INFO**.

WARN/ERROR are retained.

DEBUG/TRACE are disabled in normal production packages.

A future temporary diagnostic mode must be explicit, time-bounded, non-secret, auditable and must not enable raw payload/token logging.

DEVELOPMENT/TEST may use DEBUG where tests require it.

## 6. Time standard

All persisted operational log timestamps use UTC ISO-8601.

UI may render local time separately, but support artefacts retain UTC to correlate across Desktop/API/CI systems.

## 7. Supportability principle

A support engineer should be able to establish:

~~~text
who/which session (approved identifier)
which app build
which environment/profile
which machine/runtime class
which operation
which trace/request
what failed
when it failed
whether the API was reachable
~~~

without receiving tokens, passwords, raw provider payloads or unrestricted customer data.
