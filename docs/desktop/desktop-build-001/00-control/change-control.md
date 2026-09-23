# BUILD change control

Frozen upstream application: `ce211bf4e23643f1eab75e865210f4de121841fb`.  
Frozen Desktop BUILD entry: `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`.

| Carried ID | Scope | State / admission |
|---|---|---|
| CC-G3-001 | API token validation, server permissions, sensitive-read audit and 401/403. | OPEN / CONTROLLED; DB-G7 |
| CC-G5-001 | certification/production environment authority. | OPEN / CONTROLLED; never relax SYNTHETIC/liveProviders=false |
| CC-G6-001 | validated trace context, independent request ID and safe API build identity. | **CLOSED BY DB-G6** for current TEST/SYNTHETIC stack; executable source `b7c1931aa2e1ef291036ece8eadfa043465d5389` |
| CC-G7-001 | inherited Desktop CI infrastructure. | AUTHORISED inherited PREP infrastructure |

DB-G6 closes only its observability extension. It does not change frozen domain methodology, mutation authority, environment admission or identity/RBAC authority.

Any later new API resource/command must pass the existing admission rule before source change.
