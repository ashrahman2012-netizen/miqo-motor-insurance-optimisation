# MIQOS Desktop Configuration Precedence v1.0

**Gateway:** G5  
**Status:** FROZEN AT G5

## 1. Installed package precedence

For installed TEST/STAGING/PRODUCTION packages there is no user-variable precedence chain.

The security-relevant order is:

```text
signed/bundled deployment profile
        ↓
native schema/coherence validation
        ↓
server/IdP runtime attestation
        ↓
effective application state
```

Server runtime authority may restrict capability further; it may never be locally upgraded by Desktop configuration.

## 2. Development precedence

For DEVELOPMENT tooling only:

```text
explicit process environment supplied to dev/build command
        ↓
ignored developer-local profile inputs
        ↓
repository safe development defaults
        ↓
profile generator/validator
        ↓
DEVELOPMENT/SYNTHETIC runtime profile
```

The generated profile is the value consumed by the application.

Development input precedence must never permit an invalid stage/environment combination.

## 3. CI precedence

For TEST build/package jobs:

```text
workflow-controlled non-secret inputs
        ↓
profile generator
        ↓
strict schema/coherence validation
        ↓
bundled TEST/SYNTHETIC profile
```

A CI build must fail if a required profile field is missing or incoherent.

## 4. Server precedence

Desktop expected configuration does not override server facts.

Example:

```text
Desktop expects SYNTHETIC
API reports SYNTHETIC + liveProvidersEnabled=false
→ coherent
```

```text
Desktop expects SYNTHETIC
API reports PRODUCTION or live provider activity
→ BLOCK / environment mismatch
```

```text
Desktop expects PRODUCTION
API reports SYNTHETIC
→ BLOCK / environment mismatch
```

The more restrictive state wins.

## 5. Legacy environment variables

Existing repository variables such as:

- `MIQO_ENV`;
- `MIQO_DATA_CLASSIFICATION`;
- `MIQO_APPLICATION_ENVIRONMENT`;
- `MIQO_LIVE_PROVIDERS_ENABLED`;
- `NEXT_PUBLIC_API_URL`

remain authorities only within their existing web/API/build contexts.

The Desktop application does not inherit `NEXT_PUBLIC_*` conventions and must not treat a renderer-exposed environment variable as protected deployment authority.

## 6. Vite boundary

Vite variables exposed to client code are bundled/client-visible.

Therefore:

- no secrets use `VITE_*`;
- do not set a blank/global env prefix;
- Desktop security configuration is consumed from the validated native deployment profile, not arbitrary `import.meta.env` values.

Vite mode may control build tooling behaviour, but it does not define MIQOS business/data authority.
