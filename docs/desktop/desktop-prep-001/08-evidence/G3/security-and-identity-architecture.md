# G3 Evidence — Security & Identity Architecture

**Gateway:** G3  
**Result:** PASS  
**Date:** 2026-09-21  
**ADR:** `03-security/adr/ADR-002-native-auth-and-secure-transport.md`

## Repository findings

The certified application baseline:

- has no production authentication/RBAC implementation in the current Fastify server;
- exposes current Admin-specific HTTP resources as read-only;
- contains sensitive Admin evidence such as raw provider responses and complete decision lineage;
- already treats route guards as UX/journey controls rather than security authority;
- explicitly defers production authentication integration from the application certification.

Therefore Desktop security cannot be achieved by UI route hiding or by reusing the current unauthenticated API unchanged in a production-capable environment.

## Standards/current-platform evidence reviewed

- RFC 8252 requires native apps to use an external user-agent for OAuth authorisation and requires PKCE for public native clients; it documents loopback redirects for traditional Windows desktop applications.
- RFC 9700 requires refresh tokens for public clients to be sender-constrained or use refresh-token rotation and recommends audience restriction/least privilege.
- Tauri 2 runtime authority enforces command permissions/capabilities before invoking native commands.
- Tauri CSP is opt-in configuration and should be made restrictive; remote scripts/content expand attack surface.
- Windows Credential Manager supports application-defined generic credential storage under the current user's credential set.
- Microsoft documents Credential Manager as the preferred new-development option for OS-protected application credential storage, with DPAPI as a local-secret fallback.

## G3 decisions

1. Native public-client OIDC/OAuth architecture.
2. Authorization Code + PKCE `S256`.
3. System browser/external user-agent; no embedded login.
4. Loopback IPv4 callback on ephemeral port as primary Desktop redirect pattern.
5. No OAuth client secret in Desktop.
6. Native Tauri auth broker retains token material outside WebView.
7. Narrow allow-listed native MIQOS API transport; no generic privileged proxy.
8. API performs authentication and permission enforcement server-side.
9. Initial Desktop permissions are read-only and G2-compatible.
10. Raw provider evidence has a separate high-sensitivity read permission and server-side access audit.
11. Refresh token, if issued, is held in Windows user credential storage and must have replay protection.
12. No tokens in browser/local application storage.
13. No persistent authoritative MIQOS data cache.
14. Restrictive CSP and least-privilege Tauri capabilities.
15. Security/auth audit is separate from immutable domain audit but correlated.
16. Identity-provider vendor remains deployment-configurable behind the standards contract.

## Required platform extension identified

The certified Fastify baseline does not yet implement:

- access-token validation middleware;
- server-side permission mapping/enforcement;
- authoritative session descriptor;
- security access audit for sensitive Admin reads.

This is a **known platform security extension**, not an upstream defect and not implemented silently inside PREP. It is recorded in change control for downstream authorised implementation/revalidation.

## User interaction checkpoint

No `UI-IDP` checkpoint is required to close G3 because the security architecture is provider-neutral.

A user/external checkpoint becomes necessary when an actual environment requires:

- IdP tenant/issuer selection;
- native application registration/client ID;
- redirect registration;
- API audience/scope registration;
- group/role assignment;
- conditional-access/MFA policy;
- production credential/signing administration.

Completed G0-G3 work must not be repeated when that external configuration becomes available.

## G3 exit criteria

| Criterion | Result |
|---|---|
| Authentication architecture defined | PASS |
| Authorisation architecture defined | PASS |
| No embedded native client secret | PASS |
| Token/session lifecycle defined | PASS |
| Secrets and secure storage model defined | PASS |
| Local-data policy defined | PASS |
| Native privilege boundary defined | PASS |
| Security audit requirements defined | PASS |
| Provider-specific dependency isolated | PASS |
| Required backend security extension identified under change control | PASS |
| No certified upstream implementation modified | PASS |

## Gateway decision

**G3 = PASS**

Next controlled gateway:

`MIQOS-DESKTOP-PREP-001 / BC-04 / G4 — Windows Runtime & Packaging`
