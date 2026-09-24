# DB-G5 Deep Decision-Evidence Contract

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G5 — Deep Audit, Trace & Decision-Evidence Surfaces  
**Status:** FROZEN AT DB-G5

## Authoritative source

The primary decision-lineage source is the existing SP4 trace:

`GET /admin/selections/:selectionId/sp4-trace`

The Desktop may enrich that exact trace with:

- profile audit events;
- profile discrepancies;
- the raw provider response linked to the quote request for the persisted surfaced normalised quote.

The renderer supplies only the Selection ID. Native core derives profile/quote-request linkage from the authoritative trace.

## Evidence that may be rendered

- profile/version/objective lineage;
- scenario exploration and O-class deltas;
- scenario/catalogue/policy/candidate fingerprints;
- market-route identity/versioning;
- quote-request identity and request fingerprint;
- raw-provider-response identity/reference/payload hash and synthetic payload;
- normalised quote identity/version/fingerprint;
- persisted comparison state;
- persisted eligibility/exclusion and evidence ordinal;
- recommendation set/rule/fingerprint;
- persisted recommendation explanation/material reasons;
- selection and shortlist evidence;
- persisted final-integrity result/evidence;
- completion/data-classification/live-provider state;
- append-only audit events and discrepancies.

## Prohibited Desktop computation

Desktop must not independently derive eligibility, comparison state, ordinal/rank, recommendation, material reason, integrity outcome or completion state. It renders authoritative supplied values and labels them as persisted/supplied evidence.

## Correlation rules

Fail closed when:

- returned selection ID differs from requested Selection ID;
- a surfaced normalised quote ID is present but absent from trace route/quote evidence;
- raw-provider response quote-request ID differs from the quote request linked to the surfaced normalised quote;
- trace-derived profile/quote-request identifiers are invalid for native route construction;
- environment attestation fails.

## Raw evidence handling

Raw provider evidence is sensitive read-only evidence. It is displayed only in the exact selection trace context. No default export, cache, mutation or logging of payload content is authorised. Operational logs record reason/event codes, not provider payload or bearer/refresh-token material.

## Native boundary

`admin-read` exposes `load_admin_selection_trace(selectionId)` in addition to the prior five approved runtime/read commands. Internally the command uses typed GET-only operations and no renderer-provided URL, method, header, origin or independent quote-request/profile identifier.

## Gateway separation

DB-G5 does not implement observability/support tooling beyond inherited logging, real authentication/RBAC, non-synthetic environments, provider activation, or remaining operational Admin areas.
