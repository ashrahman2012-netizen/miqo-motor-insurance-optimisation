# Risk Register

| ID | Risk | State | Gateway | Control |
|---|---|---|---|---|
| R-G0-001 | GitHub connector commit-run visibility is limited for historic push runs. | CLOSED FOR DESKTOP G7 | G7 | Draft PR #5 provided PR-triggered run-level evidence; Desktop run 35601094369 and certified CI run 35601094316 are recorded. |
| R-G0-002 | Desktop could modify certified application semantics for convenience. | CONTROLLED | All | Frozen-upstream rule; explicit change control. |
| R-G0-003 | Existing Admin web host could be mistaken for Desktop architecture. | CLOSED BY G1 | G1 | Dedicated Tauri/React host selected. |
| R-G1-001 | Tauri introduces Rust/MSVC into a Node/npm repository. | CONTROLLED / PACKAGE PROOF PENDING | G4/G7/G8 | Windows run proved Rust 1.98.1 and MSVC discovery; actual Tauri compilation/package remains G7-B/G8. |
| R-G1-002 | WebView2 provisioning policy was unresolved. | CLOSED AS DESIGN / PROOF PENDING | G4/G8 | Evergreen + embedded bootstrapper selected; prove clean-machine behaviour in G8. |
| R-G1-003 | Production authentication was not in certified baseline. | CLOSED AS ARCHITECTURE / IMPLEMENTATION PENDING | G3/BUILD | OIDC/PKCE/native broker frozen; CC-G3-001. |
| R-G1-004 | Renderer networking could tempt wildcard CORS/generic proxy. | CLOSED BY G3 | G3/G5 | Allow-listed native MIQOS transport. |
| R-G1-005 | Next-specific route/server code is not directly reusable. | ACCEPTED | G8/BUILD | Reuse ViewModels/adapters/UI; Desktop-local orchestration. |
| R-G1-006 | Native bridge could become broad privilege surface. | CONTROLLED / PROOF PENDING | G3/G8 | Default deny; narrow capabilities; CSP. |
| R-G2-001 | Reachable general mutation endpoints could be mistaken for Admin permission. | CONTROLLED | G2/G3/BUILD | Read-only permission model and native route allow-list. |
| R-G2-002 | Raw provider/audit evidence could leak through logs/cache/export. | CONTROLLED BY G6 / EXECUTION PROOF PENDING | G3/G6/G8 | Separate permission, no persistent cache, prohibited log fields, redacted support bundles, access audit. |
| R-G2-003 | Offline cache could be mistaken for authoritative state. | CONTROLLED | G2/G5 | No persistent authoritative cache. |
| R-G2-004 | Some canonical Admin routes lack dedicated backend resources. | OPEN / NON-BLOCKING | BUILD | Evidence-backed/deferred UI only. |
| R-G3-001 | Real IdP registration is not provisioned. | OPEN / NON-BLOCKING FOR PREP | G8/BUILD/DEPLOY | Trigger UI-IDP only when real environment registration is needed. |
| R-G3-002 | Fastify API lacks production token-validation/RBAC middleware. | OPEN / CONTROLLED PLATFORM EXTENSION | BUILD/G8 | CC-G3-001 with revalidation. |
| R-G3-003 | Renderer compromise could invoke broad native commands. | CONTROLLED / PROOF PENDING | G8 | Capability negative tests. |
| R-G3-004 | Persistent refresh credential could be stolen/replayed. | CONTROLLED | BUILD | OS credential store + rotation/sender-constraining. |
| R-G3-005 | Loopback OAuth callback could be intercepted/confused. | CONTROLLED | G8 | Loopback-only, ephemeral, exclusive bind, PKCE/state/nonce. |
| R-G3-006 | Security logging could leak tokens/raw evidence. | CONTROLLED BY G6 / EXECUTION PROOF PENDING | G6/G8 | Explicit prohibited fields, structured safe schema, deterministic support-bundle redaction. |
| R-G4-001 | Organisation-controlled production Windows signing identity is not provisioned. | OPEN / NON-BLOCKING FOR G4 | G7/G9 | UI-SIGN; unsigned/test-signed proof is explicitly non-production. |
| R-G4-002 | Enterprise deployment may mandate MSI or per-machine installation. | OPEN / NON-BLOCKING | G7/DEPLOY | NSIS current-user is baseline; add a proven controlled variant only when required. |
| R-G4-003 | Missing WebView2 on a disconnected device could prevent bootstrapper remediation. | CONTROLLED | G4/G8 | Windows 11 baseline; alternate offline Evergreen installer profile for disconnected deployments. |
| R-G4-004 | Windows 11 x64 baseline excludes ARM64 and legacy Windows. | ACCEPTED | DEPLOY | Add target only from explicit deployment requirement and evidence. |
| R-G4-005 | Packaging design has not yet been executed against the real Desktop scaffold. | OPEN / EXPECTED | G8 | G8 must produce/install/upgrade/uninstall the real NSIS package before PREP certification. |
| R-G5-001 | Production/certification API and IdP endpoint/profile values are not yet provisioned. | OPEN / NON-BLOCKING FOR G5 | G7/G8/DEPLOY | UI-ENV / UI-IDP when real environment values are required; bundled profile architecture already frozen. |
| R-G5-002 | Environment packages could share WebView/credential/local-state namespace. | CLOSED BY G5 | G5 | Distinct Tauri identifiers for DEV/TEST/CERTIFICATION/PRODUCTION. |
| R-G5-003 | Frozen certified API only permits SYNTHETIC and liveProviders=false, so STAGING/PRODUCTION profiles cannot currently attest successfully. | OPEN / EXPECTED PLATFORM EXTENSION | BUILD/DEPLOY | CC-G5-001; never bypass prototype boundary with local config. |
| R-G5-004 | Immutable endpoint binding means routine API/IdP endpoint changes require a new package. | ACCEPTED | G5/G7 | Controlled release cadence; consider authenticated managed configuration only through a future ADR. |
| R-G5-005 | Build environment variables could leak secrets into the renderer bundle. | CONTROLLED | G5/G7 | No secrets in VITE_*/renderer configuration; profile is non-secret and native-loaded; CI scanning in G7. |
| R-G6-001 | API does not yet implement validated W3C trace-context correlation or expose server build/version metadata. | OPEN / CONTROLLED PLATFORM EXTENSION | BUILD/G8 | CC-G6-001; retain server-generated request ID and add validated trace context/build identity. |
| R-G6-002 | Local logs could consume disk or retain sensitive operational metadata too long. | CONTROLLED / PROOF PENDING | G6/G8 | 5 MiB/file, max 5 files, max 7 days; startup pruning and redaction tests. |
| R-G6-003 | Support-bundle scanner could miss secrets/PII in unexpected log text. | CONTROLLED / PROOF PENDING | G6/G8 | Prohibited logging-by-design plus deterministic redaction/secret-pattern tests; fail bundle creation on unsafe file-processing failure. |
| R-G6-004 | No central crash/telemetry service means fleet-wide incident detection is limited initially. | ACCEPTED | OPERATIONS | Local-first supportability is sufficient for initial controlled deployment; future central telemetry requires separate privacy/security decision. |
| R-G6-005 | Full memory dumps may contain credentials/decrypted sensitive evidence. | CONTROLLED | SUPPORT | Do not collect/package dumps by default; separate authorised diagnostic procedure only. |
| R-G7-001 | Full Desktop package CI cannot execute until WP-G8.1 creates apps/admin-desktop. | CLOSED | G7/G8 | WP-G8.1 scaffold exists and Full mode now executes. |
| R-G7-002 | GitHub hosted runner image changes over time. | CONTROLLED | G7 | Explicit windows-2025 label plus exact Node/Rust selection; record runner/tool versions in CI evidence. |
| R-G7-003 | Public-repository PRs execute contributor-controlled build scripts. | CONTROLLED | G7 | contents:read, no production secrets, no pull_request_target, checkout credentials disabled, caches disabled. |
| R-G7-004 | Full-SHA action pins age and require controlled maintenance. | ACCEPTED / CONTROLLED | G7 | Review and deliberately update pins; no floating major tags in certified workflow. |
| R-G7-005 | Cache-free CI may be slower. | ACCEPTED | G7 | Reliability/security takes precedence for initial certification; introduce trusted caching only with evidence. |
| R-G7-006 | Production signing remains unexecutable until organisation signing identity exists. | OPEN / NON-BLOCKING FOR G7-A/G8 MECHANICAL PROOF | G7/G9 | UI-SIGN; package evidence must remain labelled unsigned/test-signed. |
| R-G7-007 | Frozen workspace test scripts use shell globs that are not Windows-cmd portable. | CONTROLLED | G7 | Desktop CI uses workspace-local npm exec Vitest invocation; no certified package manifest changed. Consider upstream script portability cleanup only under separate change control. |
| R-G7-008 | npm ci reported four moderate-severity vulnerabilities in the inherited locked dependency set. | OPEN / NON-BLOCKING PREP RISK | G7/BUILD | Do not silently update the certified lockfile in PREP. Assess/remediate under controlled dependency maintenance before production release as appropriate. |
| R-G7-009 | Released tauri-build 2.6.3 rejects build.windows.staticVCRuntime in the current scaffold config during G7-B. | OPEN / BLOCKING | G7-B | Do not alter scaffold/toolchain without controlled correction; resolve compatibility then rerun full package CI. |
