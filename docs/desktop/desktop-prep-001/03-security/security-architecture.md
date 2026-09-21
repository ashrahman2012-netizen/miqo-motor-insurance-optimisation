# MIQOS Desktop Security Architecture v1.0

**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G3 — Security & Identity Architecture  
**Status:** FROZEN AT G3  
**Date:** 2026-09-21

## 1. Security objective

The Windows Admin Application must preserve the G2 boundary:

> Admin visibility does not create Admin business-state authority.

Security therefore protects two distinct boundaries:

1. **identity and API access** — who may inspect which MIQOS evidence;
2. **native privilege** — what the Tauri host may do on the Windows machine.

Neither the renderer nor the Tauri core may become an alternative domain authority.

## 2. Security architecture

```text
User
 │
 │ sign-in
 ▼
System browser / external user-agent
 │
 │ OIDC/OAuth 2.0 Authorization Code + PKCE
 ▼
Identity Provider
 │
 │ auth code → loopback callback
 ▼
Tauri Native Auth Broker
 ├─ validates transaction state
 ├─ performs token exchange
 ├─ holds access token in native process memory
 ├─ stores refresh token only if issued/approved
 └─ exposes no token material to WebView
          │
          │ narrow typed request
          ▼
Tauri Native MIQOS Transport
 ├─ fixed/allow-listed MIQOS API origin
 ├─ allow-listed HTTP methods/routes
 ├─ attaches access token
 └─ rejects arbitrary URL proxying
          │
          │ HTTPS
          ▼
MIQOS Fastify API
 ├─ validates issuer/signature/audience/expiry
 ├─ maps identity → MIQOS permissions server-side
 ├─ enforces permission per endpoint
 └─ emits security access audit
          │
          ▼
Existing MIQOS services/domain/PostgreSQL
```

The renderer receives application DTOs/ViewModels, never refresh tokens, client secrets or raw bearer-token material.

## 3. Standards baseline

The native client architecture follows:

- RFC 8252 — OAuth 2.0 for Native Apps;
- RFC 9700 — OAuth 2.0 Security Best Current Practice;
- OpenID Connect for user identity where supported by the selected identity provider.

Required protocol properties:

- external system browser for interactive sign-in;
- Authorization Code flow;
- PKCE using `S256`;
- native client registered as a **public client**;
- no embedded client secret;
- transaction-specific `state`;
- OIDC `nonce` when ID tokens are used;
- exact redirect registration;
- audience-restricted API access token;
- least-privilege scopes/permissions;
- refresh-token replay protection if refresh tokens are issued.

## 4. Windows redirect pattern

Primary Desktop redirect pattern:

```text
http://127.0.0.1:{ephemeral-port}/oauth/callback
```

Rules:

- bind loopback only;
- use an ephemeral port;
- use IP literal rather than `localhost`;
- open listener only for the active auth transaction;
- close immediately after callback;
- on Windows, use exclusive socket binding where supported;
- validate `state`, issuer and expected transaction before exchanging code;
- never render the IdP login page inside the privileged Tauri WebView.

A provider-supported claimed HTTPS redirect may replace loopback later if enterprise deployment policy requires it, but that requires a controlled ADR/change rather than an ad-hoc implementation variation.

## 5. Identity-provider neutrality

G3 does not select a vendor.

The architecture depends only on a standards-compliant provider capable of:

- OIDC/OAuth Authorization Code + PKCE for native/public clients;
- registered loopback redirect;
- issuing an access token for the MIQOS API audience;
- exposing stable subject identity;
- supporting centrally governed user/group/role assignment or equivalent;
- refresh-token rotation or sender-constrained refresh tokens if refresh tokens are issued.

Provider-specific tenant IDs, client IDs, issuer URLs, scopes and registrations are deployment configuration, not source secrets.

## 6. API trust boundary

The API remains the security/business authority.

For protected Admin resources it must:

1. authenticate every request;
2. validate token signature and trusted issuer;
3. validate audience;
4. validate expiry/not-before;
5. reject invalid/unknown token algorithms/configuration;
6. derive the stable subject identity;
7. map the identity to MIQOS permissions server-side;
8. enforce the required permission;
9. return 401 for unauthenticated/invalid sessions;
10. return 403 for authenticated but unauthorised requests;
11. log security-relevant access without logging token contents.

The renderer may alter visual availability from server-supplied permissions, but hiding UI is not authorisation.

## 7. Native transport boundary

Authenticated API traffic is mediated by a narrow Tauri native transport so bearer/refresh tokens are not exposed to WebView JavaScript.

The transport is **not** a generic HTTP proxy.

It must enforce:

- configured MIQOS API origin only;
- HTTPS outside explicitly authorised local synthetic development;
- allowed methods;
- allowed route templates;
- request/response size controls where appropriate;
- no arbitrary caller-supplied full URL;
- no arbitrary headers that can replace identity/security headers;
- no automatic mutation retries.

The renderer calls a typed `DesktopApiTransport` abstraction. The implementation may invoke a Tauri command, but shared `@miqo/application-adapters` remains network- and Tauri-free.

## 8. Tauri privilege boundary

Default policy: **deny native capability unless explicitly required**.

Do not grant broad shell/filesystem/process/network permissions.

Initial capability family may include only:

- application identity/version;
- system-browser launch for the exact authentication URL pattern;
- loopback authentication callback handling;
- native credential store access;
- narrow MIQOS API transport;
- logout/credential deletion;
- later G6 diagnostic capabilities when separately authorised.

Do not grant `core:default` or plugin default permission bundles wholesale without reviewing the resulting command set.

## 9. WebView hardening

Required:

- packaged local UI assets only;
- no remote executable page content;
- restrictive Tauri CSP;
- no remote scripts/CDN JavaScript;
- no unrestricted `connect-src`;
- no arbitrary `eval`/dynamic code execution;
- production devtools disabled unless explicitly support-authorised;
- no secret/token persistence in browser storage;
- treat all API/provider payload content as untrusted display data.

The target CSP is finalised and executable in G8, but G3 requires a least-privilege configuration with `default-src 'self'` and no broader source than the application actually needs.

## 10. Network policy

Production/certification Admin API connectivity is TLS-protected.

Because tokens remain in the native broker and API calls are native-transport mediated, the renderer does not require broad CORS access to the production API.

This resolves the G1/G2 CORS concern without wildcard CORS and without a generic privileged proxy.

## 11. Security fail-closed rules

The Desktop application must not fall back to anonymous Admin access.

Fail closed on:

- unresolved environment;
- missing/invalid issuer configuration;
- token validation failure;
- missing permission mapping;
- native secure-store failure where persistence is required;
- unexpected redirect/callback;
- API certificate/TLS failure;
- capability denial.

A security failure maps to an explicit NOT_AUTHORISED/BLOCKED/ERROR state rather than a fabricated empty success state.
