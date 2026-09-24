# DB-G7-R1 acceptance — Admin API Security Convergence

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G7 — Identity, Authentication & Authorisation  
**Execution:** DB-G7-R1 — Admin API Security Convergence  
**Result:** PASS  
**Date:** 2026-09-23  
**Entry/base assessment:** `2ba388950d30da032a32feeb4bc4c93ee9d503cc`  
**Accepted executable source:** `c2b1158e6c2ce5a3b1ed17cb64fc03a0f55ad844`

## Accepted scope

DB-G7-R1 resolves the Admin API security-convergence blocker without broadening business authority.

Accepted behaviour includes:
- canonical protected `/desktop-admin/**` evidence routes;
- removal of legacy unauthenticated `/admin/**` and raw-response aliases;
- TEST OIDC bearer validation against configured issuer, audience and JWKS;
- server-side group-to-permission mapping;
- deterministic 401 unauthenticated and 403 insufficient-permission behaviour;
- protected v1 selection trace and SP4 trace reads;
- protected raw provider evidence with sensitive-read access logging;
- combined profile evidence requiring every constituent read permission;
- Admin Web same-origin authenticated proxy plus PKCE login/callback handling;
- customer discrepancy and lifecycle projections narrowed independently of Admin authentication;
- customer-safe Activity projection preserving approved milestones while excluding low-level provider/audit internals.

## Customer/Admin evidence separation

The customer profile snapshot exposes only customer-safe lifecycle fields:
- `eventType`;
- `entityId`;
- `metadataJson`;
- `occurredAt`.

It does not expose Admin `auditEventId`, `traceId` or `entityType`.

The customer discrepancy contract omits internal `riskProfileVersionId` and `createdAt`; those remain available to the authenticated Admin evidence surface.

The customer Activity adapter uses an allowlist. The final accepted source includes the safe Sprint 4 milestone `sp4_scenario_exploration_generated` rendered as **“Scenarios generated”**, while `raw_provider_response_captured` remains excluded.

## Repair history relevant to acceptance

R1 required iterative convergence across API, Admin Web and regression evidence. Two important regression findings were:
1. narrowing the customer lifecycle stream too far broke previously certified customer lifecycle expectations;
2. revision `9caca4658891bba72379eee4db263e13c63d27c0` passed the database/API contract set but the BUILD-001H Playwright activity proof failed because “Scenarios generated” was absent.

The activity boundary was repaired by restoring the existing safe exploration event to the narrowed customer allowlist/projection rather than exposing provider or technical audit events. Follow-up commits also made the redacted activity identity and reduced-motion browser state deterministic.

## Exact-source proof

Accepted executable source `c2b1158e6c2ce5a3b1ed17cb64fc03a0f55ad844` is green under:

- push `ci` #779 / run `35911924171` — SUCCESS
  - target-stack-sprint1 `107353642288`
  - locked-dependencies `107353642543`
  - postgres-contract `107353642545`
- PR `ci` #780 / run `35911928818` — SUCCESS
  - postgres-contract `107353660133`
  - target-stack-sprint1 `107353660348`
  - locked-dependencies `107353660388`
- Desktop G7 #265 / run `35911928952` — SUCCESS
  - Windows Desktop preflight/full `107353847360`
  - artifact `10774215683`
  - digest `sha256:30072ed39fc07e8e9cd2ac9ebb44b9c7497f2e35ead24e2a7963bd4c04158f8b`
- Desktop G8 #85 / run `35911928870` — SUCCESS
  - Desktop service / certified API integration `107353793490`
  - Windows installed Desktop skeleton proof `107353793879`
  - API artifact `10773691810`, digest `sha256:c7b9c9e80f101ea9a7380b8aeeff8e35cd9db1533a5b257eac15f44566093ba0`
  - Windows artifact `10773859198`, digest `sha256:9f575a165c5186b4e955e6d5ac05902ad2fea7a4654f83a7b1b28de9bdae669c`

The PR Windows/API artifacts use synthetic merge SHA `59d24188c93f90448fbe581176bcad3183b08ce4`, paired with exact branch head `c2b1158e6c2ce5a3b1ed17cb64fc03a0f55ad844`.

## Change-control disposition

**CC-G3-001 = CLOSED BY DB-G7-R1 for the current TEST/SYNTHETIC stack.**

This closure does not certify:
- a real enterprise/public-client IdP registration;
- STAGING or PRODUCTION identity;
- non-synthetic data;
- production secrets;
- provider activation;
- production signing or release.

Those remain separately gated.

## Boundary review

| Question | Result |
|---|---|
| Admin mutation authority added? | No |
| Business/domain recommendation logic changed? | No |
| Legacy unauthenticated Admin evidence retained? | No |
| Protected Admin reads require authentication? | Yes |
| Insufficient permissions return 403? | Yes |
| Sensitive raw evidence has explicit permission and access logging? | Yes |
| Customer contracts expose Admin audit IDs/trace IDs? | No |
| Customer Activity exposes raw-provider capture events? | No |
| Production identity/environment activated? | No |
| Real provider activity enabled? | No |

## Exit

**DB-G7 = PASS.**

Next controlled gateway: **DB-G8 — Remaining Admin Areas & Capability Closure**.
