# G1 Candidate Architecture Evaluation

**Decision context:** Windows Admin Application  
**Evaluation date:** 2026-09-21  
**Scale:** 1 = poor fit, 5 = strong fit.

## Criteria and weights

| Criterion | Weight |
|---|---:|
| Preserve certified contracts/UI semantics | 25% |
| Security / privilege-boundary quality | 20% |
| Windows packaging/deployment fit | 15% |
| Fit with existing TypeScript/npm engineering system | 15% |
| CI/reproducibility fit | 10% |
| Runtime footprint/servicing burden | 10% |
| Native Windows capability path | 5% |

## Evaluation

| Candidate | Reuse | Security | Packaging | TS/npm fit | CI | Footprint | Native | Weighted /5 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Tauri 2 + React/TypeScript** | 5 | 5 | 5 | 3 | 4 | 5 | 4 | **4.65** |
| Electron + React/TypeScript | 5 | 4 | 4 | 5 | 5 | 2 | 4 | 4.30 |
| WinUI 3 / Windows App SDK | 2 | 5 | 5 | 1 | 4 | 4 | 5 | 3.45 |
| Installed web/PWA only | 4 | 3 | 2 | 5 | 5 | 5 | 1 | 3.70 |

## Candidate findings

### Tauri 2 + React/TypeScript — SELECTED

Strengths:

- reuses React presentation code and TypeScript contracts;
- uses the operating-system WebView rather than bundling a full browser runtime;
- provides an explicit Rust core/WebView process boundary;
- Tauri 2 capability/permission controls can constrain native commands per window/webview;
- CSP can be explicitly restricted;
- Windows packaging supports MSI and NSIS installer paths;
- provides a clear future path for narrowly scoped native credential/storage/lifecycle functions.

Costs:

- introduces Rust and Microsoft C++ build tooling to a repository currently centred on Node/npm;
- WebView2 becomes a runtime dependency on Windows;
- Windows CI needs Rust/MSVC/Tauri tooling;
- Next.js server components/routes cannot simply be copied into the Desktop renderer.

These costs are bounded and are handled by G4/G7.

### Electron + React/TypeScript — REJECTED AS PRIMARY

Strengths:

- highest continuity with Node/npm;
- mature packaging ecosystem;
- straightforward React renderer reuse;
- mature CI support.

Reasons not selected:

- Electron introduces a privileged Node.js main process plus renderer/preload IPC;
- secure operation requires disciplined context isolation, sandboxing, sender validation and restricted bridge exposure;
- Electron ships/serves its own Chromium/Node runtime, adding application-level runtime servicing and footprint;
- MIQOS does not currently require Electron-specific capabilities that justify the larger privileged runtime surface.

Electron remains a fallback if G4 proves the Tauri Windows toolchain infeasible.

### WinUI 3 / Windows App SDK — REJECTED FOR THIS PROGRAMME

Strengths:

- Microsoft's recommended native framework for new native Windows applications;
- first-class MSIX/package identity and native Windows integration.

Reasons not selected:

- would require a substantial C#/XAML UI rewrite;
- existing React components cannot be directly reused;
- typed TypeScript adapters/contracts would need duplicated equivalents or an additional generated-contract system;
- increases semantic-drift risk between certified web/admin UI and Desktop.

WinUI 3 would be appropriate if native Windows controls/performance were the dominant requirement. Current MIQOS Admin requirements do not establish that need.

### Installed web/PWA only — REJECTED

It preserves maximum web reuse but does not satisfy the programme's controlled Desktop host, native-security, installer/signing and OS-integration preparation objectives as cleanly as a real Desktop shell.

## External references consulted

- Tauri architecture: https://v2.tauri.app/concept/architecture/
- Tauri runtime authority: https://v2.tauri.app/security/runtime-authority/
- Tauri CSP: https://v2.tauri.app/security/csp/
- Tauri Windows prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri Windows installer: https://v2.tauri.app/distribute/windows-installer/
- Electron process model: https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron packaging: https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging
- Microsoft Windows development path: https://learn.microsoft.com/windows/apps/get-started/
- Microsoft Windows packaging overview: https://learn.microsoft.com/windows/apps/package-and-deploy/packaging/

## Decision

**Selected architecture family: Tauri 2 + React/TypeScript.**

Exact dependency versions will be pinned under the repository's locked-dependency policy when the skeleton is scaffolded. G1 selects the architecture family; G4 selects the final Windows bundle/update/signing configuration.
