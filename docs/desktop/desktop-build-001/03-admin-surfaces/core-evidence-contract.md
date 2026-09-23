# DB-G4 Core Admin Evidence Contract

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G4 — Core Admin Evidence Surfaces  
**Status:** IMPLEMENTATION IN PROGRESS

## Authorised resources

DB-G4 consumes only existing approved resources:

- `GET /admin/profiles/:profileId`;
- `GET /admin/profile-versions/:versionId`;
- existing `GET /admin/audit?profileId=...` and `GET /profiles/:profileId/discrepancies` through the inherited audit read command.

No backend endpoint is introduced or altered.

## Desktop authority

Desktop may present persisted version status, field values/control classes/source evidence, validation evidence, current-version discrepancies and append-only audit events.

Desktop does **not** expose:

- field edit/save;
- validation execution;
- profile lock;
- correction draft;
- discrepancy resolution;
- global case/entity search;
- audit mutation;
- ranking/integrity/recommendation decisions.

The existing customer profile adapter may be used for presentation labels/formatting, but DB-G4 projects it into a passive Desktop read model that removes `editable`, `lockAction` and `resolutionAction`.

## Native transport

The DB-G3 `admin-read` capability is expanded by exactly:

- `load_admin_profile(profileId)`;
- `load_admin_profile_version(versionId)`.

Both use the typed Rust `ApiReadOperation` allow-list, require the inherited environment attestation before protected evidence is read and accept only constrained opaque identifiers.

No generic URL, HTTP method, header, origin or bearer material is renderer-controlled.

## UX

Cases is an exact-ID entry surface only. Profile and profile-version routes are inspection-only. Discrepancies are labelled as current-version evidence where appropriate. Audit & Trace at DB-G4 is core profile lifecycle audit; DB-G5 owns deep selection/quote/recommendation lineage.

Missing/blocked/network outcomes remain explicit and no cached/fabricated business evidence is substituted.
