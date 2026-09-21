# G7 Windows Preflight Run Evidence

**Gateway:** G7-A
**Result:** PASS
**Date:** 2026-09-21
**Validation PR:** #5 — MIQOS-DESKTOP-PREP-001 — G7 CI validation
**Validated head:** `182a912d4dd2a3aa63f437d9a106edc23140c9ca`

## Successful Desktop workflow

- workflow: `desktop-prep-g7`
- run ID: `35601094369`
- run number: `19`
- job: `Windows Desktop preflight/full`
- job ID: `106337119883`
- conclusion: **SUCCESS**
- execution mode: **Preflight**

Runner evidence:

~~~text
runner version: 2.337.0
image: windows-2025-vs2026
image version: 20260907.229.1
Node: v22.16.0
npm: 10.9.2
Rust: rustc 1.98.1 (48a229cea 2026-09-01)
Cargo: 1.98.1 (797e8a9bc 2026-08-05)
MSVC: Visual Studio 18 Enterprise C++ workload detected
~~~

Validation evidence:

~~~text
npm ci                         PASS
verify:pins                    PASS
verify:boundary                PASS
application-adapters typecheck PASS
application-adapters tests     PASS — 7 files
@miqo/ui typecheck             PASS
@miqo/ui tests                 PASS — 2 files
root npm build                 PASS
DESKTOP_G7_PREFLIGHT_PASS      recorded
~~~

Package upload was correctly skipped because `apps/admin-desktop` does not yet exist.

## Certified baseline workflow on same head

Existing workflow `ci`:

- run ID: `35601094316`
- run number: `452`
- conclusion: **SUCCESS**

Jobs:

- `locked-dependencies` — SUCCESS
- `postgres-contract` — SUCCESS
- `target-stack-sprint1` — SUCCESS

This proves the G7 CI-infrastructure additions did not break the certified target-stack verification on the validated head.

## Remediated preflight findings

### Attempt 1 — Rust release hash over-constraint

Run ID: `35600768327`

The runner successfully installed Rust 1.98.1, but the initial script incorrectly hard-coded a guessed rustc build hash/date.

Control response:

- no retry loop;
- inspected job log;
- changed assertion to exact semantic toolchain version `1.98.1`;
- preserved toolchain pin.

### Attempt 2 — Windows shell glob portability

Run ID: `35600902350`

The existing certified workspace test scripts use shell glob syntax such as:

~~~text
vitest run test/*.test.ts
~~~

Under Windows cmd.exe the wildcard was passed literally and Vitest reported no test files.

Control response:

- did not modify the frozen shared package manifests;
- Desktop Windows CI invokes the same installed Vitest suites using workspace-local `npm exec ... vitest run`;
- final run proved all adapter/UI tests passed.

## Dependency-audit observation

`npm ci` reported **4 moderate-severity vulnerabilities** from the inherited locked dependency set.

This was not introduced by G7 and did not fail the certified existing CI. It is recorded as a dependency-maintenance risk rather than silently repaired inside Desktop PREP.

## G7-A conclusion

**PASS**

The Windows CI architecture and preflight are executable and proven.

G7 overall remains **PARTIAL PASS** solely because Full mode requires the WP-G8.1 Desktop scaffold before an NSIS package can exist.
