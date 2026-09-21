# Risk Register

| ID | Risk | State | Gateway | Control |
|---|---|---|---|---|
| R-G0-001 | GitHub connector commit-run visibility is limited for historic push runs. | OPEN / NON-BLOCKING | G7 | Obtain run-level Desktop CI evidence in G7; do not invent evidence. |
| R-G0-002 | Desktop could modify certified application semantics for convenience. | CONTROLLED | All | Frozen-upstream rule; explicit change control. |
| R-G0-003 | Existing Admin web host could be mistaken for Desktop architecture. | CLOSED BY G1 | G1 | Dedicated Tauri/React host selected. |
| R-G1-001 | Tauri introduces Rust/MSVC into a Node/npm repository. | CONTROLLED / EXECUTION PROOF PENDING | G4/G7 | Build-time prerequisites frozen; prove deterministic Windows runner in G7. |
| R-G1-002 | WebView2 provisioning policy was unresolved. | CLOSED AS DESIGN / PROOF PENDING | G4/G8 | Evergreen + embedded bootstrapper selected; prove clean-machine behaviour in G8. |
| R-G1-003 | Production authentication was not in certified baseline. | CLOSED AS ARCHITECTURE / IMPLEMENTATION PENDING | G3/BUILD | OIDC/PKCE/native broker frozen; CC-G3-001. |
| R-G1-004 | Renderer networking could tempt wildcard CORS/generic proxy. | CLOSED BY G3 | G3/G5 | Allow-listed native MIQOS transport. |
| R-G1-005 | Next-specific route/server code is not directly reusable. | ACCEPTED | G8/BUILD | Reuse ViewModels/adapters/UI; Desktop-local orchestration. |
| R-G1-006 | Native bridge could become broad privilege surface. | CONTROLLED / PROOF PENDING | G3/G8 | Default deny; narrow capabilities; CSP. |
| R-G2-001 | Reachable general mutation endpoints could be mistaken for Admin permission. | CONTROLLED | G2/G3/BUILD | Read-only permission model and native route allow-list. |
| R-G2-002 | Raw provider/audit evidence could leak through logs/cache/export. | CONTROLLED / G6 DETAIL PENDING | G3/G6 | Separate permission, no persistent cache, redaction/access audit. |
| R-G2-003 | Offline cache could be mistaken for authoritative state. | CONTROLLED | G2/G5 | No persistent authoritative cache. |
| R-G2-004 | Some canonical Admin routes lack dedicated backend resources. | OPEN / NON-BLOCKING | BUILD | Evidence-backed/deferred UI only. |
| R-G3-001 | Real IdP registration is not provisioned. | OPEN / NON-BLOCKING FOR PREP | G8/BUILD/DEPLOY | Trigger UI-IDP only when real environment registration is needed. |
| R-G3-002 | Fastify API lacks production token-validation/RBAC middleware. | OPEN / CONTROLLED PLATFORM EXTENSION | BUILD/G8 | CC-G3-001 with revalidation. |
| R-G3-003 | Renderer compromise could invoke broad native commands. | CONTROLLED / PROOF PENDING | G8 | Capability negative tests. |
| R-G3-004 | Persistent refresh credential could be stolen/replayed. | CONTROLLED | BUILD | OS credential store + rotation/sender-constraining. |
| R-G3-005 | Loopback OAuth callback could be intercepted/confused. | CONTROLLED | G8 | Loopback-only, ephemeral, exclusive bind, PKCE/state/nonce. |
| R-G3-006 | Security logging could leak tokens/raw evidence. | CONTROLLED / G6 DETAIL PENDING | G6 | Redaction and support-bundle filtering. |
| R-G4-001 | Organisation-controlled production Windows signing identity is not provisioned. | OPEN / NON-BLOCKING FOR G4 | G7/G9 | UI-SIGN; unsigned/test-signed proof is explicitly non-production. |
| R-G4-002 | Enterprise deployment may mandate MSI or per-machine installation. | OPEN / NON-BLOCKING | G7/DEPLOY | NSIS current-user is baseline; add a proven controlled variant only when required. |
| R-G4-003 | Missing WebView2 on a disconnected device could prevent bootstrapper remediation. | CONTROLLED | G4/G8 | Windows 11 baseline; alternate offline Evergreen installer profile for disconnected deployments. |
| R-G4-004 | Windows 11 x64 baseline excludes ARM64 and legacy Windows. | ACCEPTED | DEPLOY | Add target only from explicit deployment requirement and evidence. |
| R-G4-005 | Packaging design has not yet been executed against the real Desktop scaffold. | OPEN / EXPECTED | G8 | G8 must produce/install/upgrade/uninstall the real NSIS package before PREP certification. |
