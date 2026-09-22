# G5 Evidence — Environment & Configuration Model

**Gateway:** G5  
**Result:** PASS  
**Date:** 2026-09-21  
**ADR:** `05-environments/adr/ADR-004-bundled-deployment-profile.md`

## Repository evidence

The certified baseline establishes:

- application-facing environment values: SYNTHETIC, CERTIFICATION, PRODUCTION;
- current web environment resolution from MIQO_APPLICATION_ENVIRONMENT / MIQO_DATA_CLASSIFICATION;
- current API prototype boundary requiring MIQO_DATA_CLASSIFICATION=SYNTHETIC;
- current API startup rejection when live-provider activity is enabled;
- CI explicitly sets SYNTHETIC and liveProviders=false;
- GET /health reports dataClassification and liveProvidersEnabled;
- .env.example contains local-development endpoint/config inputs.

The certified BUILD-001J manifest states:

- certification class is internal engineering synthetic target stack;
- data classification is SYNTHETIC;
- live-provider activity is DISABLED;
- production go-live is not authorised;
- live-provider certification is not authorised.

## Current external platform evidence

Tauri documentation confirms:

- frontendDist may be a local asset path embedded into the application binary;
- the application identifier is used in system configuration including WebView data-directory identity;
- Tauri exposes application-specific config/data/log paths if later required;
- Tauri/Vite development uses build environment variables for frontend tooling.

Vite documentation confirms:

- VITE_-prefixed values are exposed to client code and bundled;
- VITE_ variables must not contain sensitive information;
- a blank envPrefix is unsafe and rejected.

## G5 decisions

1. Separate deployment stage from MIQOS application/data environment.
2. Canonical mapping:
   - DEVELOPMENT → SYNTHETIC
   - TEST → SYNTHETIC
   - STAGING → CERTIFICATION
   - PRODUCTION → PRODUCTION
3. User-selectable environment switching is prohibited.
4. Each installed package receives one immutable bundled non-secret deployment profile.
5. Native core loads/validates the profile; renderer receives only a sanitised ViewModel.
6. Installed security endpoints/environment cannot be overridden by process/user config.
7. Development may generate the same profile schema from ignored local inputs.
8. Production/non-production use distinct Tauri identifiers and credential/WebView state namespaces.
9. Vite/client environment variables are not secret/configuration authority.
10. Desktop preflights server environment evidence and fails closed on mismatch.
11. Server authority can restrict capability further; Desktop config cannot upgrade it.
12. Feature flags are non-authoritative, allow-listed, bundled and user-noneditable.
13. No flag may activate live providers, production, Admin mutation, auth bypass or dormant methodology.
14. Current frozen backend supports only DEVELOPMENT/TEST synthetic profiles; STAGING/PRODUCTION remain future authorised platform profiles.
15. Normal TLS trust is used initially; unmanaged certificate pinning is not introduced.

## G5 exit criteria

| Criterion | Result |
|---|---|
| dev/test/staging/prod model defined | PASS |
| application/data environment separated from deployment stage | PASS |
| configuration authority/preference order defined | PASS |
| API and IdP endpoint selection defined | PASS |
| secrets excluded from client-visible configuration | PASS |
| feature-flag rules defined | PASS |
| environment mismatch/fail-closed behaviour defined | PASS |
| production/non-production local state isolation defined | PASS |
| current synthetic certification boundary preserved | PASS |
| no certified application/API source modified | PASS |

## Gateway decision

**G5 = PASS**

Next controlled gateway:

`MIQOS-DESKTOP-PREP-001 / BC-06 / G6 — Observability & Supportability`
