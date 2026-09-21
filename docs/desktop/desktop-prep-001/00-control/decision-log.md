# Decision Log

## D-G0-001 — Desktop PREP upstream baseline

**Decision:** Base Desktop PREP on `miqos/app-build-001` at `ce211bf4e23643f1eab75e865210f4de121841fb`.

**Reason:** The repository certification record identifies MIQOS-APP-BUILD-001 as CERTIFIED/COMPLETE. The branch is 166 commits ahead of `main`; therefore `main` is not an acceptable substitute for the certified application baseline.

## D-G0-002 — Execution branch

**Decision:** Create `miqos/desktop-prep-001` directly from the certified SHA.

**Reason:** This preserves exact provenance and isolates Desktop preparation from both `main` and the frozen upstream branch.

## D-G0-003 — Package-management baseline

**Decision:** Preserve the existing npm workspaces and lockfile model during G0.

**Evidence:** Root `package.json` declares npm 10.9.2, Node 22.16.0 and workspaces `apps/*`, `packages/*`; `package-lock.json` is present.

## D-G1-001 — Desktop host architecture

**Decision:** Select **Tauri 2 + React/TypeScript** for the Windows Admin Application.

**Reason:** It preserves the certified React/ViewModel investment while providing an explicit capability-controlled native boundary and Windows installer path without bundling a Node/Chromium privileged runtime.

**Authority:** `01-architecture/adr/ADR-001-tauri-react-windows-admin.md`.

## D-G1-002 — Dedicated Desktop workspace

**Decision:** Create the Desktop application as a new `apps/admin-desktop` workspace during the authorised scaffold/proof phase.

**Reason:** The certified `apps/admin-web` host contains Next.js routing/server assumptions and must remain independently valid.

## D-G1-003 — Domain authority remains remote

**Decision:** Keep Fastify/API/domain/PostgreSQL as the authoritative application/domain path. Tauri core shall not duplicate MIQOS business rules or persistence.

## D-G1-004 — Native capabilities are app-local and least privilege

**Decision:** Tauri/Rust commands and plugins must remain app-local and capability-scoped. Shared `@miqo/ui` and application-adapter packages must remain free from Desktop privileges.

## D-G1-005 — Packaging details deferred to G4

**Decision:** G1 selects the Tauri Windows packaging family but does not pre-select MSI versus NSIS, WebView2 provisioning mode, signing identity or updater configuration. Those are controlled G4 decisions backed by executable packaging evidence.
