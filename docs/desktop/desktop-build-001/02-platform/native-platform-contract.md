# DB-G3 native platform contract

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G3 — Native Platform, Transport & Environment Boundary  
**Status:** FROZEN AT DB-G3

## Boundary implemented

The current TEST/SYNTHETIC package retains a narrow native transport. The renderer cannot supply a full URL, HTTP method, arbitrary header, API origin, deployment stage, application environment, OIDC issuer/client ID, feature flag or live-provider mode.

Current native commands remain:

- `get_runtime_profile`;
- `get_health`;
- `load_admin_profile_audit(profileId)`.

The HTTP implementation is private to Tauri core and uses typed `ApiReadOperation` variants. Current operations map only to:

- `GET /health`;
- `GET /admin/audit?profileId=:profileId`;
- `GET /profiles/:profileId/discrepancies`.

No generic HTTP command is exported.

## Route input control

Profile IDs are accepted only when non-empty, at most 100 ASCII characters and composed of alphanumeric, hyphen or underscore characters. Slash, query, fragment, whitespace and traversal-shaped values are rejected before path construction.

## Origin / method / redirect boundary

The TEST package accepts only the bundled API base `http://127.0.0.1:4000`. It is an explicitly synthetic local exception to the future HTTPS requirement.

All current requests are GET. Redirect following is disabled. Responses are limited to 2 MiB before deserialisation.

## Deployment-profile boundary

The bundled profile must match the current authorised package identity exactly:

```text
schema        miqos-desktop-config-v1
profile       test-synthetic
stage         TEST
environment   SYNTHETIC
API           http://127.0.0.1:4000
audience      miqos-api-test
OIDC issuer   https://identity.test.invalid
client        miqos-admin-test-public
scopes        openid profile
features      {}
```

Unknown feature flags fail validation. STAGING/CERTIFICATION and PRODUCTION/PRODUCTION are **not enabled** by this implementation; CC-G5-001 remains open.

## Attestation

Protected representative Admin evidence still requires:

```text
API status = ok
data classification = SYNTHETIC
live providers = false
```

Contradiction returns `DESKTOP_ENVIRONMENT_ATTESTATION_FAILED`; there is no fallback endpoint or environment reinterpretation.

## Tauri capability / WebView

The main window capability is `admin-read` and contains only the three approved command permissions. CSP remains packaged-local and renderer `connect-src` remains self-only. No shell, filesystem, process, broad HTTP or remote-content capability is granted.

## Deferred boundaries

DB-G3 does not implement real OIDC/token brokerage, secure refresh-token storage or API bearer attachment; those remain DB-G7/CC-G3-001. It does not enable real STAGING/PRODUCTION profiles; those remain CC-G5-001. It does not add new Admin endpoints for DB-G4/DB-G5.
