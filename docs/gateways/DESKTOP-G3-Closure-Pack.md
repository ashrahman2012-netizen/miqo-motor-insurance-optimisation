# DESKTOP-G3 — Local Data Protection, Secrets & Production-Security Architecture — Closure Pack

**Gateway:** DESKTOP-G3  
**Branch:** `miqo/desktop-g3`  
**Certified G2 entry:** `e42cfb1dd9d57195606352973b125d210263f509`  
**Execution evidence head before this closure record:** `f27dd6096a05db8bd3804227b777169223996866`  
**Tracker:** issue #13  
**Primary platform:** Windows x64 / MSVC  
**Boundary:** `SYNTHETIC_ONLY`  
**Status at creation:** G3.0–G3.9 PASS; G3.10 pending GREEN CI on this closure commit.

## 1. Purpose

DESKTOP-G3 closes the local Windows data-protection and packaged-runtime security gateway inherited from certified DESKTOP-G2. The gateway certifies the synthetic Windows x64 security architecture only; it does not authorise production use or release.

## 2. Frozen certified architecture

- Tauri 2 native Windows host; Windows x64 / MSVC; unsigned NSIS current-user installer.
- Packaged Node 22.23.3, Next standalone customer/admin, Fastify API and PGlite 0.5.8 protected persistence.
- Windows current-user DPAPI-rooted protected key hierarchy with machine-context fail-closed evidence.
- Per-launch local capability/session authority; no static packaged admin authority.
- Explicit WebView/CSP/local-origin hardening; loopback-only packaged services.
- Metadata-oriented/redacted diagnostics.
- Protected application data retained across uninstall/reinstall.
- Installed runtime requires no host Node/npm/Docker/external PostgreSQL.
- Boundary remains `SYNTHETIC_ONLY`.

## 3. Gateway outcomes

| Gate | Requirement | Result |
|---|---|---|
| G3.0 | Frozen security inventory, threat model and classification | PASS |
| G3.1 | Windows secret/key hierarchy architecture | PASS |
| G3.2 | Encrypted PGlite persistence feasibility/parity | PASS |
| G3.3 | Protected local persistence implementation | PASS |
| G3.4 | Secret-store lifecycle and fail-closed recovery | PASS |
| G3.5 | Loopback API/session capability hardening | PASS |
| G3.6 | Tauri/WebView/local-origin hardening | PASS |
| G3.7 | Logging/diagnostics/support-evidence redaction | PASS |
| G3.8 | Windows negative-security certification | PASS |
| G3.9 | Inherited regression + dedicated Windows security CI | PASS |
| G3.10 | Immutable-head closure | PENDING FINAL GREEN CI |

## 4. Exact execution evidence

Execution evidence head:

```text
f27dd6096a05db8bd3804227b777169223996866
```

Dedicated workflow: `desktop-g3 #51`, run `36556149229`, **SUCCESS**.

All ten jobs passed: `pglite-encryption-feasibility`, `protected-runtime-integration`, `windows-key-lifecycle-primary`, `windows-key-lifecycle-wrong-machine`, `key-lifecycle-certification`, `local-capability-hardening`, `webview-local-origin-hardening`, `diagnostics-redaction`, `windows-negative-security`, and `windows-installer-regression`.

Inherited workflow: `ci #1027`, run `36556149078`, **SUCCESS**. Required jobs `locked-dependencies`, `postgres-contract`, `db-g10-hardening`, and `target-stack-sprint1` all passed.

## 5. Evidence artifacts on execution head

- G3.2 feasibility — id `11027707497`; `sha256:447b476cf6885fd73c0d53dd3f3bd5a804d6528b6a0f67d9f4fda4ef16237ed2`
- G3.3 protected runtime — id `11026938579`; `sha256:ade686a2f6a25f40b1e4c6e27b1cc73b4b97d706daed8e5fbe13d6e7479a35a4`
- G3.4 primary lifecycle — id `11027824592`; `sha256:4ce6d44ca95abbde27ceb7ec5e7725af8469a724c9de012e386b2f368e6c8edd`
- G3.4 wrong-machine — id `11027349847`; `sha256:10f6dfea00017fb165bea1a33b9c0795286188e40d1302c8ac7767b9b080acef`
- G3.5 local capability — id `11028350998`; `sha256:2025dab39e347fd9ea75fe1c416549e9095b0d7b478c63425a1ede9b03705fb0`
- G3.6 WebView hardening — id `11028651700`; `sha256:637871e5033d74b4feb2f1cde0be33153cb612c76e27cb62174b0ef8573c5875`
- G3.7 diagnostics redaction — id `11028366126`; `sha256:d9729d251b4a4f1454cd00095f0ecf12d81ba14c7f798caaaaa74b2d3311a563`
- G3.8 negative security — `desktop-g3-g3.8-negative-security-f27dd6096a05db8bd3804227b777169223996866`; id `11029486007`; `sha256:5f9e847d1a5365f00db84a21c93e668f2c2effbf806c4950e74103faaa5ac39e`
- G3.9 installer regression — `desktop-g3-g3.9-installer-regression-f27dd6096a05db8bd3804227b777169223996866`; id `11029357417`; 36870225 bytes; `sha256:0faffa530d5662423fac5b24002bccce608c88b4819e18bfcb0803edfa749d03`

G3.9 passed canonical packaged Node 22.23.3 and runtime-manifest verification; LiteralPath-safe SHA-256 inventory for installer, installed executable, packaged Node and runtime manifest; protected PGlite; owned-session capability; loopback-only services; clean shutdown; protected-store/keyring proof; restart; uninstall/reinstall; protected-data retention; keyring retention; and host-dependency poison controls.

## 6. Residual-risk register

1. Installer/executable remain unsigned; signing is outside G3.
2. Windows x64 is the only desktop platform certified by G3.
3. Production identity/RBAC remains downstream; local capability is not production identity.
4. Real customer/provider data and credentials remain prohibited.
5. Live insurer/provider activation remains prohibited.
6. Auto-update/public release-channel controls remain downstream.
7. Production telemetry, secrets and infrastructure controls remain downstream.
8. GitHub-hosted Windows runners are the certification environment; physical-device release qualification remains downstream.
9. Protection does not claim resistance to a fully compromised authorised Windows user/session.

## 7. Architecture decisions retained

PGlite remains the embedded backend. Persistent protected representation may not rely on plaintext authoritative storage. Windows current-user protection remains the local root of trust; machine context participates in fail-closed lifecycle. Loopback is not authentication. Runtime authority is per-launch and non-persistent. Static packaged admin authority is absent. Diagnostics remain metadata-oriented/redacted. Uninstall preserves protected application data. MIQO factual-profile immutability, integrity/evidence lineage and recommendation authority remain unchanged.

## 8. Hard-boundary confirmation

G3 remained `SYNTHETIC_ONLY`: live providers disabled; no real customer/provider data or credentials; no production IdP/RBAC; no signing/notarisation; no auto-update; no public release/deployment; no merge to `main`; no production infrastructure mutation.

## 9. Immutable-head closure rule

This closure document changes the branch head. G3.10 may be marked PASS only after the exact closure commit independently receives GREEN `desktop-g3` and GREEN inherited `ci`. This commit introduces no executable/runtime/security-control change beyond this closure record.

Only after both workflows are GREEN on that exact closure head may issue #13 be closed as `DESKTOP-G3 — PASS`.

That PASS certifies the local Windows data-protection and packaged-runtime security architecture under `SYNTHETIC_ONLY` execution and grants no production, release, signing, live-provider or real-data authority.
