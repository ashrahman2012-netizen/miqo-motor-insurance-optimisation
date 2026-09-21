# Risk Register

| ID | Risk | State | Gateway | Control |
|---|---|---|---|---|
| R-G0-001 | Current GitHub connector exposes repository content/status but its commit workflow-run helper is limited to pull-request-triggered runs; no push-run ID was available through that interface during G0. | OPEN / NON-BLOCKING | G0/G7 | Do not invent CI evidence. Retain exact upstream certification SHA and workflow contract; obtain run-level CI evidence when G7 introduces the Desktop CI pathway. |
| R-G0-002 | Desktop work could accidentally modify certified application semantics for convenience. | CONTROLLED | All | Frozen-upstream rule; explicit change control required. |
| R-G0-003 | Existing admin UI is a web application and must not be assumed to define the Windows Desktop architecture. | CONTROLLED | G1 | Evaluate architecture candidates from repository evidence and Windows requirements before selection. |
