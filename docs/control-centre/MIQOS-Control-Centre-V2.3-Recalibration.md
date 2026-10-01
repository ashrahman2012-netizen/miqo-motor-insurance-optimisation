# MIQOS Collaboration Control Centre V2.3 — Recalibration

## Purpose

V2.3 refreshes the Control Centre around the now-operational CC-2 broker without changing the broker's established endpoint contract.

Broker remains:

- `http://127.0.0.1:4300`
- `GET /api/status`
- `GET /api/roadmap`
- `GET /api/github/status`
- `POST /api/actions/execute`
- `GET /api/actions/:id`

No broker credential or mutation authority is moved into the browser.

## Recalibrated programme state

Completed/proven:

- DESKTOP-G3 certified baseline
- R1 child-console remediation + physical UAT
- R2.1–R2.4 retained-profile discovery/resume entry
- CC-1 interactive Control Centre surface
- CC-2 local trusted broker + live GitHub read-only ingestion

Next/remaining:

- EH-1 legacy G1/G2 harness harmonisation
- SC-1 supply-chain audit remediation
- EH-2 unified regression matrix
- R2.5 safe DRAFT hydration
- CC-3 authorised GitHub execution broker
- R3 MIQOS application shell
- R4 installer/product presentation
- CC-4 webhook/event feedback
- EH-3 provider-neutral integration seams
- INT-1 SEOPA/Quotezone onboarding — external dependency
- R5 integrated physical UAT/closure
- CC-5 control-plane assurance/closure

Weighted whole-programme completion is recalibrated to approximately 37%. This is a planning metric, not a deadline or release-readiness claim.

## Execution-control rules

1. Every mutating action is human-approved.
2. Action packets bind repository, branch and expected HEAD.
3. CC-2 remains read-only and must block GitHub mutations.
4. CC-3 is the first phase permitted to execute allow-listed GitHub writes.
5. The browser never contains GitHub/OpenAI/provider credentials.
6. The exact ChatGPT Project browser conversation is not directly addressable by standalone HTML. V2.3 therefore provides:
   - structured Project-chat handoff packets; and
   - optional broker-side OpenAI API analysis when configured.
7. `SYNTHETIC_ONLY` remains the current project boundary.

## Current failure register

### Legacy G1

The old Tauri distributable harness does not stage the current repository-root `r/` runtime resource expected by the active Tauri configuration.

Correction belongs to EH-1 and must not change certified runtime semantics.

### Legacy G2

The old Windows lifecycle proof sanitises PATH without the WindowsPowerShell location required by the later certified G3 machine-context/keyring implementation.

Correction belongs to EH-1 and must preserve DPAPI/machine-binding controls.

### Control-branch repository CI

The general repository CI on `miqo/control-centre-v1` currently fails at `npm audit --audit-level=high`, while the dedicated `control-centre` workflow remains green.

This is isolated as SC-1 supply-chain remediation rather than being mixed into CC-2.

## UX refresh

The V2.3 single-file dashboard:

- embeds the supplied round MIQOS logo;
- auto-connects/reconnects to the existing broker;
- refreshes live GitHub state;
- distinguishes broker/GitHub/model/write-authority status;
- expands every roadmap stage into components;
- exposes command pads and remediation instructions;
- copies structured handoffs for the current ChatGPT Project chat;
- calls broker MODEL_REVIEW when the model channel is configured;
- queues CC-2-blocked write actions for later CC-3 re-authorisation;
- maintains a local decision/execution ledger;
- preserves the broker link unchanged.
