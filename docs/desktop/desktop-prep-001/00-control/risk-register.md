# Risk Register

| ID | Risk | State | Gateway | Control |
|---|---|---|---|---|
| R-G0-001 | Current GitHub connector exposes repository content/status but its commit workflow-run helper is limited to pull-request-triggered runs; no push-run ID was available through that interface during G0. | OPEN / NON-BLOCKING | G0/G7 | Do not invent CI evidence; obtain run-level Desktop CI evidence in G7. |
| R-G0-002 | Desktop work could accidentally modify certified application semantics for convenience. | CONTROLLED | All | Frozen-upstream rule; explicit change control required. |
| R-G0-003 | Existing admin UI is a web application and must not be assumed to define the Windows Desktop architecture. | CLOSED BY G1 | G1 | Dedicated Tauri/React Desktop host selected. |
| R-G1-001 | Tauri introduces Rust/MSVC tooling into a Node/npm-centred repository. | OPEN / CONTROLLED | G4/G7 | Prove Windows toolchain and deterministic CI; pin exact dependencies. |
| R-G1-002 | Tauri on Windows depends on WebView2; target-device provisioning policy is not yet frozen. | OPEN / CONTROLLED | G4 | Select and prove WebView2 provisioning mode. |
| R-G1-003 | Production authentication/token handling was not part of the certified application baseline. | CLOSED AS ARCHITECTURE / IMPLEMENTATION PENDING | G3/BUILD | Native OIDC/PKCE/token-broker architecture frozen; platform security extension recorded. |
| R-G1-004 | Desktop renderer networking could tempt wildcard CORS or a generic privileged HTTP proxy. | CLOSED BY G3 | G3/G5 | Native allow-listed MIQOS transport keeps tokens/network privilege out of WebView and avoids broad CORS. |
| R-G1-005 | Next-specific route/server code cannot be directly reused in Desktop. | ACCEPTED | G8/BUILD | Reuse ViewModels/adapters/UI; implement Desktop-local route/application orchestration. |
| R-G1-006 | Tauri native bridge could become an uncontrolled privilege escalation surface. | CONTROLLED | G3/G8 | Default deny; no generic shell/filesystem/network bridge; restrictive CSP and explicit capabilities. |
| R-G2-001 | Existing API contains non-admin mutation endpoints; technical reachability could be mistaken for Admin permission. | CONTROLLED | G2/G3/BUILD | Read-only Desktop permission model; native route allow-list; server-side endpoint authz. |
| R-G2-002 | Raw provider/audit evidence could leak through logs, cache or local export. | CONTROLLED / G6 DETAIL PENDING | G3/G6 | Separate raw-evidence permission; no persistent cache; access audit; G6 redaction/support-bundle controls. |
| R-G2-003 | Desktop offline caching could be mistaken for current authoritative MIQOS state. | CONTROLLED | G2/G5 | No persistent authoritative cache; online authority. |
| R-G2-004 | Canonical Admin IA includes routes with no current dedicated Admin backend resource. | OPEN / NON-BLOCKING | BUILD | Evidence-backed functionality only; reserved areas remain explicit/deferred. |
| R-G3-001 | Exact IdP tenant/application registration is not yet provisioned. | OPEN / NON-BLOCKING FOR PREP | G8/BUILD/DEPLOY | Provider-neutral OIDC contract; trigger UI-IDP only when real environment registration is required. |
| R-G3-002 | Certified Fastify API lacks production token-validation/RBAC middleware. | OPEN / CONTROLLED PLATFORM EXTENSION | BUILD/G8 | Implement under CC-G3-001 with revalidation; no PREP-side upstream mutation. |
| R-G3-003 | Renderer compromise could invoke overly broad native commands. | CONTROLLED / PROOF PENDING | G3/G8 | Fine-grained Tauri capability allow-list; CSP; no token exposure; G8 negative tests. |
| R-G3-004 | Refresh-token theft/replay if persistent sign-in is enabled. | CONTROLLED | G3/BUILD | Windows user credential store; rotation or sender-constraining; revocation/logout. |
| R-G3-005 | Loopback OAuth redirect could be intercepted or confused. | CONTROLLED | G3/G8 | 127.0.0.1 only, ephemeral port, exclusive bind, PKCE/state/nonce, short-lived listener. |
| R-G3-006 | Security/access logging could itself leak tokens or raw evidence. | CONTROLLED / G6 DETAIL PENDING | G3/G6 | Explicit forbidden fields; correlation-only security logs; support-bundle filtering. |
