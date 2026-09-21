# Decision Log

## D-G0-001 — Desktop PREP upstream baseline

**Decision:** Base Desktop PREP on `miqos/app-build-001` at `ce211bf4e23643f1eab75e865210f4de121841fb`.

**Reason:** The repository certification record identifies MIQOS-APP-BUILD-001 as CERTIFIED/COMPLETE. The branch is 166 commits ahead of `main`; therefore `main` is not an acceptable substitute for the certified application baseline.

## D-G0-002 — Execution branch

**Decision:** Create `miqos/desktop-prep-001` directly from the certified SHA.

**Reason:** This preserves exact provenance and isolates Desktop preparation from both `main` and the frozen upstream branch.

## D-G0-003 — Package-management baseline

**Decision:** Preserve the existing npm workspaces and lockfile model during G0.

## D-G1-001 — Desktop host architecture

**Decision:** Select **Tauri 2 + React/TypeScript** for the Windows Admin Application.

**Authority:** `01-architecture/adr/ADR-001-tauri-react-windows-admin.md`.

## D-G1-002 — Dedicated Desktop workspace

**Decision:** Create the Desktop application as a new `apps/admin-desktop` workspace during the authorised scaffold/proof phase.

## D-G1-003 — Domain authority remains remote

**Decision:** Keep Fastify/API/domain/PostgreSQL as the authoritative application/domain path. Tauri core shall not duplicate MIQOS business rules or persistence.

## D-G1-004 — Native capabilities are app-local and least privilege

**Decision:** Tauri/Rust commands and plugins must remain app-local and capability-scoped. Shared `@miqo/ui` and application-adapter packages must remain free from Desktop privileges.

## D-G1-005 — Packaging details deferred to G4

**Decision:** G1 selects the Tauri Windows packaging family but does not pre-select MSI versus NSIS, WebView2 provisioning mode, signing identity or updater configuration.

## D-G2-001 — Admin visibility is not Admin mutation authority

**Decision:** The current Desktop Admin capability boundary is read/inspect for authoritative MIQOS domain state.

**Reason:** The certified API's current `/admin/*` resources are GET-only and the frozen Admin IA does not grant locked-profile mutation, audit rewriting, ranking override or provider activation.

## D-G2-002 — No endpoint privilege escalation

**Decision:** Existing general/customer POST/PUT endpoints are not Desktop Admin commands merely because they are reachable.

A future Admin mutation requires an explicit server-authorised command contract with authentication, authorisation, audit, validation and retry/idempotency semantics.

## D-G2-003 — Direct database access prohibited

**Decision:** `apps/admin-desktop` may not depend on `@miqo/db`, PostgreSQL drivers or direct database connectivity.

## D-G2-004 — Online authority

**Decision:** Desktop is online-required for authoritative MIQOS state. Offline mode may show shell/build identity/disconnected states but may not calculate or mutate authoritative domain outcomes.

## D-G2-005 — Sensitive technical evidence remains Admin-only

**Decision:** Raw provider-response and detailed lineage evidence may be surfaced to authorised Admin users but must not leak into customer contracts, logs or uncontrolled local files.

## D-G2-006 — Native privilege does not confer domain privilege

**Decision:** Tauri core may later provide authorised OS functions only. It does not gain MIQOS business authority by virtue of running natively.
