# MIQOS CC-3 — Authorised GitHub Execution Broker

CC-3 extends the proven CC-2 local broker with a tightly constrained GitHub write plane.

## Security invariants

- broker remains bound to `127.0.0.1`;
- `SYNTHETIC_ONLY` remains mandatory;
- human `APPROVED` state is required;
- the product `expectedHead` must match a live GitHub HEAD;
- every mutating packet requires an idempotency key;
- a dedicated write identity is required;
- `gh-cli` authentication remains read-only and is never reused for CC-3 writes;
- mutation types and paths are server-side allow-listed;
- no merge, branch deletion, repository settings, secrets, releases or production actions are implemented;
- every operation produces a durable execution receipt.

## Initial write scope

Only `EH1_AUTHORISE` is write-enabled in the first CC-3 policy.

Its controlled namespace is:

`miqo/cc3/eh1-*`

Allowed file paths are limited to the legacy G1/G2 harness/workflow surface defined in `action-policy.v1.json`.

Allowed workflows:

- `desktop-g1.yml`
- `desktop-g2.yml`
- `desktop-g3.yml`

Allowed validation base:

`miqo/desktop-uat-remediation`

Allowed evidence issue:

`#19`

## Supported primitives

The broker implements bounded primitives for:

- controlled branch creation;
- allow-listed file create/update;
- allow-listed workflow dispatch;
- draft validation PR creation;
- evidence comments on allow-listed issues;
- validation PR closure after namespace/base verification.

There is deliberately no generic arbitrary GitHub endpoint.

## Write identity

Preferred production direction: a least-privilege GitHub App installation token supplied to the broker as:

`MIQOS_GITHUB_APP_INSTALLATION_TOKEN`

A dedicated fine-grained token can be used for local CC-3 validation through:

`MIQOS_GITHUB_WRITE_TOKEN`

Do not place either credential in HTML, source files, action packets, logs or chat.

## Startup

Locked mode:

```powershell
.\control-centre\broker\start-cc3.ps1
```

Guarded write mode:

```powershell
$env:MIQOS_GITHUB_WRITE_TOKEN = "<dedicated least-privilege token>"
.\control-centre\broker\start-cc3.ps1 -EnableWrites
```

CC-3 never derives write authority from `gh auth token`.

## Initial physical acceptance

1. start locked mode and prove read-only behaviour is preserved;
2. enable a dedicated write identity;
3. submit an explicitly approved `EH1_AUTHORISE` packet with an exact HEAD and idempotency key;
4. first live write proof should create only a controlled `miqo/cc3/eh1-*` branch and post an evidence comment to Issue #19;
5. verify the persisted `COMPLETED_CC3_WRITE` receipt;
6. do not apply the EH-1 code patch until its exact write plan is separately reviewed and approved.
