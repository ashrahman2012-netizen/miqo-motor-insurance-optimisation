# MIQOS Desktop Feature-Flag Contract v1.0

**Gateway:** G5  
**Status:** FROZEN AT G5

## 1. Initial state

The initial Desktop deployment profile contains no enabled product feature flags by default.

Feature flags are an optional controlled presentation/deployment mechanism, not a security or domain-authority mechanism.

Unknown flag names are rejected by configuration validation rather than silently accepted.

## 2. Permitted uses

A future flag may control bounded non-authoritative behaviour such as:

- visibility of an evidence-backed read-only route;
- an operational UI experiment;
- a diagnostic presentation capability;
- gradual introduction of a Desktop-only presentation feature.

The underlying API still enforces permission/capability.

## 3. Prohibited uses

A feature flag must never:

- enable live providers;
- change data classification;
- select production;
- bypass authentication or authorisation;
- create Admin mutation authority;
- enable locked-profile modification;
- override comparison/recommendation/integrity;
- activate ADJUSTED_COMPARABLE;
- weaken CSP/native capability controls;
- enable arbitrary native shell/filesystem/network access;
- change API/IdP endpoint;
- expose tokens/secrets;
- make unavailable server capability appear authoritative.

## 4. Source

Installed-package feature flags come from the bundled deployment profile.

They are not user-editable.

A future remote feature-flag service requires separate security/configuration architecture because it would become a runtime authority input.

## 5. Fail state

Missing optional flag = disabled.

Unknown flag = configuration validation failure in controlled build/test environments; installed production packages must contain only the approved schema.

## 6. Audit/provenance

Build evidence records the approved feature-flag set/fingerprint so support can reproduce the UI state associated with an installed build.
