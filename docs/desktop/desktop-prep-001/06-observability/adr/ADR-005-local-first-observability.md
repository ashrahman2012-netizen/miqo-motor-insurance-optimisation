# ADR-005 — Local-First Structured Observability with Explicit Redacted Support Bundles

**Status:** ACCEPTED
**Date:** 2026-09-21
**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G6

## Context

MIQOS Admin handles sensitive operational evidence.

Support needs correlation and diagnostics, but automatic third-party telemetry or full crash dumps would create additional data-export, privacy and secret-handling obligations that are not required to prove the first Desktop architecture.

Tauri provides local file logging, filtering, custom formatting and rotation.

The current Fastify API already uses structured logging/request IDs, but Desktop trace propagation is not yet a frozen interface.

## Decision

Use a vendor-neutral local-first model:

- structured local Tauri/Rust/renderer operational logs;
- INFO default production level;
- bounded rotation/retention;
- W3C Trace Context for Desktop/API correlation;
- separate server-generated request ID;
- renderer error boundary and native panic/crash metadata;
- no automatic memory-dump collection;
- no automatic third-party telemetry upload;
- explicit redacted support-bundle generation;
- build/environment/runtime identity in the Desktop System/Diagnostics surface.

## Why

This creates sufficient supportability for G8 and initial controlled deployment while reducing the risk of exporting customer/provider/security material.

It also preserves future compatibility with OpenTelemetry or another central telemetry system because trace correlation uses a vendor-neutral standard.

## Consequences

### Positive

- bounded local data footprint;
- no observability vendor lock-in;
- support can correlate Desktop and API incidents;
- token/raw-evidence leakage controls are explicit;
- support bundle is deterministic and user/operator initiated.

### Negative

- no fleet-wide crash dashboard initially;
- support bundle exchange remains operational/manual;
- server/API trace-context support must be implemented as a platform extension;
- local logs can be unavailable if the user's profile/disk is damaged.

## Future central telemetry

A future central exporter/crash service requires a separate decision covering security, privacy, retention, endpoint ownership and data-processing obligations.

It must preserve the G6 log/redaction/trace contracts rather than bypass them.
