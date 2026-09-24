# DESKTOP-G0 — Runtime Architecture & Executable Skeleton

**Branch:** `miqo/desktop-app-001`  
**Certified base:** `245edbe261d3a1b66d07bd4edf618db98945a566`  
**Tracker:** issue #10  
**Environment:** SYNTHETIC / local loopback only  
**Promotion:** not authorised

## Purpose

DESKTOP-G0 proves that the already-certified MIQO web/API/domain stack can be hosted by a real native desktop executable without rewriting the domain model or weakening the synthetic-only controls.

## Runtime architecture

```text
Tauri 2 native shell (Rust)
        |
        +-- owns local PostgreSQL developer/test lifecycle (Docker Compose)
        +-- runs existing migrations
        +-- owns Fastify API on 127.0.0.1:4000
        +-- owns customer Next app on 127.0.0.1:3000
        +-- owns admin Next app on 127.0.0.1:3001
        |
        +-- native WebView -> customer /prototype
              |
              +-- customer -> API
              +-- controlled synthetic handoff -> admin
```

The domain/services/PostgreSQL model remains authoritative. Python is not introduced into the business-rule path.

## G0 controls

1. **Native shell:** Tauri `2.11.5`, exact Rust `1.98.1`, existing proven Cargo lock.
2. **Fail-closed prototype boundary:** desktop startup rejects any non-`SYNTHETIC` classification or live-provider enable flag.
3. **Persistence:** G0 uses the existing PostgreSQL 16 Docker Compose service and current migrations. Embedded persistence is deferred.
4. **Loopback network:** application services bind only to `127.0.0.1`; native WebView navigation is restricted to customer/admin loopback ports.
5. **Admin:** existing synthetic admin gate remains required. No real authentication claim is made.
6. **Lifecycle ownership:** the shell owns child processes it starts and terminates them in reverse order; if it starts PostgreSQL it stops it at shutdown.
7. **No release boundary:** bundling/signing/deployment are disabled for this gate.

## Executable acceptance proof

Dedicated CI must prove:

- native Tauri binary compiles from the committed Cargo lock;
- native window reaches a finished page-load event for the customer application;
- API health reports `SYNTHETIC` and live providers disabled;
- the shell-owned stack passes the existing Sprint 4 customer recommendation journey;
- the shell-owned stack passes the existing Sprint 4 admin trace journey;
- accessibility/browser-security/synthetic-admin/abuse tests pass against the shell-owned services;
- clean app exit leaves no API/customer/admin listener and stops shell-owned PostgreSQL;
- inherited repository CI remains GREEN on the same branch head.

## Deferred decisions

DESKTOP-G0 does **not** decide:

- PostgreSQL vs SQLite/SQLCipher for distributable desktop persistence;
- final Windows/macOS/Linux packaging;
- code signing/notarisation;
- auto-update;
- real IdP/session architecture;
- production logging/telemetry;
- live insurer/provider integration.

Those require later controlled gateways.

## Closure rule

DESKTOP-G0 may be marked PASS only when the exact branch head has:
1. GREEN dedicated `desktop-g0` CI;
2. GREEN inherited repository `ci`;
3. native-window, customer journey, admin diagnostics and clean-shutdown evidence;
4. unchanged synthetic/no-live-provider boundary;
5. no merge/release/deploy/signing/real-IdP/live-provider action.
