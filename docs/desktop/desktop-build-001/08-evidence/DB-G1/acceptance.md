# DB-G1 acceptance — BUILD Control System & UX/Capability Baseline

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G1  
**Result:** PASS  
**Date:** 2026-09-22  
**Entry SHA:** `bf98190a81c57deae8033c7588e0561b0001d17a`  
**Accepted control revision:** `e832fa8344745222fa060bb19f4a9175b2e78dd7`

## Accepted outputs

DB-G1 directly inspected and froze the exact seven-screen UX reference (`MIQOS-Desktop-App-UX-Demo.zip`, SHA-256 `4bdb761e9c0f7b3ebb6c702ec7e834a1e981358fa352a1bab1faf6b329ca35db`) without committing its binaries.

The gateway now freezes:

- screen-by-screen ADOPT / ADAPT / EXCLUDE decisions;
- the Foundation sheet as primary visual-system reference;
- Audit & Trace Console as primary Admin operational reference;
- canonical Desktop Admin IA/route baseline;
- action-level capability authority;
- local-only command/search boundary with global search DEFERRED;
- `@miqo/ui` as shared host-neutral design-system authority;
- runtime-export versus catalogue-target component distinctions;
- DB-G2 shell/component priorities;
- accessibility design requirements for later executable proof.

No customer/profile mutation, scenario generation, quote execution/selection, recommendation acceptance/handoff, provider activation, ranking/comparison/integrity override, global search or fabricated dashboard aggregate is admitted by the UX reference.

## Exact control revision delta

`bf98190a81c57deae8033c7588e0561b0001d17a` → `e832fa8344745222fa060bb19f4a9175b2e78dd7` is one commit ahead / zero behind and changes exactly 15 documentation/control files under `docs/desktop/desktop-build-001/**`:

```text
00-control/blocker-register.md
00-control/capability-register.md
00-control/change-control.md
00-control/decision-log.md
00-control/execution-status.md
00-control/gateway-register.md
00-control/risk-register.md
01-foundation/desktop-component-inventory.md
01-foundation/desktop-information-architecture.md
01-foundation/ux-adoption-matrix.md
01-foundation/ux-reference-model.md
08-evidence/DB-G1/README.md
08-evidence/DB-G1/authority-crosscheck.md
08-evidence/DB-G1/shared-ui-inventory.md
08-evidence/DB-G1/ux-reference-inspection.md
```

No `apps/**`, `packages/**`, `scripts/**`, `.github/**`, dependency, database, PREP or application-BUILD file changed.

## UX source evidence

Exact members:

1. `ChatGPT Image Sep 20, 2026, 04_55_09 PM-1.png` — Customer Dashboard
2. `ChatGPT Image Sep 20, 2026, 04_55_12 PM-2.png` — Profile Review & Lock
3. `ChatGPT Image Sep 20, 2026, 04_55_14 PM-3.png` — Objective & Scenario Explorer
4. `ChatGPT Image Sep 20, 2026, 04_55_16 PM-4.png` — Quote Comparison
5. `ChatGPT Image Sep 20, 2026, 04_55_18 PM-5.png` — Recommendation Detail
6. `ChatGPT Image Sep 20, 2026, 04_55_20 PM-6.png` — Audit & Trace Console
7. `ChatGPT Image Sep 20, 2026, 05_04_38 PM-7.png` — Foundation, App Shell & Shared Design System

See `ux-reference-inspection.md`, `shared-ui-inventory.md` and `authority-crosscheck.md`.

## Executable regression evidence

The accepted control revision `e832fa8344745222fa060bb19f4a9175b2e78dd7` is green under:

- push `ci` #671 / run `35760948153` — SUCCESS
  - `postgres-contract` job `106858542702` — SUCCESS
  - `locked-dependencies` job `106858543010` — SUCCESS
  - `target-stack-sprint1` job `106858543278` — SUCCESS
- pull-request `ci` #672 / run `35760954632` — SUCCESS
  - `postgres-contract` job `106858567064` — SUCCESS
  - `target-stack-sprint1` job `106858567173` — SUCCESS
  - `locked-dependencies` job `106858567302` — SUCCESS

The Desktop PREP G7/G8 workflows are not claimed for this DB-G1 documentation-only delta. Their branch/path filters were not altered. Existing PREP package/installed proof remains inherited rather than re-labelled as DB-G1 executable evidence.

## Boundary review

| Question | Result |
|---|---|
| Domain/business semantics changed? | No |
| Database access introduced? | No |
| Admin mutation introduced? | No |
| API/resource authority broadened? | No |
| Environment boundary changed? | No |
| Security/native privilege boundary changed? | No |
| Dependency/toolchain/workflow changed? | No |
| UX authority conflict unresolved? | No; conflicting customer actions are excluded/deferred |

## Risks and blockers

No DB-G1 blocker remains. DB-G1 records controlled risks for dense-data accessibility, unsupported global search/aggregates, design-system fragmentation, raw evidence leakage and catalogue/runtime confusion. These remain assigned to later implementation/hardening gateways as appropriate.

Carried real-IdP, production-signing, real-environment, CC-G3-001, CC-G5-001, CC-G6-001 and inherited dependency findings remain open downstream obligations.

## Exit

**DB-G1 = PASS.**

DB-G2 — Desktop Application Foundation remains **NOT STARTED** and requires a separate controller execution block. DB-G1 authorises no executable Desktop implementation by itself and no production/release claim.
