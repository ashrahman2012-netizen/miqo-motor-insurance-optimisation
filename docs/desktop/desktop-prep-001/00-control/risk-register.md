# Risk Register

| ID | Risk | State | Gateway | Control |
|---|---|---|---|---|
| R-G0-001 | Current GitHub connector exposes repository content/status but its commit workflow-run helper is limited to pull-request-triggered runs; no push-run ID was available through that interface during G0. | OPEN / NON-BLOCKING | G0/G7 | Do not invent CI evidence. Retain exact upstream certification SHA and workflow contract; obtain run-level CI evidence when G7 introduces the Desktop CI pathway. |
| R-G0-002 | Desktop work could accidentally modify certified application semantics for convenience. | CONTROLLED | All | Frozen-upstream rule; explicit change control required. |
| R-G0-003 | Existing admin UI is a web application and must not be assumed to define the Windows Desktop architecture. | CLOSED BY G1 | G1 | ADR-001 selects a dedicated Tauri/React Desktop host while preserving reusable certified layers. |
| R-G1-001 | Tauri introduces Rust/MSVC tooling into a Node/npm-centred repository. | OPEN / CONTROLLED | G4/G7 | Prove Windows toolchain and deterministic CI; pin exact Rust/Tauri dependencies. |
| R-G1-002 | Tauri on Windows depends on WebView2; target-device provisioning policy is not yet frozen. | OPEN / CONTROLLED | G4 | Select and prove WebView2 provisioning mode during packaging experiments. |
| R-G1-003 | Production authentication/token handling is not part of the certified application baseline. | OPEN / CONTROLLED | G3 | Define native-app authentication, token lifecycle and secure storage before production-capable Desktop use. |
| R-G1-004 | Desktop renderer networking may require CORS/origin/security policy changes relative to server-side Next loaders. | OPEN / CONTROLLED | G3/G5 | G2 forbids wildcard relaxation/generic privileged proxying; define least-privilege Desktop origin/network policy. |
| R-G1-005 | Next-specific route/server code cannot be directly reused in Desktop. | ACCEPTED | G8/BUILD | Reuse ViewModels/adapters/UI; implement Desktop-local route and application orchestration. |
| R-G1-006 | Tauri native bridge could become an uncontrolled privilege escalation surface if broad shell/filesystem commands are exposed. | OPEN / CONTROLLED | G3/G8 | Default-deny capability model, restrictive CSP, narrow typed commands, no generic shell/filesystem bridge. |
| R-G2-001 | Existing API contains many non-admin mutation endpoints; a Desktop developer could accidentally treat technical reachability as Admin permission. | CONTROLLED | G2/G3/BUILD | Mutation-authority matrix; only explicit Admin-authorised commands may be executed. |
| R-G2-002 | Raw provider/audit evidence is operationally sensitive and could leak through logs, cache or local export. | OPEN / CONTROLLED | G3/G6 | Define authz, local-data policy, redaction and support-bundle controls. |
| R-G2-003 | Desktop offline caching could be mistaken for current authoritative MIQOS state. | CONTROLLED | G2/G5 | Initial Desktop is online-authoritative; cache is presentation-only and must expose stale/disconnected state if later introduced. |
| R-G2-004 | Canonical Admin IA includes routes with no current dedicated Admin backend resource. | OPEN / NON-BLOCKING | BUILD | Render only evidence-backed functionality; reserved areas remain explicit/deferred until API authority exists. |
