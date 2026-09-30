# MIQOS Collaboration Control Centre V2 — Architecture

## Objective

Provide one governed control plane for MIQOS roadmap execution, GitHub repository state, ChatGPT/model analysis, human approval, physical UAT, integration readiness, roadmap deltas and evidence.

The Control Centre must let the user expand a roadmap stage, inspect its internal components, open the stage's pre-recorded command pad, and explicitly approve/reject/defer execution.

## Core interaction

```text
Roadmap stage
    ↓
Component inspection
    ↓
Pre-recorded action packet
    ↓
Human approval
    ↓
Trusted Control Broker
   ↙              ↘
GitHub            ChatGPT/model
   ↘              ↙
 execution + analysis
        ↓
 consolidated receipt
        ↓
 roadmap/evidence update
```

The browser never stores GitHub, OpenAI or provider credentials.

## V2 stage model

Each stage contains:

- immutable stage ID;
- lane;
- title and summary;
- current status;
- relative planning start and duration estimate;
- progress;
- gate/dependencies;
- inner components;
- evidence requirement;
- one or more pre-recorded actions.

Each action contains:

- action ID;
- UI verb such as PROCEED, AUTHORISE, EXECUTE, ACCEPT or DEFER;
- execution mode: read-only, decision or execute;
- target channels: GitHub, ChatGPT/model and/or human;
- exact instruction list;
- current branch and expected head;
- prohibitions;
- required evidence receipt.

## Timescale policy

The initial timescale is relative (T+N) and explicitly a planning estimate, not a deadline. Calendar dates may be added only after the user approves a schedule.

## Command-pad execution packet

An approved packet carries:

```json
{
  "packetVersion": "1.0",
  "repository": "ashrahman2012-netizen/miqo-motor-insurance-optimisation",
  "branch": "miqo/desktop-uat-remediation",
  "expectedHead": "<exact-sha>",
  "boundary": "SYNTHETIC_ONLY",
  "stageId": "EH1",
  "actionId": "EH1_AUTHORISE",
  "verb": "AUTHORISE",
  "instructions": ["..."],
  "approval": {
    "required": true,
    "status": "APPROVED"
  },
  "prohibitions": ["..."],
  "expectedReceipt": ["..."]
}
```

The broker rejects a write packet when the expected head is stale unless the user re-authorises against the new head.

## GitHub channel

Use a GitHub App with least-privilege installation permissions. GitHub webhooks feed back:

- push/commit changes;
- PR state;
- issues/comments;
- workflow run/job lifecycle;
- artifacts/evidence.

The broker may expose bounded operations for:

- read branch/head;
- compare commits;
- create/update issue;
- create controlled branch;
- create/update approved files;
- create validation PR;
- dispatch approved workflow/repository event;
- read workflow/job/artifact result.

No generic arbitrary GitHub mutation endpoint should be exposed to the browser.

## ChatGPT/model channel

The browser does not connect directly to a model with an API key.

The trusted broker owns the server-side model session and submits an approved action packet plus current GitHub evidence. The model is used for:

- exact-scope plan validation;
- failure triage;
- bounded patch proposal;
- verification review;
- next-safe-action generation;
- final receipt summarisation.

The broker exposes only bounded MIQOS actions to the model and remains the authority for GitHub writes.

## Human channel

The user remains the authority for:

- approve/reject/defer;
- promotion or merge authorisation;
- physical UAT;
- external provider/commercial decisions;
- any boundary expansion.

## Required broker endpoints

- `GET /api/status`
- `GET /api/roadmap`
- `GET /api/events`
- `POST /api/actions/execute`
- `POST /api/actions/decision`
- `POST /api/github/webhook`
- `GET /api/github/snapshot`
- `POST /api/chatgpt/review`

A later authenticated version may add explicit bounded endpoints for authorised branch/PR/workflow actions.

## Event and receipt model

Every execution creates a receipt with:

- packet ID;
- approved stage/action;
- approver timestamp;
- input branch/head;
- model analysis ID where applicable;
- GitHub commits created;
- PR/issue references;
- workflow run IDs and conclusions;
- artifact/evidence IDs;
- resulting branch/head;
- roadmap deltas;
- next-safe-action.

## Roadmap delta policy

Roadmap changes are append-only events:

- CHANGED — an existing item changed;
- NEW — a new item was added;
- DEFERRED — execution postponed;
- SUPERSEDED — explicitly replaced;
- CLOSED — evidence-backed completion.

Original stage IDs and lineage remain discoverable.

## Security controls

1. No GitHub/OpenAI/provider credentials in HTML, localStorage or exported action packets.
2. GitHub App or equivalent least-privilege server-side authentication.
3. Webhook signature verification.
4. Stale-head rejection.
5. Explicit per-action allow-list.
6. Human approval before write-capable action.
7. Idempotency key per packet.
8. Append-only execution receipts.
9. Local/UI display redaction.
10. Current project boundary remains `SYNTHETIC_ONLY`.

## Implementation phases

### CC-1 — V2 interactive control surface
Expandable roadmap, relative timeline, component inspection, command pads, local approval queue and export.

### CC-2 — read-only broker
GitHub branch/run/issue/PR snapshot + model status. No GitHub writes.

### CC-3 — authorised execution broker
Stale-head guard, GitHub App, bounded action dispatch, server-side model session, receipts.

### CC-4 — real-time feedback
GitHub webhooks, workflow/run updates, notifications and automatic roadmap status refresh.

### CC-5 — assurance and closure
Threat model, negative tests, audit/receipt integrity, recovery/replay protection and immutable closure.

## Current governing rule

The Control Centre is an orchestration layer. It must not silently expand MIQOS runtime authority or bypass existing gate/change-control rules.
