# MIQOS Desktop Trust Boundary v1.0

**Gateway:** G2  
**Status:** FROZEN AT G2

## 1. Trust zones

```text
┌─────────────────────────────────────────────┐
│ User / Windows interactive session          │
└──────────────────────┬──────────────────────┘
                       │ UI events
                       ▼
┌─────────────────────────────────────────────┐
│ Tauri WebView renderer                      │
│ React + Desktop services + MIQOS ViewModels │
│ Trust: unprivileged presentation zone       │
└──────────────┬───────────────────┬──────────┘
               │ HTTPS/API         │ typed native invocation only
               ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│ Fastify API              │  │ Tauri Core / Rust           │
│ Trust: application/API   │  │ Trust: privileged local OS  │
│ boundary                 │  │ capability boundary         │
└─────────────┬────────────┘  └──────────────┬───────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│ Domain/services          │  │ Windows OS facilities       │
└─────────────┬────────────┘  │ secure store/files/update   │
              ▼               │ only when later authorised  │
┌──────────────────────────┐  └──────────────────────────────┘
│ PostgreSQL               │
└──────────────────────────┘
```

## 2. Boundary rules

### User → renderer

User input is untrusted input.

Renderer validation may improve UX but does not replace server validation.

### Renderer → API

The API is the authority for MIQOS application/domain operations.

The renderer must:

- send typed requests;
- consume authoritative outcomes;
- surface backend rejection reasons;
- avoid local domain-rule substitution.

### Renderer → Tauri core

This is a privilege transition.

Default rule: **deny unless explicitly exposed**.

G3 must later define capability permissions. Generic shell execution, unrestricted filesystem access and broad native HTTP proxying are outside the G2 boundary.

### Tauri core → OS

The core may access only OS facilities required by authorised Desktop responsibilities.

The core must not gain domain authority simply because it is native/privileged.

### API → domain/DB

Existing certified service/domain/database controls remain authoritative and unchanged by Desktop.

## 3. Sensitive evidence boundary

Admin views may legitimately surface technical evidence unavailable to customer surfaces, including raw provider evidence.

That evidence:

- remains API sourced;
- must not be copied into customer-facing contracts;
- must be protected by the G3 identity/authorisation model;
- must be redacted from logs/support bundles according to G6;
- must not be written to arbitrary local files by default.

## 4. Environment boundary

The renderer does not decide whether an environment is trusted.

Environment identity/configuration is supplied through the G5-approved deployment/runtime path and rendered through the existing environment ViewModel semantics.

Unknown environment = fail closed.

## 5. Remote-content boundary

The Desktop UI is packaged local application content.

Loading arbitrary remote pages/scripts into the privileged application WebView is outside the approved architecture.

Remote connectivity is data/API connectivity, not remote executable UI.

## 6. Data-flow rule

Authoritative data flows down:

```text
DB/domain → API → adapter/ViewModel → Desktop UI
```

User intent flows up:

```text
UI intent → application service → authorised API command
```

A future authorised command must be server-validated and audited. G2 does not grant any such admin command merely by defining the upward direction.
