# MIQOS Desktop Authentication & Authorisation Contract v1.0

**Gateway:** G3  
**Status:** FROZEN AT G3

## 1. Authentication pattern

Client type: **native public client**.

Interactive sign-in:

```text
Desktop
 → system browser
 → OIDC/OAuth authorisation endpoint
 → user authentication / MFA policy at IdP
 → loopback redirect
 → Tauri auth broker
 → token endpoint with PKCE verifier
```

The Desktop binary contains no client secret.

The identity provider owns primary authentication controls such as passwordless/MFA/conditional access. MIQOS does not collect user passwords in its own WebView.

## 2. Token use

- API calls use an **access token**, not an ID token.
- Access tokens must be audience-restricted to the MIQOS API.
- Access tokens should be short-lived according to central IdP policy.
- Access tokens remain in native process memory and are not deliberately exposed to WebView JavaScript.
- Refresh tokens are optional and provider/policy dependent.
- If a refresh token is issued to this public client, it must use refresh-token rotation or sender-constraining as required by current OAuth security BCP.
- `offline_access` or equivalent is requested only when persistent sign-in has been explicitly approved.

## 3. Session lifecycle

Required session states:

```text
SIGNED_OUT
AUTHENTICATING
AUTHENTICATED
REAUTH_REQUIRED
NOT_AUTHORISED
EXPIRED
ERROR
```

Rules:

- one active MIQOS identity per Desktop process;
- account switch is explicit;
- no anonymous fallback for protected Admin resources;
- session restoration requires secure native credential material and successful token refresh/revalidation;
- workstation/app resume must re-check token validity before protected data access;
- client inactivity UI may request reauthentication, but server/IdP policy remains authoritative.

## 4. Logout

Logout must:

1. clear access/ID tokens from process memory;
2. delete persisted refresh credential from the OS credential store;
3. call the provider revocation/end-session mechanism where supported and policy requires;
4. clear sensitive in-memory/cached Admin ViewModels;
5. clear relevant WebView browsing data where required by the final implementation;
6. return to a signed-out shell.

Logout failures must be visible; local credential deletion is not skipped merely because remote revocation fails.

## 5. Authorisation model

MIQOS authorisation is **permission based and server enforced**.

The identity provider authenticates the subject. The MIQOS API maps trusted identity claims/group/role inputs into MIQOS permissions using server-side configuration.

The renderer never maps a user to a more privileged MIQOS role by itself.

### Initial G2-compatible permissions

```text
miqos.admin.case.read
miqos.admin.profile.read
miqos.admin.audit.read
miqos.admin.trace.read
miqos.admin.raw-evidence.read
miqos.admin.discrepancy.read
miqos.admin.integrity.read
miqos.admin.system.read
```

Only permissions backed by implemented resources need to be enabled.

`miqos.admin.raw-evidence.read` is deliberately separate because raw provider evidence is a higher-sensitivity Admin surface.

## 6. No write permissions at G3

There are no Desktop Admin business-state write permissions in the initial contract.

No equivalent of:

```text
miqos.admin.profile.write
miqos.admin.integrity.override
miqos.admin.audit.delete
miqos.admin.provider.activate
```

is authorised.

A future write permission requires the G2 mutation-admission process and a controlled security review.

## 7. Endpoint enforcement

Each protected route maps to a required permission.

Illustrative mapping:

| Resource | Required permission |
|---|---|
| `GET /admin/profiles/:profileId` | `miqos.admin.profile.read` |
| `GET /admin/profile-versions/:versionId` | `miqos.admin.profile.read` |
| `GET /admin/audit` | `miqos.admin.audit.read` |
| `GET /admin/selections/:selectionId/trace` | `miqos.admin.trace.read` |
| `GET /admin/selections/:selectionId/sp4-trace` | `miqos.admin.trace.read` |
| raw provider response read used by Admin | `miqos.admin.raw-evidence.read` |
| discrepancy evidence read used by Admin | `miqos.admin.discrepancy.read` |

A user with a broad external group name does not bypass endpoint permission evaluation.

## 8. Session descriptor contract

Desktop needs an authoritative session/identity descriptor after sign-in.

Logical shape:

```text
subjectId
displayName
environment
permissions[]
sessionExpiresAt
authenticationContext (non-sensitive summary)
```

The exact endpoint is a downstream API-security implementation decision. It must not expose raw tokens or unnecessary identity claims.

## 9. 401/403 handling

- `401`: clear unusable access state and initiate controlled reauthentication/session-expired state.
- `403`: remain authenticated, render NOT_AUTHORISED for the capability.
- repeated 401/403 must not trigger retry loops.
