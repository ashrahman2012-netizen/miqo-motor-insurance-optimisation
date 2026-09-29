# DESKTOP-UAT — Physical Windows Remediation Programme

**Workstream:** DESKTOP-UAT  
**Branch:** `miqo/desktop-uat-remediation`  
**Frozen source:** `939e935d23753886a9697341764910333ccce3e7`  
**Tracker:** issue #15  
**Boundary:** `SYNTHETIC_ONLY`  
**Status:** ACTIVE — remediation baseline established; implementation not yet started.

## 1. Purpose

This workstream converts physical Windows UAT findings from the certified DESKTOP-G3 package into controlled desktop-product remediation.

It is not DESKTOP-G4 and does not expand production authority.

The frozen DESKTOP-G3 closure remains the security reference. All remediation must preserve its certified controls unless a separately authorised gateway explicitly changes them.

## 2. Confirmed physical-UAT findings

### UAT-DESKTOP-001 — visible packaged runtime consoles

**Observed:** normal desktop execution exposes user-visible console/terminal windows for packaged Next.js/Node child processes.

**Root implementation surface:** packaged Node services are created through Rust `std::process::Command` with inherited stdout/stderr and without a Windows no-window process creation flag.

**Required outcome:** customer/admin/API child processes run without user-visible console windows while lifecycle ownership, diagnostics, private key handoff, runtime capability and clean shutdown remain intact.

### UAT-DESKTOP-002 — no retained-profile discovery/resume

**Observed:** after successful shutdown/relaunch, the desktop opens C-01 and offers only `Start synthetic profile`. The customer entry page is stateless and does not discover or resume retained protected profiles.

**Required outcome:** relaunch exposes a deterministic resume/discovery experience without implicitly creating a new profile.

### UAT-DESKTOP-003 — prototype-grade product presentation

**Observed:** installer and application surfaces remain engineering/prototype oriented, with MIQO/MIQOS naming inconsistency, generic installer presentation, raw technical identifiers and minimal desktop composition.

**Required outcome:** coherent MIQOS product shell and installer presentation without weakening inherited security or lifecycle behaviour.

## 3. Physical baseline already established

The certified package has been exercised on a physical Windows device with the following results:

- installation — PASS;
- desktop launch — PASS;
- customer profile creation — PASS;
- factual write — PASS;
- validation — PASS;
- profile lock — PASS;
- admin read-back and audit reconstruction — PASS;
- normal close terminates desktop host and owned Node children — PASS;
- ports 3000/3001/4000 are released on shutdown — PASS;
- relaunch restores exactly the packaged loopback runtime — PASS;
- protected keyring survives restart — PASS;
- encrypted protected store survives restart — PASS;
- destructive uninstall with explicit application-data deletion — expected behaviour confirmed;
- interactive uninstall with application-data deletion unselected — executable removed while keyring/store remain unchanged — PASS.

## 4. Remediation sequence

### R1 — child-process presentation

Implement the smallest Windows-specific process-creation correction that suppresses child console windows.

Acceptance:

- no visible packaged Node console windows;
- three packaged Node services still start;
- listeners remain exactly `127.0.0.1:3000`, `127.0.0.1:3001`, `127.0.0.1:4000`;
- runtime key continues through the private inherited descriptor/pipe;
- per-launch capability remains unchanged;
- child processes terminate when desktop host exits;
- diagnostics remain available without exposing secrets.

### R2 — persisted-profile discovery/resume

Add a bounded local-profile discovery/resume contract.

Acceptance:

- zero retained profiles → explicit new-profile state;
- one retained profile → explicit resume/open option;
- multiple retained profiles → deterministic profile chooser;
- no new profile is created merely by launching or viewing the entry screen;
- locked profiles remain locked;
- factual-profile immutability remains unchanged;
- audit and lineage remain reconstructable;
- no new plaintext index/store is introduced outside the protected persistence boundary.

### R3 — MIQOS desktop application shell

Introduce the MIQOS visual/product shell while retaining the existing certified functional paths.

Acceptance:

- consistent MIQOS customer-facing identity;
- clear customer/admin separation;
- navigation and progress states;
- loading, empty, error, locked and recovery states;
- technical IDs remain available where required for support/audit but are not the primary customer presentation;
- keyboard/accessibility behaviour remains compatible with inherited hardening.

### R4 — installer/product presentation

Improve installer branding and product presentation.

Acceptance:

- MIQOS iconography/naming;
- current-user NSIS behaviour preserved;
- application-data deletion remains an explicit user choice;
- destructive and retention uninstall modes remain testable;
- signing is not claimed or introduced unless separately authorised.

### R5 — regression and physical UAT

Required before remediation closure:

- targeted tests for R1/R2/R3/R4;
- dedicated `desktop-g3` workflow GREEN on remediation head;
- inherited `ci` GREEN;
- physical Windows install/launch/shutdown/relaunch GREEN;
- retained-profile discovery/resume GREEN;
- uninstall retention GREEN;
- explicit destructive-data uninstall GREEN;
- no visible child consoles;
- final exact-head evidence recorded.

## 5. Inherited controls that may not be weakened

- AES-256-GCM protected persistence;
- no authoritative persistent plaintext PGDATA;
- serialised checkpoint-before-ACK durability;
- fail-closed protected-store behaviour;
- DPAPI current-user + machine-context key lifecycle;
- wrong-user/wrong-machine fail-closed semantics;
- no static packaged admin authority;
- independently generated per-launch local capability;
- explicit CSP and controlled 127.0.0.1 navigation;
- devtools disabled;
- loopback-only packaged listeners;
- redacted/metadata-oriented diagnostics;
- no required host Node/npm/Docker/external PostgreSQL;
- uninstall retention policy where the user does not choose data deletion;
- `SYNTHETIC_ONLY`.

## 6. Change-control rule

Remediation occurs only on `miqo/desktop-uat-remediation`.

The frozen `miqo/desktop-g3` branch and certified closure head `939e935d23753886a9697341764910333ccce3e7` remain untouched.

Each remediation item should be implemented and proven independently. Do not combine process-lifecycle, profile-discovery and visual redesign changes into one unbounded patch.

## 7. First implementation target

Begin with **R1 / UAT-DESKTOP-001**.

Reason: it is a narrow, implementation-identifiable desktop defect with a clear physical acceptance test and minimal product-domain impact. Fixing it first establishes the remediation branch and regression discipline before broader UX work.
