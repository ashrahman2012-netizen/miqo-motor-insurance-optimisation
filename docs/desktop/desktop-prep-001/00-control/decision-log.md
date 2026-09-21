# Decision Log

## D-G0-001 — Desktop PREP upstream baseline
Base Desktop PREP on miqos/app-build-001 at ce211bf4e23643f1eab75e865210f4de121841fb.

## D-G0-002 — Execution branch
Create miqos/desktop-prep-001 directly from the certified SHA.

## D-G0-003 — Package-management baseline
Preserve the existing npm workspaces and lockfile model.

## D-G1-001 — Desktop host architecture
Select Tauri 2 + React/TypeScript. Authority: ADR-001.

## D-G1-002 — Dedicated Desktop workspace
Create apps/admin-desktop during the authorised scaffold/proof phase.

## D-G1-003 — Domain authority remains remote
Keep Fastify/API/domain/PostgreSQL authoritative.

## D-G1-004 — Native capabilities are app-local and least privilege
Tauri/Rust commands/plugins remain capability-scoped.

## D-G1-005 — Packaging details deferred to G4
Installer/signing/WebView2 choices belong to G4.

## D-G2-001 — Admin visibility is not Admin mutation authority
Current Desktop Admin domain access is read/inspect.

## D-G2-002 — No endpoint privilege escalation
General/customer POST/PUT endpoints are not Desktop Admin commands merely because reachable.

## D-G2-003 — Direct database access prohibited
apps/admin-desktop may not depend on @miqo/db or direct PostgreSQL connectivity.

## D-G2-004 — Online authority
Desktop is online-required for authoritative MIQOS state.

## D-G2-005 — Sensitive technical evidence remains Admin-only
Raw provider-response and detailed lineage evidence require a higher-sensitivity Admin boundary.

## D-G2-006 — Native privilege does not confer domain privilege
Tauri core provides OS/security infrastructure only.

## D-G3-001 — Standards-based native authentication
Use OIDC/OAuth Authorization Code + PKCE S256 through the system browser.

## D-G3-002 — Loopback redirect
Use 127.0.0.1 ephemeral-port loopback callback with transaction controls.

## D-G3-003 — Native token broker
Keep token material outside WebView JavaScript. Authority: ADR-002.

## D-G3-004 — Allow-listed native API transport
Authenticated native transport is constrained to the configured MIQOS API and approved operations.

## D-G3-005 — Windows user credential storage
If issued/approved, persistent refresh credentials use Windows Credential Manager; per-user DPAPI is fallback only.

## D-G3-006 — Server-side permission enforcement
API validates tokens and enforces MIQOS permissions.

## D-G3-007 — Provider-neutral identity architecture
IdP-specific registration remains deployment configuration.

## D-G3-008 — No persistent business cache
Do not persist authoritative MIQOS business evidence locally by default.

## D-G3-009 — Platform security extension under change control
Production API authn/authz/access-audit is CC-G3-001.

## D-G4-001 — Windows support baseline
**Decision:** Windows 11 x64 is the normal initial Desktop support target.

**Reason:** Windows 10 standard support ended on 14 October 2025; unsupported OS operation is not an appropriate default for a security-sensitive Admin application.

## D-G4-002 — Primary installer
**Decision:** Use Tauri NSIS as the primary Windows installer.

**Reason:** It supports user/machine deployment and silent installation without the current Tauri MSI dependency on WiX v3/VBSCRIPT.

**Authority:** ADR-003.

## D-G4-003 — Default install scope
**Decision:** Use NSIS currentUser as the default.

**Reason:** MIQOS Admin business permissions do not require Windows administrator privilege. Per-machine install remains a controlled enterprise variant.

## D-G4-004 — WebView2 provisioning
**Decision:** Use WebView2 Evergreen with embedded bootstrapper fallback.

**Reason:** Evergreen is the security-serviced Microsoft-recommended default; Fixed Version would move browser-engine patch ownership into MIQOS.

## D-G4-005 — Downgrade and update
**Decision:** Block downgrades. Use controlled versioned installer replacement initially; do not enable the Tauri self-updater in the first skeleton.

## D-G4-006 — Production signing boundary
**Decision:** Production executables/installers require Authenticode signing with SHA-256 and trusted timestamping. Private signing key material remains external to source and ordinary build jobs.

## D-G4-007 — Application packaging identity
**Decision:** Freeze product name MIQOS Admin, binary miqos-admin, technical Tauri identifier com.miqos.admin.desktop and initial PREP version 0.1.0.

Changing the identifier after packaging certification requires change control.

## D-G4-008 — G4 versus G8 proof boundary
**Decision:** G4 certifies a reproducible packaging design/readiness contract. Real package generation, installation, upgrade, downgrade rejection and uninstall evidence remain mandatory in G8.


## D-G5-001 — Separate deployment stage from application environment
**Decision:** Use DEVELOPMENT, TEST, STAGING and PRODUCTION as deployment stages while retaining certified ApplicationEnvironment values SYNTHETIC, CERTIFICATION and PRODUCTION.

Canonical mapping is DEVELOPMENT→SYNTHETIC, TEST→SYNTHETIC, STAGING→CERTIFICATION and PRODUCTION→PRODUCTION.

## D-G5-002 — Immutable bundled deployment profile
**Decision:** Each installed Desktop package contains one validated non-secret deployment profile loaded by the Tauri native core.

Installed security-relevant endpoint/environment configuration is not user/process overrideable.

**Authority:** ADR-004.

## D-G5-003 — Environment-specific package identity
**Decision:** Retain com.miqos.admin.desktop for PRODUCTION and use suffix identifiers for non-production:
- .dev
- .test
- .certification

