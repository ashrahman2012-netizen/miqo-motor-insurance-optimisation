# G1 Current-State Architecture Inventory

**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G1 — Desktop Architecture Decision  
**Status:** FROZEN INPUT TO ADR  
**Date:** 2026-09-21

## 1. Existing application shape

The certified application baseline is an npm-workspaces TypeScript/React system:

```text
apps/admin-web        Next.js / React admin application
apps/customer-web     Next.js / React customer application
apps/api              Fastify API / PostgreSQL integration
packages/application-contracts
packages/application-adapters
packages/ui
packages/domain and service packages
```

The certified dependency direction is:

```text
PostgreSQL
    ↓
DB / domain / service packages
    ↓
Fastify API
    ↓
application contracts / ViewModels
    ↓
customer-web / admin-web
```

Desktop must preserve that direction.

## 2. Reusable application assets

### Framework-neutral / directly reusable

- `@miqo/application-contracts`: typed ViewModel contracts.
- `@miqo/application-adapters`: pure API DTO → ViewModel composition; it does not own network transport.
- domain and backend authority remain server-side.
- audit/recommendation/integrity semantics remain backend-owned.

### React/browser reusable

- `@miqo/ui`: React presentation primitives, environment UI, shell and semantic components.
- The package does not depend on Next.js and is therefore reusable in a desktop WebView, subject to route/navigation adaptation.

### Web-app-specific and not directly reusable as Desktop host logic

- `apps/admin-web/app/admin-shell.tsx` depends on `next/navigation`.
- admin routes are Next.js route/server components.
- environment resolution reads server-side `process.env`.
- audit loading uses application-level `fetch` orchestration inside the Next app.
- route `searchParams` semantics are Next-specific.

The Desktop architecture must reuse the contracts/adapters/UI semantics without embedding Next.js as a required desktop server runtime.

## 3. Existing admin capability

The certified Admin surface currently proves:

- admin navigation shell;
- Audit & Trace console;
- exact persisted lineage;
- append-only audit timeline;
- raw provider response kept distinct from normalised quotation evidence;
- integrity/discrepancy visibility;
- environment/governance status.

The existing Admin Audit loader composes server responses through `@miqo/application-adapters`; this is a strong candidate for reuse behind a Desktop-specific API client/application service.

## 4. Security/deployment constraints inherited from certified baseline

- Production authentication/RBAC is not certified by APP-BUILD-001.
- Live-provider activity remains disabled in the certified baseline.
- Admin UI must not gain direct DB access.
- UI must not recalculate authoritative domain outcomes.
- Environment identity is trusted application context, not user-selectable presentation state.
- No Desktop framework may weaken the synthetic/live-provider boundary.

## 5. G1 architectural implication

A desktop shell that can execute React/TypeScript while isolating OS privileges is materially more compatible with the certified application architecture than a native UI rewrite.

The host must therefore:

1. keep the Fastify API as the authoritative application/domain boundary;
2. reuse existing typed ViewModels and presentation semantics;
3. keep OS/native capabilities behind a narrow explicit bridge;
4. avoid a bundled local database or duplicated domain engine;
5. avoid requiring a local Next.js production server merely to render the Desktop UI.
