# G6 Evidence — Observability & Supportability

**Gateway:** G6
**Result:** PASS
**Date:** 2026-09-21
**ADR:** 06-observability/adr/ADR-005-local-first-observability.md

## Repository evidence

The certified baseline shows:

- Fastify API is instantiated with logging enabled;
- GET /health exposes status, dataClassification and liveProvidersEnabled;
- current Admin UI already exposes exact lineage/fingerprints and controlled error states;
- canonical Admin information architecture reserves a System area;
- domain/audit evidence is already a distinct authoritative class;
- application certification explicitly avoids fabricating support-ticket/messaging capability.

No existing Desktop logging/crash/support-bundle implementation exists because the Desktop scaffold has not yet been created.

## Current external evidence

Official Tauri documentation confirms:

- tauri-plugin-log supports Windows;
- it can write to the application log directory;
- on Windows that log location is under LocalAppData using the application identifier;
- file size limits and rotation are configurable;
- log level/filtering and custom formatting are configurable;
- plugin commands remain capability controlled;
- Tauri exposes application version APIs.

Fastify documentation confirms:

- Fastify logs request IDs for request tracking;
- externally supplied request-ID headers require care because caller values are not validated by default.

W3C Trace Context defines traceparent/tracestate as vendor-neutral distributed trace propagation fields and requires identifiers not to carry personally identifying data.

## G6 decisions

1. Local-first, vendor-neutral baseline.
2. Production local logging at INFO/WARN/ERROR.
3. Structured one-record-per-line log schema.
4. 5 MiB per file, max 5 files, max 7-day local retention.
5. No tokens, raw provider payloads or customer request/response bodies in logs.
6. W3C traceparent for Desktop→API correlation.
7. Server keeps its own request ID; caller trace context is separately validated.
8. Renderer error boundary + unhandled-error/rejection capture.
9. Native panic metadata + unclean-run marker.
10. No automatic process-memory dump collection.
11. No automatic remote crash/telemetry upload.
12. Explicit redacted support bundle, max target 25 MiB, SHA-256 generated.
13. System/Diagnostics surface exposes version/build/environment/runtime health.
14. Operational logs remain distinct from security audit and immutable MIQOS domain/audit.
15. API trace/build metadata extension is downstream controlled work.

## G6 exit criteria

| Criterion | Result |
|---|---|
| structured logging model defined | PASS |
| sensitive-data logging rules defined | PASS |
| retention/rotation defined | PASS |
| Desktop/API correlation defined | PASS |
| crash/failure handling defined | PASS |
| version/build reporting defined | PASS |
| diagnostic health model defined | PASS |
| support bundle defined and redacted | PASS |
| domain/security/operational evidence separated | PASS |
| operator support runbook defined | PASS |
| no certified application/API source modified | PASS |

## Gateway decision

**G6 = PASS**

Next controlled gateway:

MIQOS-DESKTOP-PREP-001 / BC-07 / G7 — Build & CI/CD Preparation
