# DB-G8 resource admission

## Decision

**No new backend resource admitted.**

DB-G8 closes remaining capability gaps by truthful UI disposition rather than creating endpoints solely to populate navigation.

Current Desktop Admin reads remain the DB-G7 canonical authenticated set:

- `GET /health`;
- `GET /desktop-admin/session`;
- `GET /desktop-admin/profiles/:profileId`;
- `GET /desktop-admin/profile-versions/:versionId`;
- `GET /desktop-admin/audit?profileId=...`;
- `GET /desktop-admin/profiles/:profileId/discrepancies`;
- `GET /desktop-admin/selections/:selectionId/trace`;
- `GET /desktop-admin/selections/:selectionId/sp4-trace`;
- `GET /desktop-admin/quote-requests/:quoteRequestId/raw-response`.

## Provider status

No admitted resource states global provider live/enabled/healthy/certified/commercial status. Persisted market-route/provider identity inside a decision trace is not reclassified as such a status.

## Certification

No admitted resource or artefact states production/provider/regulatory certification. CI, G7/G8, deterministic TEST OIDC and SYNTHETIC quotation proof remain engineering evidence only.

Because no new resource is consumed, no new permission, sensitive-read class, retry contract, ViewModel mapping or failure mapping is created by DB-G8.
