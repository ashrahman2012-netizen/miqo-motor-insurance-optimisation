# BUILD change control

Frozen upstream application: `ce211bf4e23643f1eab75e865210f4de121841fb`.
Frozen Desktop entry: `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`.

DB-G0 creates control documentation only. No new upstream change is proposed or authorised.

| Carried ID | Scope | State / admission |
|---|---|---|
| CC-G3-001 | API token validation, server permissions, sensitive-read audit and 401/403 contracts. | OPEN / CONTROLLED. Separate later execution scope; UI-IDP when real registration is needed. |
| CC-G5-001 | Server certification/production environment authority. | OPEN / CONTROLLED. Separate platform/activation evidence; never relax SYNTHETIC/liveProviders=false to connect. |
| CC-G6-001 | Validated W3C trace context, independent request ID and safe API build identity. | OPEN / CONTROLLED. Later observability gateway only. |
| CC-G7-001 | Inherited Desktop CI infrastructure. | Inherited authorised PREP infrastructure, unchanged. No permission to edit workflows in DB-G0. |

The [PREP change-control record](../../desktop-prep-001/00-control/change-control.md) governs these scopes and required negative/regression proof.

Every proposed change records ID, discovering gateway, affected certified component, behavioural impact, risk, remediation, test/certification impact and approval requirement before implementation. New API consumption additionally records resource, method, owner, read/mutation classification, authentication, permission, audit, retry/idempotency, ViewModel and failure mapping.

Architecture/ADR changes, Admin mutations, new domain authority, live-provider activation, production credentials/environments/signing, material product/regulatory scope changes or critical/high exceptions require a controlled decision. Stop BLOCKED; do not weaken controls.
