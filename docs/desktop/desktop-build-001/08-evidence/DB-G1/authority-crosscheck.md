# DB-G1 authority cross-check

Cross-checked the seven-screen UX reference against PREP capability/interface/mutation/trust boundaries, G3 security, G5 environment controls and DB-G0 invariants.

| Demo action/pattern | DB-G1 disposition |
|---|---|
| edit factual profile / keep-update discrepancy / confirm-lock / correction draft | PROHIBITED |
| select/change objective / optimisation controls / generate scenarios | PROHIBITED |
| quote execution/selection/customer compare action | PROHIBITED |
| recommendation accept / Go to Insurer / customer handoff | PROHIBITED |
| Send customer summary | PROHIBITED unless separately designed/authorised |
| provider activation/deactivation | PROHIBITED / DEFERRED |
| integrity/ranking/comparison override | PROHIBITED |
| global case/scenario/entity search | DEFERRED |
| unsupported dashboard aggregates | DEFERRED |
| local filter/sort/route navigation / copy opaque ID | IMPLEMENT local presentation |
| safe approved read refresh | READ-ONLY |
| profile/version/audit/trace/discrepancy inspection | READ-ONLY |
| raw provider evidence | sensitive READ-ONLY |
| system/build/environment display | IMPLEMENT presentation; environment itself is not renderer-authorised |

No UX pattern may create arbitrary renderer networking, generic native HTTP/shell/filesystem access, renderer token storage, remote executable UI or user-editable environment/API/IdP authority. Unknown environment still fails closed.

**Conclusion:** DB-G1 broadens visual vocabulary, not application authority. No demo-authority conflict remains unresolved because unauthorised actions are excluded/deferred rather than admitted.
