# Desktop Native Platform — DB-G3

**Status:** IN PROGRESS — executable hardening committed; CI/Windows proof pending.

DB-G3 hardens the inherited Tauri proof into the reusable current-package platform boundary while preserving TEST/SYNTHETIC.

Implemented in the DB-G3 source revision:

- typed private native read operations instead of caller-supplied path strings;
- exact TEST/SYNTHETIC deployment-profile validation;
- rejection of configuration origin/identity drift and unknown feature flags;
- strict profile-ID route parameter validation;
- fixed GET semantics, redirect denial and 2 MiB response ceiling retained;
- explicit `admin-read` Tauri capability identifier with only three approved commands;
- renderer environment display fails closed when runtime identity is unavailable;
- Rust negative tests for environment/origin/identity/feature/route injection controls.

No new API endpoint, native command, dependency, lockfile, workflow, database, authentication authority, real environment or provider capability is introduced.

See [native platform contract](native-platform-contract.md). Final PASS requires repository CI plus Windows G7/G8 regression evidence.
