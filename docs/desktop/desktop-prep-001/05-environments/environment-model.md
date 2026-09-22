# MIQOS Desktop Environment Model v1.0

**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G5 — Environment & Configuration Model  
**Status:** FROZEN AT G5  
**Date:** 2026-09-21

## 1. Principle

Desktop configuration must distinguish:

1. **deployment stage** — where/how the Desktop package is operated;
2. **application environment** — the MIQOS data/provider classification already defined by the certified application contract;
3. **server authority** — what the connected API/provider platform is actually authorised to do.

These are related but are not interchangeable.

A Desktop package cannot activate live-provider capability merely by changing a local setting.

## 2. Canonical deployment stages

Desktop deployment stage:

```text
DEVELOPMENT
TEST
STAGING
PRODUCTION
```

Certified application environment remains:

```text
SYNTHETIC
CERTIFICATION
PRODUCTION
```

as already defined by `@miqo/application-contracts`.

## 3. Canonical mapping

| Deployment stage | Application environment | Purpose |
|---|---|---|
| DEVELOPMENT | SYNTHETIC | local developer engineering against synthetic/local services |
| TEST | SYNTHETIC | deterministic CI/integration/skeleton verification |
| STAGING | CERTIFICATION | controlled pre-production/provider/security certification environment |
| PRODUCTION | PRODUCTION | authorised production operation only |

The mapping is deliberately strict.

A future exceptional mapping requires explicit change control rather than an ad-hoc local override.

### Important

`STAGING → CERTIFICATION` does **not** enable live provider activity.

Provider connectivity and any live quotation/provider capability remain server/platform-authorised and separately certified.

## 4. Current certified upstream constraint

The frozen MIQOS application/API baseline currently permits only:

```text
MIQO_DATA_CLASSIFICATION=SYNTHETIC
MIQO_LIVE_PROVIDERS_ENABLED=false
```

and fails startup if that prototype boundary is violated.

Therefore the currently certified target stack can support the DEVELOPMENT/TEST synthetic profiles only.

STAGING/CERTIFICATION and PRODUCTION/PRODUCTION profiles are architectural deployment profiles for later authorised platform capability; they are not claimed executable against the frozen synthetic backend today.

## 5. Package identity by environment

To prevent credential, WebView and local-state crossover:

| Stage | Product label | Tauri identifier |
|---|---|---|
| DEVELOPMENT | MIQOS Admin [DEV] | `com.miqos.admin.desktop.dev` |
| TEST | MIQOS Admin [TEST] | `com.miqos.admin.desktop.test` |
| STAGING | MIQOS Admin [CERTIFICATION] | `com.miqos.admin.desktop.certification` |
| PRODUCTION | MIQOS Admin | `com.miqos.admin.desktop` |

The G4 production identifier remains unchanged.

Non-production suffix identities are controlled packaging profiles, not production identifier changes.

## 6. Visible environment identity

Environment identity must be conspicuous and authoritative.

Desktop renders the existing `ApplicationEnvironmentVM` semantics:

- SYNTHETIC — persistent synthetic/test indication;
- CERTIFICATION — persistent controlled certification indication;
- PRODUCTION — production identity without pretending certification/live-provider authority that the server has not granted.

The Desktop title/about/system surfaces must also expose deployment stage and build identity.

## 7. User selection prohibited

Installed users cannot select or type:

- deployment stage;
- API URL;
- OIDC issuer;
- OIDC client ID;
- API audience;
- data classification;
- provider activation mode.

These are deployment-controlled.

A user-editable environment switcher is prohibited.

## 8. Environment isolation

At minimum, environments require distinct:

- Tauri application identifiers/state namespaces;
- native OAuth client registrations;
- API base URLs;
- protected API configuration;
- release artefact identity/provenance;
- credential-store keys;
- application log/support-bundle environment labels.

Production credentials/configuration must never be accepted by a non-production package solely because values are technically compatible.
