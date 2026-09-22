# G7/G8 Sequencing Control

**Status:** CONTROLLED DEPENDENCY

## Dependency identified

The blueprint requires G7 to execute a Desktop package CI successfully, while WP-G8.1 is the point at which `apps/admin-desktop` is created.

Therefore:

~~~text
G7 CI architecture/preflight
        ↓
G8.1 Desktop scaffold
        ↓
G7 full package CI
        ↓
G7 final PASS
        ↓
remaining G8 proof
~~~

## Control treatment

The programme must not fabricate a package or create application scope early merely to label G7 PASS.

G7 is therefore split operationally into:

### G7-A — executable CI architecture/preflight

Completed before scaffold:

- canonical CI entry point;
- Windows runner/toolchain;
- actual workflow;
- shared-baseline Windows preflight;
- artefact contract;
- release/signing contract.

### G7-B — package CI closure

Requires only the G8.1 scaffold substrate:

- Desktop typecheck/tests;
- Rust format/clippy/tests;
- Tauri NSIS build;
- checksum/manifest;
- workflow artefact;
- successful full CI run.

## Status rule

Until G7-B is executed successfully:

~~~text
G7 = PARTIAL PASS
~~~

WP-G8.1 may therefore be executed next as a minimal controlled dependency unlock. After the scaffold commit, G7-B runs before the remainder of G8.

This preserves, rather than weakens, the blueprint requirement that G7 cannot be called PASS without executable package CI evidence.
