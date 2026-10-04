# MIQOS CC5 — Control-Plane Assurance & Closure

## Status

CC5 closure candidate. Certification remains pending until branch validation, PR validation,
merge, and post-merge validation complete.

## Certified predecessor

- Stage: EH3 — Provider-Integration Seam Hardening
- Certified integrated head: `ed389b0f7a5dfa203f2058ceccf4e48a117dc3c8`
- Programme position entering CC5: 96%

## Scope

CC5 assures and closes the current MIQOS control plane. It does not add product functionality,
provider connectivity, deployment authority, or live-data capability.

The control plane remains `SYNTHETIC_ONLY`.

## Assurance conclusions to prove

1. CC3 remains the exclusive guarded mutation boundary.
2. CC4 remains observational; events and notification acknowledgement do not authorise writes.
3. Stale-head, approval, path-scope, operation-scope and idempotency protections remain effective.
4. Closure evidence is internally consistent and cannot report 100% while INT1 is unresolved.
5. Runtime policy does not self-enable `CC5_AUTHORISE`.
6. Live providers remain disabled and no provider credential path is introduced by CC5.

## Existing negative evidence reused

The broker contract suite already proves:

- explicit human approval is required;
- stale product HEAD is rejected before mutation;
- writes-disabled mode records a blocked receipt;
- a dedicated write identity is required;
- mutating actions require an idempotency key;
- out-of-scope file mutation is rejected;
- unsupported mutation types are rejected;
- identical idempotent replay does not issue a second mutation;
- idempotency-key reuse with a changed packet is rejected;
- controlled validation PR namespace checks fail closed.

CC5 adds closure-specific evidence rather than duplicating these tests.

## Current certification ledger

The machine-readable ledger is:

`control-centre/certification-ledger.v1.json`

It records CC4 and EH3 as closed and CC5 as pending until integration certification succeeds.

## Regression evidence

The unified regression matrix retains the existing verified schema while refreshing certification
pointers to current successful evidence, including EH3 post-merge CI/control-centre receipts and
the successful PR desktop regression receipts.

## Residual risks

The machine-readable residual-risk register is:

`control-centre/residual-risks.v1.json`

The principal open item is INT1, which is an external dependency rather than an internal
control-plane defect.

## External dependency

`INT1 — SEOPA / Quotezone onboarding` remains:

- status: `WAITING_EXTERNAL`
- gate: `PROVIDER_RESPONSE_REQUIRED`
- progress: 0%
- programme weight: 2%

CC5 must not change this state without provider evidence.

## Programme closure rule

Before CC5 certification:

- programme = 96%
- EH3 = CLOSED
- CC5 = NEXT
- INT1 = WAITING_EXTERNAL

After successful CC5 integration certification:

- CC5 may be marked CLOSED
- programme may advance to 98%
- INT1 remains WAITING_EXTERNAL
- programme must not become 100%

100% is permitted only after evidence-backed INT1 closure.

## Protected implementation boundary

CC5 does not modify the GitHub writer, mutation policy, runtime action allowlists, event runtime,
product applications, provider-integration runtime, database schema, dependencies, or lockfile.

Any functional defect discovered in those protected components requires a separate correction
packet and authorisation.

## Closure sequence

```text
CC5 candidate validation
→ bounded diff review
→ integration PR
→ PR regression GREEN
→ merge
→ post-merge control-centre + CI GREEN
→ final closure metadata update
→ final validation
→ CC5 CLOSED / Programme 98%
```

Control-plane closure does not constitute live insurer/comparison-provider integration or
commercial-production readiness.
