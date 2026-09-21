# MIQOS-DESKTOP-PREP-001 — Execution Status

**Programme:** MIQOS-DESKTOP-PREP-001
**Gateway:** G5 — Environment & Configuration Model
**Status:** PASS
**Execution branch:** miqos/desktop-prep-001
**Upstream certified branch:** miqos/app-build-001
**Upstream certified SHA:** ce211bf4e23643f1eab75e865210f4de121841fb
**Desktop architecture:** Tauri 2 + React/TypeScript
**Configuration authority:** immutable bundled deployment profile + server environment attestation
**Date:** 2026-09-21

## Current control position

G0 through G5 are complete.

G5 freezes:

- separate deployment-stage and application/data-environment axes;
- DEVELOPMENT→SYNTHETIC, TEST→SYNTHETIC, STAGING→CERTIFICATION, PRODUCTION→PRODUCTION;
- no user-selectable environment/API/IdP switching;
- one validated non-secret deployment profile bundled per installed package;
- native-core configuration authority rather than renderer/Vite environment authority;
- distinct Tauri identifiers/state namespaces for DEV, TEST, CERTIFICATION and PRODUCTION;
- environment/API health attestation with fail-closed mismatch handling;
- feature flags as non-authoritative, allow-listed, bundled configuration only;
- no secrets in client-visible/Vite-bundled configuration.

The frozen certified backend currently supports only SYNTHETIC with live providers disabled. Certification/production backend authority remains controlled future platform work.

The next controlled gateway is:

G6 — Observability & Supportability
