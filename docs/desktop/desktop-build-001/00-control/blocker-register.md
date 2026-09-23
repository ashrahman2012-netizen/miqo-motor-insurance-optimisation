# BUILD blocker and dependency register

## Active DB-G2 blockers

None. DB-G2 source passed repository CI, Windows full package proof, API integration and installed Windows regression proof.

## Resolved execution conditions

- B-DB-G0-001: required handover initially absent; resolved before DB-G0.
- B-DB-G0-002: local Git helper/network acquisition issue; resolved during DB-G0 without repository changes.
- B-DB-G1-001: Codex usage limit prevented agent execution; DB-G1 completed directly through the controller/GitHub because it was documentation/control-only.
- B-DB-G2-001: no separate Codex capacity was required to start the authorised foundation; implementation and executable evidence completed through the controlled GitHub path.

## Carried external dependencies

| ID | Need / checkpoint | When blocking | Current state |
|---|---|---|---|
| D-G3-IDP-001 | real native/public-client IdP registration; UI-IDP | real-environment auth proof | OPEN |
| D-G4-SIGN-001 | organisation Authenticode identity; UI-SIGN | production signing/release proof | OPEN |
| D-G5-ENV-001 | approved real API/IdP/profile values; UI-ENV | non-synthetic operation | OPEN |
| CC-G3-001 | API authentication, permissions, sensitive-read audit, 401/403 | DB-G7 | OPEN / CONTROLLED |
| CC-G5-001 | certification/production environment authority | non-synthetic activation | OPEN / CONTROLLED |
| CC-G6-001 | validated trace context/API build identity | DB-G6 | OPEN / CONTROLLED |
| R-G7-008 | inherited moderate npm findings | dependency assessment before closeout/release | OPEN |

Production secrets remain outside source/chat/ordinary artefacts.

## DB-G3 execution

No interactive/user-controlled blocker is required for the current TEST/SYNTHETIC hardening. UI-IDP, UI-ENV and UI-SIGN remain downstream. DB-G3 must stop rather than enabling STAGING/PRODUCTION or real identity to obtain a pass.

- B-DB-G3-001: initial native hardening revision `ce4fd0c95b50b61a3c4d3dfc91ee0951c459c654` failed G7/G8 Windows build at `cargo fmt --check` only. Formatter-prescribed whitespace/layout correction applied; no behavioural or boundary change.
- B-DB-G3-002: repaired source `9c8a329d9535c89e38039048496ee81ac13039a4` passed G7 but G8 installed proof referenced removed `capabilities/scaffold.json`. Proof harness updated to assert the active `admin-read` capability, exact three permissions, and absence of the legacy scaffold capability. No runtime authority broadened.


## DB-G4 execution

No DB-G4 blocker identified at implementation start. Required profile, profile-version, discrepancy and audit read resources already exist. No new backend resource or mutation authority is required.


## DB-G5 execution

No DB-G5 blocker remains.

- B-DB-G5-001: revisions `2ee749af...`, `672d39ed...` and `435596e5...` were superseded while Windows workflows were cancelled by newer pushes; repository CI remained green.
- B-DB-G5-002: revision `6c28b92a64f916d931bf221b87a5bce5e280f56b` passed repository CI and G8 API integration but G7/G8 Windows execution stopped at `cargo fmt --check`. Formatter-prescribed layout repair only was applied.
- B-DB-G5-003: `1be0f6480d9a516daf0df93effcf4a66997bb67c` passed repository CI, G7 package proof and G8 API/installed lifecycle proof.

No user interaction, production identity, production environment or signing input was required for DB-G5.
