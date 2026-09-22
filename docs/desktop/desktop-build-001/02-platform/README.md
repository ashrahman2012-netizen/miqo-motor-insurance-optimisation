# Desktop Application Foundation — DB-G2

**Status:** IN PROGRESS — source implementation committed; executable validation pending.

DB-G2 converts the installed G8 proof shell into the real MIQOS Windows Admin application foundation while preserving the certified native/API/security/environment boundary.

Authorised source scope:

- `apps/admin-desktop/src/**`
- `apps/admin-desktop/test/**`
- DB-G2 BUILD control/evidence documentation.

DB-G2 does **not** add Tauri commands, API endpoints, dependencies, shared-package changes, database access, Admin mutation or production identity/environment capability.

Implemented foundation target:

- canonical Admin navigation;
- in-app history routing over packaged local content;
- TEST/SYNTHETIC runtime/environment identity;
- local-only command/navigation affordance;
- Dashboard foundation with inherited representative G8 safe-read proof;
- System safe diagnostics foundation;
- explicit READ-ONLY / TRACE-DERIVED / RESERVED / deferred route states;
- removal of proof-only application entry naming.

Deep case/audit/trace evidence views remain DB-G4/DB-G5.
