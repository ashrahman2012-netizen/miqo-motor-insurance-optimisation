# BUILD blocker and dependency register

## Active DB-G1 blockers

None at DB-G1 control freeze. The verified UX archive matches the DB-G0 SHA-256 and all seven images were inspected directly. No visual requirement requires changing a frozen PREP architecture, security, environment or mutation boundary.

## Resolved execution conditions

- B-DB-G0-001: required handover initially absent; resolved before DB-G0.
- B-DB-G0-002: local Git helper/network acquisition issue; resolved during DB-G0 without repository changes.
- B-DB-G1-001: Codex usage limit prevented agent execution; controller switched DB-G1 to direct ChatGPT + GitHub execution because DB-G1 is documentation/control-only. No partial Codex source change existed.

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
