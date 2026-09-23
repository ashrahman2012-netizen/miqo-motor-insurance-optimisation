# Identity, authentication and authorisation

**Status:** PASS for DB-G7 / DB-G7-R1 on the current TEST/SYNTHETIC stack  
**Accepted executable source:** `c2b1158e6c2ce5a3b1ed17cb64fc03a0f55ad844`

## Implemented boundary

- Fastify Admin evidence routes are canonicalised under `/desktop-admin/**`.
- Legacy unauthenticated Admin evidence aliases are removed.
- Bearer access tokens are validated against the configured deterministic TEST OIDC issuer/audience/JWKS.
- IdP groups map server-side to explicit MIQOS Admin permissions.
- Protected reads fail closed with 401 when unauthenticated and 403 when authenticated without the required permission.
- Combined profile evidence requires profile, audit and discrepancy permissions rather than allowing a profile-only principal to inherit broader evidence.
- Raw provider response access requires `miqos.admin.raw-evidence.read` and records a sensitive-read security access event.
- Admin Web uses an authenticated same-origin API proxy and PKCE login/callback path rather than direct unauthenticated API calls.
- Native Desktop retains typed read operations and carries the authenticated token only on governed Admin requests.
- Customer-facing snapshot/discrepancy responses remain separate narrowed contracts. They do not expose Admin audit IDs, trace IDs, entity types or internal discrepancy lineage.
- Customer Activity uses a strict customer-safe event allowlist. Technical provider events such as raw-response capture remain excluded.

## TEST identity scope

The current proof uses the deterministic loopback TEST OIDC authority at `http://127.0.0.1:4100` with the synthetic API audience. This is executable test identity, not production identity certification.

Still open:
- `D-G3-IDP-001` — real public-client IdP registration and real-environment authentication proof;
- `CC-G5-001` — non-synthetic environment authority;
- organisation signing/release authority.

No production secrets are stored in source or evidence.
