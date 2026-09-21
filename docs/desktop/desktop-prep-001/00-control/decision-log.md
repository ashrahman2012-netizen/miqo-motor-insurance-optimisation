# Decision Log

## D-G0-001 — Desktop PREP upstream baseline

**Decision:** Base Desktop PREP on `miqos/app-build-001` at `ce211bf4e23643f1eab75e865210f4de121841fb`.

## D-G0-002 — Execution branch

**Decision:** Create `miqos/desktop-prep-001` directly from the certified SHA.

## D-G0-003 — Package-management baseline

**Decision:** Preserve the existing npm workspaces and lockfile model during G0.

## D-G1-001 — Desktop host architecture

**Decision:** Select **Tauri 2 + React/TypeScript** for the Windows Admin Application.

**Authority:** `01-architecture/adr/ADR-001-tauri-react-windows-admin.md`.

## D-G1-002 — Dedicated Desktop workspace

**Decision:** Create the Desktop application as a new `apps/admin-desktop` workspace during the authorised scaffold/proof phase.

## D-G1-003 — Domain authority remains remote

**Decision:** Keep Fastify/API/domain/PostgreSQL as the authoritative application/domain path.

## D-G1-004 — Native capabilities are app-local and least privilege

**Decision:** Tauri/Rust commands and plugins must remain app-local and capability-scoped.

## D-G1-005 — Packaging details deferred to G4

**Decision:** G1 selects the Tauri Windows packaging family but leaves installer/signing/WebView2 choices to G4.

## D-G2-001 — Admin visibility is not Admin mutation authority

**Decision:** Current Desktop Admin domain access is read/inspect.

## D-G2-002 — No endpoint privilege escalation

**Decision:** Existing general/customer POST/PUT endpoints are not Desktop Admin commands merely because they are reachable.

## D-G2-003 — Direct database access prohibited

**Decision:** `apps/admin-desktop` may not depend on `@miqo/db`, PostgreSQL drivers or direct database connectivity.

## D-G2-004 — Online authority

**Decision:** Desktop is online-required for authoritative MIQOS state.

## D-G2-005 — Sensitive technical evidence remains Admin-only

**Decision:** Raw provider-response and detailed lineage evidence require an Admin-sensitive boundary.

## D-G2-006 — Native privilege does not confer domain privilege

**Decision:** Tauri core provides OS/security infrastructure only.

## D-G3-001 — Standards-based native authentication

**Decision:** Use OIDC/OAuth 2.0 Authorization Code + PKCE `S256` as a native public client through the system browser.

**Reason:** Native-app security BCP requires an external user-agent and PKCE; a distributed Desktop app cannot safely rely on an embedded client secret.

## D-G3-002 — Loopback redirect

**Decision:** Use `http://127.0.0.1:{ephemeral-port}/oauth/callback` as the primary Desktop redirect pattern, with loopback-only/exclusive listener controls.

## D-G3-003 — Native token broker

**Decision:** Keep access/refresh credential material outside WebView JavaScript. A native Tauri auth broker owns the OAuth transaction and token lifecycle.

**Authority:** `03-security/adr/ADR-002-native-auth-and-secure-transport.md`.

## D-G3-004 — Allow-listed native API transport

**Decision:** Authenticated API calls cross a native transport constrained to the configured MIQOS API origin and approved method/route templates.

A generic arbitrary-URL native HTTP proxy is prohibited.

## D-G3-005 — Windows user credential storage

**Decision:** If refresh credentials are issued and persistent sign-in is approved, store them through Windows Credential Manager under the current user. Per-user DPAPI is fallback only if a documented implementation constraint requires it.

## D-G3-006 — Server-side permission enforcement

**Decision:** The API validates tokens and maps trusted identity to MIQOS permissions. UI visibility is not authorisation.

Initial Desktop permissions remain read-only and include a distinct permission for raw provider evidence.

## D-G3-007 — Provider-neutral identity architecture

**Decision:** Do not bind PREP to a specific IdP vendor. Issuer/client/audience/role configuration remains environment/deployment configuration behind the OIDC/OAuth standards contract.

## D-G3-008 — No persistent business cache

**Decision:** Do not persist authoritative profiles, recommendations, audit evidence, raw provider payloads or integrity state locally by default.

## D-G3-009 — Platform security extension under change control

**Decision:** Production API token validation, permission enforcement, session descriptor and sensitive-read access audit are required platform extensions. They must be implemented under explicit downstream change control/revalidation, not silently added to the frozen certified upstream baseline during PREP.
