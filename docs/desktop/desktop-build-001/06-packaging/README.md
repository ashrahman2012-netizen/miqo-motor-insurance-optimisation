# Windows package lifecycle

**Gateway:** DB-G9 — Installed Windows Application & Package Lifecycle Proof  
**Status:** AUTHORISED / NOT STARTED  
**Programme entry:** `c1fb5ad5349186030e10140deb5fd04ce7916f80`  
**Accepted executable predecessor:** `7e11769cf78c0d3e70082226d231316cee1b765c`

DB-G9 executes the frozen PREP Windows package contracts against the current BUILD application. The existing G8 installed proof is useful substrate but is not, by itself, DB-G9 acceptance evidence.

Controlling contracts remain:
- PREP `04-packaging/ADR-003-nsis-evergreen-user-scope.md`;
- `install-update-uninstall.md`;
- `packaging-proof-contract.md`;
- `runtime-prerequisites.md`;
- `signing-readiness.md`;
- G7 Windows runner/release-pipeline controls.

DB-G9 proves package mechanics only. An unsigned or policy-approved test-signed package is acceptable. Production Authenticode completion remains dependent on UI-SIGN and downstream release governance.
