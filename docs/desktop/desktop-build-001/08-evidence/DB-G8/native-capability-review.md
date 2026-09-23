# DB-G8 native capability review

**Capability:** `apps/admin-desktop/src-tauri/capabilities/admin-read.json`  
**Accepted source:** `7e11769cf78c0d3e70082226d231316cee1b765c`

The active main-window capability contains exactly eleven permissions:

1. `allow-get-runtime-profile`
2. `allow-logout`
3. `allow-begin-authentication`
4. `allow-get-auth-session`
5. `allow-get-health`
6. `allow-load-admin-profile`
7. `allow-load-admin-profile-version`
8. `allow-load-admin-profile-audit`
9. `allow-load-admin-selection-trace`
10. `allow-get-diagnostics`
11. `allow-create-support-snapshot`

The Rust host exposes the matching eleven commands:

`get_runtime_profile`, `logout`, `begin_authentication`, `get_auth_session`, `get_health`, `load_admin_profile`, `load_admin_profile_version`, `load_admin_profile_audit`, `load_admin_selection_trace`, `get_diagnostics`, `create_support_snapshot`.

## Review result

- no stale provider/certification command;
- no generic HTTP-plugin permission;
- no shell permission;
- no broad filesystem permission;
- no direct database dependency;
- no provider activation command;
- no business mutation command;
- no additional DB-G8 permission required.

Existing G8 installed proof checks the exact command permission set and direct-database/runtime exclusions.

**Result: PASS — least-privilege capability set reconciled to actual implemented functions.**
