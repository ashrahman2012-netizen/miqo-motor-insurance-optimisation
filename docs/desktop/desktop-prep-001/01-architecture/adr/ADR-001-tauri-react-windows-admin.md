# ADR-001 — Tauri 2 + React/TypeScript Windows Admin Application

**Status:** ACCEPTED  
**Date:** 2026-09-21  
**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G1

## Context

MIQOS already has a certified React/TypeScript application layer, typed ViewModels, pure application adapters, shared React UI semantics, a Fastify API and backend-owned domain/integrity rules.

The Windows Admin Application must:

- preserve certified semantics;
- avoid direct DB coupling;
- support controlled Windows packaging/signing;
- support future OS-secure credential/storage capabilities;
- minimise privileged desktop surface;
- avoid unnecessary duplication of the certified UI/application model.

The current `apps/admin-web` host is Next.js-specific and includes server-component/routing/environment assumptions that should not become a Desktop runtime dependency.

## Decision

Create a new workspace:

```text
apps/admin-desktop
```

using:

- **Tauri 2** as the Windows Desktop host;
- **React 19 + TypeScript** for the renderer;
- a conventional client-side build tool suitable for Tauri (Vite-class SPA build; exact dependency pinned at scaffold);
- existing `@miqo/application-contracts`;
- existing `@miqo/application-adapters`;
- existing `@miqo/ui` where components are host-compatible;
- existing `apps/api` as the authoritative remote application/domain boundary.

### Process model

```text
Windows OS
  │
  ├─ Tauri Core (Rust)
  │    ├─ window/lifecycle
  │    ├─ tightly scoped native capabilities
  │    └─ future secure credential/storage bridge as authorised by G3
  │
  └─ WebView2 renderer
       ├─ React/TypeScript UI
       ├─ Desktop route/application orchestration
       ├─ @miqo/ui
       ├─ @miqo/application-contracts
       └─ @miqo/application-adapters
                │
                ▼
       controlled HTTPS/API client
                │
                ▼
          Fastify API
                │
                ▼
       domain/services/PostgreSQL
```

## Native-boundary rule

The Rust core is **not** a second MIQOS domain backend.

It must not own:

- quote ranking;
- factual classification;
- optimisation policy;
- recommendation logic;
- integrity decisions;
- audit reconstruction;
- provider-specific domain transformations.

Native commands/plugins are allowed only for OS-level responsibilities authorised by later gateways, such as:

- application/version identity;
- secure credential/storage operations;
- file/save dialogs where genuinely required;
- controlled diagnostics;
- update lifecycle;
- package/runtime integration.

All such capabilities must be least-privilege and explicitly enabled.

## Renderer rule

The renderer must not:

- receive unrestricted filesystem/shell access;
- import `@miqo/db`;
- import backend domain/service packages to reimplement server authority;
- load remote executable UI code;
- treat local storage as authoritative MIQOS state.

The application shell and UI are packaged local assets. Remote network activity is API/data traffic only.

## API transport rule

Network calls belong to a Desktop application-level client/service, not shared presentation components and not `@miqo/application-adapters`.

The transport implementation must remain replaceable so G3 may introduce a secure token broker/credential bridge without changing ViewModel/domain semantics.

## Environment rule

Desktop environment selection is deployment/configuration authority and must fail closed when unresolved. The exact configuration precedence is frozen in G5.

## Navigation rule

Next.js routing is not reused. Desktop uses app-local client routing/navigation while preserving canonical admin route semantics and labels.

No change to `apps/admin-web` is required by this decision.

## Packaging rule

Tauri's Windows bundle path is the selected packaging family. G4 decides:

- MSI versus NSIS primary installer;
- WebView2 provisioning mode;
- application identity;
- install scope;
- signing/timestamping;
- update strategy;
- uninstall/rollback controls.

## Security rule

G3 must harden the selected architecture with:

- restrictive CSP;
- least-privilege Tauri capabilities;
- no generic shell/filesystem bridge;
- origin/connect restrictions;
- production authentication design;
- secure local-data/token policy;
- audit of privileged Desktop commands.

## Consequences

### Positive

- maximises reuse of certified React/ViewModel assets;
- avoids a native UI rewrite;
- provides a smaller and narrower host than a bundled Chromium/Node runtime;
- creates an explicit OS privilege boundary;
- retains backend domain authority;
- leaves the certified web Admin application untouched.

### Negative / new engineering burden

- Rust/MSVC toolchain is introduced;
- Windows/WebView2 behaviour becomes part of supported runtime;
- CI must install/cache Rust tooling;
- Next.js-specific route/page code must be adapted into Desktop page composition;
- Tauri security configuration becomes a certification artefact.

## Rejected alternatives

- Electron: viable fallback, but higher runtime/privilege servicing burden for current needs.
- WinUI 3: strong native solution but disproportionate rewrite/contract-duplication cost.
- PWA-only: insufficiently aligned with the controlled Windows application/package programme.

## Reversal trigger

Revisit this ADR only if G4/G8 proves one of the following:

1. required Windows deployment policy cannot accept the Tauri installer/runtime model;
2. WebView2 is prohibited on target admin devices;
3. a mandatory native Windows capability cannot be safely implemented through the selected host;
4. Tauri's build/signing path cannot meet required enterprise controls.

Any reversal requires a new ADR; do not silently substitute Electron or WinUI.
