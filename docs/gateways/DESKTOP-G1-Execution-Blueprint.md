# DESKTOP-G1 — Distributable Runtime & Local Persistence Architecture

**Branch:** `miqo/desktop-g1`  
**Entry:** DESKTOP-G0 certified SHA `6e6da34f5e1f802ad62a70d69724b34de2f813ba`  
**Tracker:** issue #11  
**Status:** CONTROLLED EXECUTION

## Architecture

### Web applications
Use Next.js standalone production output. Static export is rejected because MIQO relies on runtime dynamic routes and admin middleware.

### Node runtime
The distributable stages an exact Node 22.16.0 executable. Runtime proof must start API/customer/admin without the repository root `node_modules` tree.

### API
The existing Fastify API is bundled with esbuild for Node 22. Domain/services remain authoritative.

### Persistence
The preferred embedded persistence target is **PGlite**, not SQLite. PGlite preserves PostgreSQL dialect/schema semantics while eliminating the external PostgreSQL server. External PostgreSQL remains the reference until parity is proven.

SQLite/SQLCipher is retained only as a fallback if PGlite cannot satisfy the certified constraints.

## Gate order

1. G1.0 architecture inventory/decision.
2. G1.1 standalone production customer/admin outputs.
3. G1.2 bundled API + exact staged Node runtime.
4. G1.3 PGlite adapter/schema parity.
5. G1.4 PGlite restart/integrity/recommendation contracts.
6. G1.5 Tauri resource/sidecar integration.
7. G1.6 no-host-Node/npm/Docker/PostgreSQL proof.
8. G1.7 inherited + dedicated CI.
9. G1.8 closure.

## Boundary

Synthetic only. No merge, release, signing, deployment, real IdP, live provider/customer data or production infrastructure mutation.