This extends the G4 packaging identity convention before G8 proof and prevents WebView/config/credential-state crossover.

## D-G5-004 — No renderer/Vite configuration authority
**Decision:** Vite/client-visible environment variables are not secret storage or protected runtime configuration authority. Renderer receives a sanitised typed configuration ViewModel from native validated configuration.

## D-G5-005 — Server environment attestation
**Decision:** Before protected Admin evidence is shown, Desktop compares its expected application environment with server-reported environment/health evidence and fails closed on mismatch.

## D-G5-006 — Feature flags are non-authoritative
**Decision:** Feature flags may control approved presentation/deployment behaviour only. They cannot activate production/live providers, create mutation authority, bypass security or change certified domain methodology.

## D-G5-007 — Current backend supports only synthetic Desktop profiles
**Decision:** G8 against the frozen certified backend uses DEVELOPMENT/TEST SYNTHETIC configuration. STAGING/CERTIFICATION and PRODUCTION/PRODUCTION require separately authorised platform capability; G5 does not weaken the existing prototype boundary.


## D-G6-001 — Local-first observability baseline
**Decision:** Use a vendor-neutral local-first observability model for the initial Desktop line.

Production support does not depend on an automatic third-party telemetry/crash SaaS.

**Authority:** ADR-005.

## D-G6-002 — Structured local logging
**Decision:** Use structured one-record-per-line Desktop logs under the Tauri application log directory, with INFO default production level and bounded retention.

Initial retention: 5 MiB maximum per file, maximum 5 files, maximum 7 days.

## D-G6-003 — Sensitive-data exclusion
**Decision:** Tokens, credentials, raw provider payloads, full customer/profile payloads and arbitrary HTTP bodies are prohibited from operational logs/support bundles.

## D-G6-004 — Distributed correlation
**Decision:** Use W3C traceparent for Desktop→API correlation while preserving a separate server-generated request ID.

Do not configure caller-controlled trace/request data as the server's unvalidated canonical request ID.

## D-G6-005 — Crash handling
**Decision:** Capture renderer/native crash metadata, error references and unclean-run markers. Do not automatically capture/process memory dumps or upload crashes to a third party.

## D-G6-006 — Diagnostic identity
**Decision:** System/Diagnostics exposes app version, build ID, source commit, deployment profile/environment, OS/WebView/runtime information and safe API health/correlation status.

## D-G6-007 — Explicit redacted support bundle
**Decision:** Support bundles are user/operator-initiated native diagnostic artefacts, redacted before packaging, target maximum 25 MiB, and accompanied by SHA-256.

No automatic email/upload/ticket integration is created by G6.

## D-G6-008 — Observability evidence hierarchy
**Decision:** Desktop operational logs and support bundles remain subordinate diagnostic evidence. They do not override server security audit or immutable MIQOS domain/audit evidence.


## D-G7-001 — Canonical Desktop CI entry point
**Decision:** Use `scripts/desktop-ci.ps1 -Mode Auto` as the canonical Windows Desktop build/CI entry point.

Auto mode executes Preflight until `apps/admin-desktop` exists, then automatically executes Full mode.

## D-G7-002 — Windows hosted runner
**Decision:** Use GitHub `windows-2025` x64 for the controlled Desktop CI baseline.

The workflow actively selects/verifies exact application toolchains rather than trusting moving runner defaults.

## D-G7-003 — Exact CI toolchains
**Decision:** Retain Node 22.16.0 / npm 10.9.2 and select Rust/Cargo 1.98.1 for initial Desktop CI.

G8 must lock Rust dependencies in Cargo.lock.

## D-G7-004 — Initial cache-free CI
**Decision:** Disable Actions/npm/Rust dependency caches in the first controlled Desktop pipeline.

Reason: maximise reproducibility and avoid untrusted-cache complexity on the public repository. Performance tuning may be revisited later.

## D-G7-005 — Immutable workflow dependencies
**Decision:** Pin all external GitHub Actions in the Desktop workflow to full commit SHAs and keep ordinary CI at `contents: read`.

## D-G7-006 — Artefact contract
**Decision:** Full mode produces a canonical NSIS executable, SHA-256 sidecar and build-manifest.json, uploaded as an immutable 14-day CI artefact.

## D-G7-007 — Release/signing separation
**Decision:** Ordinary CI produces unsigned/test-signed package evidence only. Production Authenticode signing occurs in a protected downstream release stage using UI-SIGN provisioned identity.

## D-G7-008 — Controlled G7/G8 sequencing adjustment
**Decision:** G7 is PARTIAL PASS after CI architecture/preflight preparation. WP-G8.1 is the next minimal authorised operation solely to create the Desktop scaffold; G7-B full package CI must then close before the remainder of G8.

Reason: the original blueprint requires package CI at G7 but assigns scaffold creation to G8. This treatment preserves both controls without fabricating execution evidence.


## D-G7-009 — Windows test invocation adapter
**Decision:** The Desktop Windows CI entry point invokes the existing application-adapter and UI Vitest suites through workspace-local `npm exec ... vitest run` rather than the frozen package.json test scripts.

**Reason:** The certified package scripts contain shell glob syntax (`test/*.test.ts`) that is expanded by Linux shells but passed literally by Windows cmd.exe. The first Windows execution proved this portability issue.

This is a CI invocation adaptation only. No certified shared package manifest/test source was changed, and the successful Windows run proved all 7 application-adapter test files and both UI test files execute.

## D-G7-010 — Live G7-A evidence
**Decision:** Accept G7-A as PASS based on Desktop workflow run `35601094369` and same-head certified CI run `35601094316`.

G7 overall remains PARTIAL PASS because no NSIS artefact can exist before G8.1.
