# G2 Evidence — Admin Application Boundary

**Gateway:** G2  
**Result:** PASS  
**Date:** 2026-09-21

## Evidence reviewed

G2 reviewed:

- frozen Admin information architecture;
- route/state guard contract;
- current `apps/api/src/server.ts` HTTP surface;
- current certified Admin Audit & Trace implementation;
- `@miqo/application-contracts` API→ViewModel mapping;
- `@miqo/application-adapters` ownership rules;
- G1 Tauri/React target architecture.

## Findings

### Admin-specific backend surface

The current `/admin/*` routes in the certified API are GET-only:

- `GET /admin/profiles/:profileId`
- `GET /admin/profile-versions/:versionId`
- `GET /admin/audit`
- `GET /admin/selections/:selectionId/trace`
- `GET /admin/selections/:selectionId/sp4-trace`

This supports a strong default boundary: Admin visibility does not imply Admin mutation authority.

### General application mutation surface

The API also contains POST/PUT operations for profile creation, factual capture, validation/lock, corrections, preferences, objective selection, scenario generation, quotation execution, normalisation, recommendation creation and quote selection.

Those endpoints remain application/domain operations. G2 does not reclassify them as Desktop Admin commands.

### Frozen application rule

The existing route-guard contract states that UI route guards are not security/business-rule authority; APIs remain authoritative and must reject invalid operations.

The Admin IA also explicitly does not grant:

- live provider activation;
- locked-profile mutation;
- audit rewriting;
- ranking override;
- dormant methodology activation.

## G2 decisions

1. Desktop is an operational inspection/control surface, not a second backend.
2. Current Desktop authoritative domain access is read-only.
3. No direct DB dependency.
4. No implicit use of general/customer mutation endpoints as Admin commands.
5. Future Admin mutations require an explicit server-authorised/audited command contract.
6. Tauri native privilege is limited to OS/Desktop responsibilities and does not confer MIQOS domain authority.
7. Raw technical evidence is Admin-only and crosses an explicit sensitive-evidence boundary.
8. Desktop is online-required for authoritative MIQOS state.
9. Offline domain mutation/recalculation is not permitted.
10. Current Fastify CORS/origin assumptions require controlled G3/G5 treatment for Tauri; wildcard relaxation is not authorised.

## G2 exit criteria

| Criterion | Result |
|---|---|
| Desktop capability boundary defined | PASS |
| Shared/backend/customer/Mobile ownership separated | PASS |
| Required initial API/read interfaces identified | PASS |
| Error/retry/offline boundaries defined | PASS |
| Trust boundaries documented | PASS |
| Mutation authority classified | PASS |
| No core responsibility ambiguously duplicated | PASS |
| No upstream certified behaviour changed | PASS |

## Gateway decision

**G2 = PASS**

Next controlled gateway:

`MIQOS-DESKTOP-PREP-001 / BC-03 / G3 — Security & Identity Architecture`
