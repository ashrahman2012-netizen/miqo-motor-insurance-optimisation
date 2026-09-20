# MIQO-SP6-EXEC-001C-PREP — Provider-Neutral Certification & Activation Readiness

**Document ID:** MIQO-SP6-EXEC-001C-PREP  
**Version:** 1.0  
**Status:** ACTIVE — PROVIDER-NEUTRAL PREPARATION  
**Sprint:** MIQO-SP6-EXEC-001  
**Frozen gates prepared:** S6-G7 → S6-G10  
**Upstream dependency:** S6-G3 remains BLOCKED  
**Date:** 20 September 2026

## 1. Purpose

Prepare Batch C to the maximum provider-neutral point while Seopa onboarding remains in `SENT / AWAITING_PROVIDER_RESPONSE`.

This increment SHALL reduce the provider-response critical path without claiming provider-specific certification.

It may implement reusable controls for:
- certification/production environment separation;
- credential lifecycle and scope;
- provider resilience policy structure;
- provider certification execution harness.

It MUST NOT:
- invent provider endpoints, schemas, credentials, rate limits or retry rules;
- mark S6-G7–G10 PASS from provider-neutral fixtures;
- activate LIVE_PROVIDER, REAL_DATA or DISTRIBUTION;
- execute a provider certification route before S6-G3 and provider-specific G4–G6 evidence exist.

## 2. C1 — S6-G7 environment-separation framework

Required provider-neutral model:

```text
ProviderEnvironmentPolicy
ProviderEndpointReference
ProviderCredentialReference
EnvironmentBinding
```

Every binding shall include:
- provider_key;
- route_key;
- environment_class;
- endpoint_reference;
- credential_reference;
- credential_scope;
- configuration_version.

Invalid by construction:
- certification credential + production endpoint;
- production credential + certification endpoint;
- unclassified endpoint;
- shared credential reference across certification and production;
- LIVE route using certification configuration.

Expected controlled status after CI:

> **S6-G7 — BLOCKED / FRAMEWORK READY — provider-specific endpoint and credential evidence required.**

## 3. C2 — S6-G8 credential lifecycle framework

Non-secret references follow the convention:

```text
secret://miqos/certification/{provider}/{route}
secret://miqos/production/{provider}/{route}
```

Provider-neutral controls shall prove:
- credential values never enter control objects/repository state;
- credential references are environment/provider/route scoped;
- certification and production scopes cannot be reused;
- references are versioned;
- rotation creates a new active version;
- revocation disables the associated binding;
- missing, expired or revoked credentials fail closed;
- operational error text is redacted before emission.

No fake Seopa credential may be introduced.

Expected status:

> **S6-G8 — BLOCKED / FRAMEWORK READY — actual approved secret provisioning and lifecycle evidence required for final PASS.**

## 4. C3 — S6-G9 resilience policy template

Provider-specific resilience fields must remain explicit and versioned.

Mandatory provider-supplied values:
- request timeout;
- connect timeout;
- maximum attempts;
- retryable status codes;
- retryable error classes;
- backoff policy;
- maximum backoff;
- requests per window;
- rate window;
- circuit-open threshold;
- circuit-reset period;
- idempotency policy.

Missing provider values use the controlled sentinel:

`UNSET_PROVIDER_REQUIRED`

Certification execution must reject a policy containing any unresolved mandatory provider value. No Seopa-specific default may be inferred.

Expected status:

> **S6-G9 — BLOCKED / FRAMEWORK READY — provider-specific policy values and fault-injection certification required.**

## 5. C4 — S6-G10 certification harness

The reusable runner shall model:

```text
Approved ProviderCandidate
        ↓
ProviderCertificationContract
        ↓
Certification Environment Binding
        ↓
Credential Reference
        ↓
Provider-specific Resilience Policy
        ↓
Certification Test Pack
        ↓
Certification Runner
        ↓
Provider execution
        ↓
Raw response / normalisation / evidence
        ↓
Certification result
```

Result states:
- `CERTIFICATION_PASS`
- `CERTIFICATION_FAIL`
- `CERTIFICATION_BLOCKED`

`CERTIFICATION_BLOCKED` is mandatory for missing external prerequisites, including:
- provider access not granted;
- credential unavailable;
- schema/contract not approved;
- test pack missing;
- endpoint unavailable/unapproved;
- provider authority restriction;
- unresolved resilience values.

Technical assertion failures after prerequisites are satisfied produce `CERTIFICATION_FAIL`.

Expected status:

> **S6-G10 — BLOCKED / HARNESS READY — provider-specific certification run not yet executable.**

## 6. Parallel governance control

Create `MIQO-SP6-PROVIDER-RESPONSE-REVIEW-001` as the deterministic intake record for any Seopa response.

It shall classify:
- headless/API availability;
- certification environment;
- machine-readable quotes;
- raw-response retention;
- independent normalisation;
- independent ranking;
- synthetic certification data;
- technical-pack completeness;
- certification access;
- architecture compatibility;
- S6-G3 result.

## 7. Stop rule

This PREP increment stops when the repository can truthfully evidence:

> **Everything necessary to execute a genuine provider certification is implemented except the provider-specific facts, permissions, schemas, credentials and certification access that only the provider can supply.**

No Batch D/E execution is implied by completion of this increment.

## 8. Current upstream state

```text
S6-G0 → G2        PASS
S6-G3             BLOCKED — provider response pending
S6-G4 → G6        provider-neutral framework ready
Seopa onboarding  SENT / AWAITING_PROVIDER_RESPONSE
S6-G7 → G10       provider-neutral PREP authorised
```

**End of MIQO-SP6-EXEC-001C-PREP**
