# ADR-004 — Immutable Bundled Deployment Profiles

**Status:** ACCEPTED  
**Date:** 2026-09-21  
**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G5

## Context

The existing web/API repository uses process environment variables for synthetic boundary and web endpoint configuration.

A packaged Desktop application has different risks:

- user/process environment variables are mutable;
- renderer-visible build variables are not secret;
- endpoint/issuer changes can redirect authenticated traffic;
- environment identity must not be user-selectable;
- production and non-production local state must not collide.

## Decision

Each Desktop package is built with one validated, immutable **deployment profile** bundled with the application.

The Tauri native core loads/validates it and uses it as the authority for:

- deployment stage;
- expected application environment;
- MIQOS API base URL/audience;
- OIDC issuer/client/scopes;
- approved feature flags;
- build/profile identity.

The profile contains no secrets.

Installed TEST/STAGING/PRODUCTION packages do not accept runtime user/process overrides for these security-relevant fields.

## Environment-specific package identity

Use distinct Tauri identifiers:

- DEV: `com.miqos.admin.desktop.dev`
- TEST: `com.miqos.admin.desktop.test`
- CERTIFICATION/STAGING: `com.miqos.admin.desktop.certification`
- PRODUCTION: `com.miqos.admin.desktop`

This isolates WebView/config/credential state.

## Development exception

DEVELOPMENT tooling may consume ignored local environment inputs, but it must generate the same typed deployment-profile schema and remain DEVELOPMENT/SYNTHETIC.

## Server attestation

The Desktop expected profile is not enough to establish authority.

The application also compares it with server-reported environment evidence and fails closed on mismatch.

## Consequences

### Positive

- deterministic package-to-environment binding;
- no production endpoint switcher;
- no mutable local promotion from synthetic to production;
- configuration is reproducible from build evidence;
- non-production state cannot collide with production state;
- security-sensitive endpoint values remain native-controlled.

### Cost

- changing environment endpoints/IdP registration normally requires a new package;
- multiple environment packages may exist;
- CI must validate/generate profiles deterministically.

This cost is accepted because the Admin application is security-sensitive and initially has a controlled enterprise release cadence.

## Future evolution

A centrally managed signed runtime-configuration service may be considered later, but only with authenticated configuration integrity, rollback/version controls and explicit security review.
