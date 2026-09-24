# BUILD change control

Frozen upstream application: `ce211bf4e23643f1eab75e865210f4de121841fb`.  
Frozen Desktop BUILD entry: `f01776e9bb98bb47a0693f43194d1d48b03b6d5e`.

| Carried ID | Scope | State / admission |
|---|---|---|
| CC-G3-001 | API token validation, server permissions, sensitive-read audit and 401/403. | **CLOSED BY DB-G7-R1 for current TEST/SYNTHETIC stack**; accepted executable source `c2b1158e6c2ce5a3b1ed17cb64fc03a0f55ad844`; real/non-synthetic IdP proof remains separately gated |
| CC-G5-001 | certification/production environment authority. | OPEN / CONTROLLED; never relax SYNTHETIC/liveProviders=false |
| CC-G6-001 | validated trace context, independent request ID and safe API build identity. | **CLOSED BY DB-G6** for current TEST/SYNTHETIC stack; executable source `b7c1931aa2e1ef291036ece8eadfa043465d5389` |
| CC-G7-001 | inherited Desktop CI infrastructure. | AUTHORISED inherited PREP infrastructure |

DB-G7-R1 closes the current-stack authentication/permission/sensitive-read control only. It does not change frozen domain methodology, Admin mutation authority, provider activation, non-synthetic environment admission or production release authority.

Any later new API resource/command must pass the existing admission rule before source change.
