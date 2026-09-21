# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G6 — Observability & Supportability
**Status:** PASS
**Execution branch:** miqos/desktop-prep-001
**Upstream certified branch:** miqos/app-build-001
**Upstream certified SHA:** ce211bf4e23643f1eab75e865210f4de121841fb
**Desktop architecture:** Tauri 2 + React/TypeScript
**Observability architecture:** local-first structured logs + W3C trace correlation + redacted explicit support bundles
**Date:** 2026-09-21

## Current control position

G0 through G6 are complete.

G6 freezes:

- local-first vendor-neutral operational observability;
- production INFO/WARN/ERROR structured local logs;
- bounded rotation/retention: 5 MiB per file, max 5 files, max 7 days;
- prohibition on token/raw-provider/customer-payload logging;
- W3C traceparent for Desktop→API distributed correlation;
- separate server-generated request ID;
- renderer error-boundary/unhandled failure capture;
- native panic and unclean-run metadata;
- no automatic memory dumps or third-party crash upload;
- version/build/environment/runtime diagnostics;
- explicit redacted support bundles with a 25 MiB target maximum and SHA-256;
- a support runbook separating operational evidence from security/domain audit authority.

The current API requires a controlled downstream observability extension for validated trace-context correlation and server build/version metadata.

The next controlled gateway is:

G7 — Build & CI/CD Preparation
