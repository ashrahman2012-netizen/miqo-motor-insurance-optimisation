# MIQOS Desktop Admin Capability Boundary v1.0

**Programme:** MIQOS-DESKTOP-PREP-001  
**Gateway:** G2 — Admin Application Boundary  
**Status:** FROZEN AT G2  
**Date:** 2026-09-21

## 1. Boundary principle

The Windows Admin Application is an **operational, audit, inspection and controlled-administration surface**.

It is not:

- the customer application with elevated UI controls;
- a second MIQOS backend;
- a direct database administration tool;
- a provider-activation console by implication;
- an authority to override certified domain rules.

The Desktop host may present and orchestrate only capabilities backed by explicit application/API authority.

## 2. Current evidence-backed Admin capabilities

The certified baseline currently exposes these admin-specific read resources:

- `GET /admin/profiles/:profileId`
- `GET /admin/profile-versions/:versionId`
- `GET /admin/audit?profileId=...`
- `GET /admin/selections/:selectionId/trace`
- `GET /admin/selections/:selectionId/sp4-trace`

The current Admin web implementation proves:

- Admin application shell/navigation;
- Audit & Trace filtering;
- exact profile/version/selection lineage;
- append-only audit event presentation;
- raw-provider-response versus normalised-quote separation;
- discrepancy visibility;
- recommendation/explanation/final-integrity evidence presentation;
- environment/governance status.

These are the initial authoritative Desktop capability basis.

## 3. Canonical Admin areas

The existing frozen Admin information architecture contains:

```text
Dashboard
Cases
Optimisation
Scenarios
Market Routes
Quote Runs
Recommendation Sets
Integrity
Discrepancies
Audit & Trace
Providers
Certification
System
```

G2 distinguishes **navigation ownership** from **functional authority**.

A route/area may exist in the Desktop shell without granting mutation or backend capability.

## 4. Capability classification

| Capability | Desktop ownership | Backend/platform ownership | G2 state |
|---|---|---|---|
| Admin shell/navigation | Desktop | — | AUTHORISED |
| Environment/build identity display | Desktop presentation; source governed later by G5/G6 | deployment/runtime authority | AUTHORISED |
| Search/filter local ViewModels | Desktop | authoritative source data remains API-owned | AUTHORISED |
| Case/profile inspection | Desktop presentation | profile state/API/DB | AUTHORISED READ |
| Profile-version inspection | Desktop presentation | profile service/API/DB | AUTHORISED READ |
| Audit timeline inspection | Desktop presentation | append-only audit/API/DB | AUTHORISED READ |
| Selection/recommendation lineage trace | Desktop presentation | API/domain evidence | AUTHORISED READ |
| Raw provider evidence inspection | Desktop presentation | provider-response/API/DB authority | AUTHORISED READ, ADMIN ONLY |
| Normalised quote evidence inspection | Desktop presentation | normalisation/API/DB | AUTHORISED READ |
| Discrepancy inspection | Desktop presentation | profile/discrepancy services | AUTHORISED READ |
| Integrity-result inspection | Desktop presentation | integrity service/API/DB | AUTHORISED READ |
| Optimisation catalogue inspection | Desktop presentation | optimisation policy/API | READ CANDIDATE; G8 not required |
| Scenario/route/quote-run inspection | Desktop presentation | API/domain services | READ CANDIDATE; endpoint composition may be required later |
| Provider status/certification presentation | Desktop presentation | provider certification programme/backend | RESERVED; no activation authority |
| Certification evidence presentation | Desktop presentation | certification artefacts/backend | RESERVED |
| System/diagnostic information | Desktop + Tauri host | runtime/OS/backend status | AUTHORISED subject to G6 |
| Profile factual mutation | None by default | profile API/domain authority | NOT AUTHORISED AS ADMIN |
| Locked-profile modification | None | prohibited by certified invariant | PROHIBITED |
| Ranking/recommendation override | None | backend/domain authority | PROHIBITED |
| Integrity override | None | backend/integrity authority | PROHIBITED |
| Audit mutation/deletion | None | append-only backend authority | PROHIBITED |
| Provider activation | None at G2 | provider certification/activation authority | PROHIBITED / DEFERRED |
| Live quote execution | None at G2 | separately certified provider path | PROHIBITED / DEFERRED |
| Direct DB/query-console access | None | DB/service layers only | PROHIBITED |

## 5. Desktop-owned state

Desktop may own only non-authoritative application state such as:

- current route/view;
- current search/filter criteria;
- transient selection/highlight state;
- window/layout state;
- non-sensitive user preferences approved by G3/G5;
- diagnostic UI state;
- cached presentation data subject to expiry and G3/G5 policy.

Desktop-owned state must not become the source of truth for:

- risk facts;
- objective selection;
- scenario generation;
- quote state;
- recommendation order;
- integrity outcomes;
- audit history;
- provider activation;
- certification state.

## 6. Customer application boundary

The Desktop Admin app must not duplicate customer journey ownership.

Customer-originating actions such as factual capture, profile correction, objective selection, optimisation choices, quotation selection or customer handoff remain customer/application-service capabilities unless a future explicit admin intervention capability is separately designed and authorised.

Admin visibility into those artefacts does not imply admin mutation authority.

## 7. Mobile boundary

No Desktop capability is to be placed in the Mobile programme merely for implementation convenience, and no Mobile/customer capability is to be imported into Desktop unless it has a specific operational-admin purpose and explicit backend authority.

## 8. Boundary freeze

The G2 default is:

> **Read and inspect authoritative MIQOS evidence; do not mutate authoritative MIQOS state unless a later, explicit admin command contract is separately authorised.**

This removes ambiguity between operational visibility and business-state ownership.
