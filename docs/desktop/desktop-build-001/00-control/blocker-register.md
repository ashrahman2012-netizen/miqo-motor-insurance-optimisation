# BUILD blocker and dependency register

## Active DB-G0 blockers

None after handover availability, exact-source fetch and provenance verification. Validation/CI must complete before DB-G0 PASS.

## Resolved entry conditions

- B-DB-G0-001: Required handover initially absent; supplied at the user-designated path and read on 2026-09-22. SHA-256 recorded in baseline.
- B-DB-G0-002: Bundled Git HTTPS helper was outside its default exec path; a process-local GIT_EXEC_PATH located the installed helper. The sandbox network was unavailable; authorised escalated fetch succeeded. No repository/toolchain files changed.

## Carried external dependencies

| ID | Need / checkpoint | When blocking | DB-G0 state |
|---|---|---|---|
| D-G3-IDP-001 | Real native/public-client IdP registration, issuer, audience, scopes, redirect and role mapping; UI-IDP. | Real-environment authentication proof. | OPEN, non-blocking for docs. |
| D-G4-SIGN-001 | Organisation Authenticode identity and protected release access; UI-SIGN. | Production signing/release proof. | OPEN, non-blocking for docs. |
| D-G5-ENV-001 | Approved real API/IdP/profile values; UI-ENV with UI-IDP. | STAGING/CERTIFICATION or PRODUCTION operation. | OPEN, non-blocking for docs. |
| CC-G3-001 | API authentication, authorisation and access audit. | Authenticated product/platform implementation and proof under later scope. | OPEN, no implementation in DB-G0. |
| CC-G5-001 | Certification/production environment authority. | Any non-synthetic operation or activation. | OPEN; existing startup guards retained. |
| CC-G6-001 | Validated trace context and API build identity. | Later observability integration and proof. | OPEN, no implementation in DB-G0. |
| R-G7-008 | Four inherited moderate npm findings recorded by PREP. | Controlled dependency assessment before release and BUILD hardening. | OPEN; no fresh audit or lockfile update claimed. |

The [PREP blocker record](../../desktop-prep-001/00-control/blocker-register.md) retains resolved G7/G8 history. Those defects are not reopened without new evidence. Production secrets must remain outside source/chat/ordinary artefacts.
