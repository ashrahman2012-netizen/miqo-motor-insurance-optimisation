# Upstream Change Control

## Protected baseline

`MIQOS-APP-BUILD-001` at:

`ce211bf4e23643f1eab75e865210f4de121841fb`

is the frozen upstream baseline for MIQOS-DESKTOP-PREP-001.

Desktop PREP may consume contracts, adapters, UI assets and backend interfaces from that baseline. It must not silently alter certified business behaviour, invariants, persisted semantics or certification controls.

## Required change record

Any required upstream alteration must record:

- change ID;
- discovering gateway;
- affected certified component;
- behavioural impact;
- risk;
- proposed remediation;
- test/certification impact;
- approval requirement.

No upstream correction is to be hidden inside Desktop-specific commits.

---

## CC-G3-001 — Platform Security Extension for Desktop Admin

**Discovered in:** G3 — Security & Identity Architecture  
**Classification:** required downstream platform extension; not an upstream defect  
**Affected component:** `apps/api` trust boundary and security/audit integration  
**Certified business/domain semantics affected:** none intended  
**Status:** OPEN / CONTROLLED

### Reason

The certified application baseline explicitly deferred production authentication integration. The current Fastify API does not implement the production token-validation and permission-enforcement architecture required for an authenticated Windows Admin application.

### Required extension

Implement, under a separately authorised build/change scope:

1. OIDC/OAuth access-token validation;
2. trusted issuer/audience/signature/time validation;
3. server-side subject → MIQOS permission mapping;
4. per-resource permission enforcement;
5. authoritative session/identity descriptor;
6. security/access audit for sensitive Admin reads;
7. 401/403 contract;
8. security-focused tests and negative paths.

### Prohibited shortcut

Do not add a shared Desktop secret, static bearer token, UI-only role check, wildcard bypass or generic API key to avoid the identity integration.

### Revalidation impact

Required tests must prove:

- existing certified domain invariants remain unchanged;
- unauthenticated Admin requests are rejected;
- authenticated but unauthorised requests are rejected;
- raw evidence requires the dedicated permission;
- protected reads are auditable;
- customer/provider boundaries are not weakened.

### Approval requirement

Architecture is approved by G3. Actual IdP registration/environment configuration may require `UI-IDP` and security/tenant administration during G8/BUILD/deployment.


---

## CC-G5-001 — Certification/Production Environment Authority Extension

**Discovered in:** G5 — Environment & Configuration Model  
**Classification:** required downstream platform extension; not an upstream defect  
**Affected component:** API/runtime environment boundary and future certified provider/production platform  
**Certified business/domain semantics affected:** none intended  
**Status:** OPEN / CONTROLLED

### Reason

The frozen certified API deliberately fails startup unless data classification is SYNTHETIC and live-provider activity is disabled. This is a certified safety boundary, not a configuration gap.

STAGING/CERTIFICATION and PRODUCTION/PRODUCTION Desktop profiles therefore cannot be made operational merely by changing local environment variables.

### Required extension

Before a non-synthetic Desktop environment can operate, separately authorised platform work must define and prove:

1. machine-readable certification/production environment identity;
2. appropriate provider-activity authority and certification;
3. G3 production authentication/authorisation controls;
4. environment-specific API/IdP registrations;
5. server-side fail-closed environment checks;
6. CI/integration evidence for the target environment;
7. preserved certified domain invariants;
8. controlled activation/go-live decision.

### Prohibited shortcut

Do not remove or relax the SYNTHETIC/live-provider startup guard merely to make a Desktop STAGING or PRODUCTION profile connect.

### Revalidation impact

The later platform programme must prove the new environment without invalidating factual immutability, scenario/comparison/recommendation/integrity authority or synthetic/certification labelling controls.

### Approval requirement

Actual environment values may require UI-ENV and UI-IDP. Live-provider or production activation remains separately governed.


---

## CC-G6-001 — API Observability Correlation & Build Identity Extension

**Discovered in:** G6 — Observability & Supportability
**Classification:** required downstream platform observability extension; not an upstream defect
**Affected component:** apps/api request logging/health/support metadata
**Certified business/domain semantics affected:** none intended
**Status:** OPEN / CONTROLLED

### Reason

The certified Fastify API already logs requests and creates server request IDs, but it does not currently define:

1. validated W3C traceparent handling from the Desktop client;
2. explicit Desktop trace ID ↔ server request ID correlation;
3. server build/version/source identity in safe diagnostics/health metadata.

These are required for dependable cross-component incident support.

### Required extension

Implement under authorised downstream scope:

1. parse/validate incoming W3C traceparent;
2. ignore/restart invalid trace context;
3. retain an independent server-generated request ID;
4. include safe trace ID and request ID in structured API logs;
5. return a safe correlation/reference identifier for errors where appropriate;
6. add safe API build/service identity to a diagnostic/health contract;
7. preserve redaction/no-token logging;
8. test malformed/adversarial trace headers and correlation behaviour.

### Prohibited shortcut

Do not trust an arbitrary caller-provided request-ID value as the server's canonical request ID without strict validation.

Do not put personal/customer data into trace identifiers.

### Revalidation impact

Prove that observability changes do not modify API domain results, security authorisation, audit semantics or the synthetic/live-provider boundary.

### Approval requirement

No user checkpoint is required for the architecture. Implementation is part of downstream platform/BUILD/G8 work.


---

## CC-G7-001 — Desktop CI Infrastructure Addition

**Discovered/authorised in:** G7 — Build & CI/CD Preparation
**Classification:** Desktop build/release infrastructure; not an upstream business-behaviour change
**Files outside Desktop PREP documentation:** `.github/workflows/desktop-prep-g7.yml`, `scripts/desktop-ci.ps1`
**Certified business/domain semantics affected:** none
**Status:** AUTHORISED / ACTIVE

### Purpose

G7 requires an executable Windows CI definition and canonical build entry point.

These files:

- verify the certified shared baseline;
- preserve SYNTHETIC/liveProviders=false;
- add no application/domain API behaviour;
- introduce no DB/provider mutation;
- contain no production credentials;
- automatically move from preflight to full Desktop package validation only after G8 creates the authorised scaffold.

### Revalidation

The final PREP comparison must distinguish these two authorised CI-infrastructure files from application/API source changes.

Any future workflow/script change that relaxes tests, environment boundary, action pinning, secret controls or artefact verification requires review.
