# MIQOS Desktop Target Architecture v1.0

**Status:** FROZEN AT G1  
**ADR:** ADR-001

## Target repository shape

```text
apps/
├─ admin-web/                 certified web host; unchanged by G1
├─ admin-desktop/             new Desktop host
│  ├─ package.json
│  ├─ src/
│  │  ├─ app/                 React application composition
│  │  ├─ routes/              Desktop route components
│  │  ├─ services/            API/application orchestration
│  │  ├─ platform/            typed Desktop bridge abstraction
│  │  └─ main.tsx
│  └─ src-tauri/
│     ├─ Cargo.toml
│     ├─ tauri.conf.json
│     ├─ capabilities/
│     └─ src/
│        └─ lib.rs
└─ api/                       authoritative Fastify API

packages/
├─ application-contracts/     reuse
├─ application-adapters/      reuse
└─ ui/                        reuse where host-compatible
```

This is a logical target. Exact scaffold files are created only in the authorised skeleton/build gateway.

## Layer responsibilities

| Layer | Owns | Must not own |
|---|---|---|
| Desktop React UI | page composition, interaction intent, ViewModel rendering | domain rules, DB, privileged OS access |
| Desktop services | API calls, request orchestration, error/page-state translation | ranking/recommendation/integrity authority |
| application adapters | pure API→ViewModel mapping | network, persistence, React/Next, OS APIs |
| Tauri bridge/core | lifecycle and explicitly authorised OS capabilities | MIQOS business/domain authority |
| Fastify API | HTTP trust boundary/application orchestration | desktop rendering |
| domain/services | factual/optimisation/comparison/recommendation/integrity authority | desktop concerns |
| PostgreSQL | persistence | Desktop dependencies |

## Trust boundaries

```text
[Desktop renderer]
      │ typed request / narrow native invocation
      ├──────────────────────────► [Tauri Core / OS capability]
      │
      └── HTTPS/API ─────────────► [Fastify API]
                                      │
                                      ▼
                                [Domain / DB]
```

The renderer is not trusted with arbitrary native access. The Tauri core is privileged and therefore must expose only narrow commands/capabilities.

## Reuse policy

### Reuse directly

- application ViewModel types;
- application adapter composition;
- UI primitives/semantics;
- environment visual model;
- admin labels/canonical terminology.

### Adapt at host boundary

- navigation/routing;
- environment resolution;
- API transport;
- async loading/error state;
- browser/server-only assumptions.

### Do not reuse

- Next.js server runtime;
- Next route loaders/searchParams mechanics;
- direct `process.env` use in browser renderer;
- any future web-host-only middleware as Desktop security authority.

## Target runtime characteristics

- local packaged UI assets;
- WebView2 renderer;
- no embedded MIQOS database;
- no bundled local domain server;
- backend connectivity to authorised MIQOS API;
- fail-closed environment/security configuration;
- explicit version/build identity;
- OS capabilities default-denied unless enabled by policy.

## Deferred decisions

Owned by later gateways:

- G2: exact Admin capability/mutation boundary;
- G3: production identity, token handling, secure local storage;
- G4: installer type, WebView2 provisioning, signing/update;
- G5: config/environment precedence;
- G6: logging/support bundle;
- G7: Windows CI/build runner implementation.
