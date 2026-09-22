# ADR-002 — Native Authentication Broker and Allow-Listed Secure API Transport

**Status:** ACCEPTED  
**Date:** 2026-09-21  
**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G3

## Context

ADR-001 selected Tauri 2 + React/TypeScript.

G2 then froze the Desktop Admin application as a read/inspection surface with no implicit domain mutation authority.

The remaining security question is where authentication credentials live and how authenticated requests cross from the WebView to the MIQOS API.

A direct WebView bearer-token model would expose access tokens to renderer JavaScript. A generic native HTTP proxy would create excessive privilege and violate the G2 boundary.

## Decision

Use a **native Tauri authentication broker plus an allow-listed MIQOS API transport**.

The renderer calls typed application-service operations. Those operations invoke a native transport that:

- accepts only configured MIQOS API operations;
- rejects arbitrary URLs;
- attaches the access token inside the native process;
- never returns token material to the renderer;
- returns the API response data/status needed by application adapters.

Authentication occurs through the system browser using Authorization Code + PKCE.

Persistent refresh credentials, if issued, are stored in the Windows user credential store.

## Why this fits ADR-001

The Tauri core remains an infrastructure/security boundary, not a business/domain backend.

It does not:

- rank quotes;
- validate factual semantics;
- calculate recommendations;
- override integrity;
- access PostgreSQL.

It only brokers identity/native credential storage and constrained transport.

## Consequences

### Positive

- bearer/refresh tokens are not deliberately exposed to WebView JavaScript;
- no production API CORS wildcard is required for Desktop;
- API destinations/methods can be constrained centrally;
- renderer XSS has a narrower path to credential theft;
- refresh credentials can use OS-protected storage.

### Costs

- a native transport abstraction must be implemented/tested;
- API route allow-list must be maintained with interface changes;
- native and renderer integration tests are required;
- authentication requires an external browser/loopback callback flow.

## Rejected

### Tokens in browser storage

Rejected due to token exposure/persistence risk.

### Renderer-held refresh token

Rejected because long-lived credentials would be exposed to WebView compromise.

### Generic native HTTP proxy

Rejected because arbitrary URL/method forwarding creates an unnecessarily broad privileged capability.

### Embedded WebView login

Rejected because native-app OAuth best current practice requires an external user-agent.

## Reversal rule

Any move to direct renderer token handling, embedded authentication, generic proxying or confidential-client secrets requires a new ADR and G3 security review.
