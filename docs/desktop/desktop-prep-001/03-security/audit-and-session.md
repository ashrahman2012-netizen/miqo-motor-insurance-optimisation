# MIQOS Desktop Security Audit & Session Requirements v1.0

**Gateway:** G3  
**Status:** FROZEN AT G3

## 1. Security event separation

Security/access audit is distinct from the existing immutable MIQOS domain/audit evidence.

Security logging must not rewrite domain history.

## 2. Required security events

At minimum:

- authentication started;
- authentication succeeded;
- authentication failed;
- session restored;
- token refresh succeeded/failed (without token data);
- logout;
- protected API access denied;
- native capability denied;
- raw-provider-evidence access;
- security configuration invalid/fail-closed;
- credential-store error.

## 3. Event fields

Where applicable:

```text
occurredAt
environment
subjectId or approved pseudonymous subject reference
clientAppVersion
buildId
sessionCorrelationId
operation
resourceType
resourceId (when appropriate)
outcome
reasonCode
traceId/correlationId
```

Never log:

- access tokens;
- refresh tokens;
- authorization codes;
- PKCE verifier;
- passwords;
- private keys;
- complete raw-provider payload merely because it was viewed.

## 4. Sensitive read audit

Access to raw provider-response evidence is a security-significant read and must be auditable server-side.

The audit event records who accessed which evidence identifier and outcome, not a duplicate of the payload.

## 5. Session controls

- explicit sign-in and sign-out;
- revalidation after expired credentials;
- no security-sensitive action when session state is ambiguous;
- no client-only privilege elevation;
- no hidden persistence of credentials after logout;
- multiple app windows, if ever enabled, share one native security session and cannot independently increase privilege.

## 6. Diagnostic boundary

G6 may define local operational logs, but security-event correlation must be possible without placing sensitive identity/token material in support bundles.

The user-visible support bundle must therefore be a filtered diagnostic product, not a raw copy of all security logs.
