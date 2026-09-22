# Frozen BUILD baseline and invariants

Date: 2026-09-22. DB-G0 documentation/control scope only.

| Baseline | Frozen identity |
|---|---|
| Application | miqos/app-build-001 at ce211bf4e23643f1eab75e865210f4de121841fb |
| Desktop executable source | d8eb075b894ead75b00f7a501a2acde032d7a6c3 |
| PREP certified evidence head | ff47096526b4bcf381ea69bc5a20bf01dcbaf9f0 |
| G9 closeout / BUILD entry | miqos/desktop-prep-001 at f01776e9bb98bb47a0693f43194d1d48b03b6d5e |
| Initial BUILD tree | 1cdd107f7cfbf30e125ff82ee44eb54973df6cc2 |
| BUILD branch | miqos/desktop-build-001 |
| Initial comparison | ahead 0; behind 0; identical tree; clean worktree |
| Handover | MIQOS-DESKTOP-BUILD-001-CODEX-HANDOVER-v1.0.md |
| Handover SHA-256 | 35df0ae4c2d93e27502e684c8ed98a87d1d25fba6d4ee786a79d9f472b68b976 |
| UX archive | MIQOS-Desktop-App-UX-Demo.zip, seven PNGs |
| UX SHA-256 | 4bdb761e9c0f7b3ebb6c702ec7e834a1e981358fa352a1bab1faf6b329ca35db |

## Authority and frozen decisions

Certified PREP records/ADRs govern, followed by handover and active gateway, certified contracts/API/tests, visual-only demo, host-compatible Admin web evidence patterns, then implementation judgement. The active launch/handover authorises DB-G0 only. The broader plan does not authorise later gateways in this run.

- ADR-001: dedicated apps/admin-desktop Tauri 2 + React/TypeScript host; reuse @miqo/ui, @miqo/application-contracts and @miqo/application-adapters where compatible. Fastify/API/domain/PostgreSQL remains authoritative.
- G2: Admin read/inspect only; no implicit domain mutations; no direct DB; online-required authoritative evidence.
- ADR-002: native broker; OIDC/OAuth system-browser Authorization Code + PKCE S256; ephemeral 127.0.0.1 callback, state/nonce; native token ownership; Windows credential storage; allow-listed transport, never arbitrary proxy.
- ADR-003: Windows 11 x64, NSIS current-user, WebView2 Evergreen/bootstrapper, controlled installer replacement, downgrade rejection, no initial self-updater; external protected production signing.
- ADR-004: native immutable non-secret bundled profile; deployment-controlled identifiers/endpoints; server attestation; fail closed; no runtime user environment selector or override. DEVELOPMENT/TEST map to SYNTHETIC, STAGING to CERTIFICATION, PRODUCTION to PRODUCTION. Only TEST/SYNTHETIC with liveProviders=false is initial BUILD execution authority.
- ADR-005: local-first structured logs; INFO baseline, 5 MiB/file, maximum 5 files/7 days; no tokens/raw provider/full customer payloads; independent server request ID plus validated trace context; explicit redacted support bundle, target 25 MiB with SHA-256; no automatic telemetry or dumps.

Authoritative ADRs and their related contracts remain under docs/desktop/desktop-prep-001 at the frozen entry SHA. No protected rule is changed by this summary.

## Toolchain freeze

Node 22.16.0; npm 10.9.2; Rust/Cargo 1.98.1; Tauri CLI 2.11.4; windows-2025 x64. Exact dependency pins and lockfiles remain untouched. Canonical Desktop command: `./scripts/desktop-ci.ps1 -Mode Auto`.

The local general-purpose runtime is Node 24.19.0/npm 11.17.0. It is used only for dependency-free documentation/pin/boundary checks, not certified build/package proof. Unchanged GitHub CI selects the certified Node/npm toolchain. No local Desktop packaging claim is made.

## Invariants copied from controlling handover section 8
These controls apply to every Codex task and every gateway.

```text
INV-D-01  Desktop never owns MIQOS domain truth.

INV-D-02  Desktop never directly accesses PostgreSQL or @miqo/db.

INV-D-03  Admin visibility does not imply Admin mutation authority.

INV-D-04  Locked factual evidence cannot be modified through Desktop.

INV-D-05  Desktop does not determine eligibility, comparison status,
          ranking, recommendation or integrity.

INV-D-06  Desktop does not activate providers or live quotation.

INV-D-07  Environment identity is deployment-controlled and server-attested.

INV-D-08  Tokens, credentials and secrets must not enter renderer state,
          browser storage, logs or support bundles.

INV-D-09  Tauri/native capability is default-deny and least privilege.

INV-D-10  The native API transport is not a generic HTTP proxy.

INV-D-11  Raw provider evidence and normalised quotation remain distinct.

INV-D-12  Missing/partial evidence is never promoted to successful,
          eligible, comparable or PASS state.

INV-D-13  Production identity, signing and environment claims require
          their own executable evidence.

INV-D-14  No gateway may PASS without evidence tied to an exact
          controlled source revision.

INV-D-15  A later gateway may not conceal an unresolved earlier failure.
```

UX-specific invariants:

```text
UX-D-01  The supplied demo is the primary visual reference.

UX-D-02  Visual similarity never creates unauthorised functionality.

UX-D-03  Every active control maps to explicit backend/Desktop authority.

UX-D-04  Deferred capability is represented honestly; do not fabricate data.

UX-D-05  Status presentation preserves authoritative MIQOS semantics.

UX-D-06  Environment identity remains conspicuous.

UX-D-07  Dense operational UI remains keyboard/focus/screen-reader usable.

UX-D-08  Common patterns become reusable components rather than page copies.

UX-D-09  Audit, provider, normalised quote, recommendation and integrity
          evidence remain visually distinguishable.

UX-D-10  Audit & Trace is the primary operational evidence-reference pattern.
```

---
