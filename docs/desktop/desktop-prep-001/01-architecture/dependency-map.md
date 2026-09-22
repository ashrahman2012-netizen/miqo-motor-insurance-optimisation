# Desktop Dependency Map

## Approved direction

```text
apps/admin-desktop
  ├─ @miqo/ui
  ├─ @miqo/application-contracts
  ├─ @miqo/application-adapters
  ├─ React
  └─ Tauri frontend API (only approved native capabilities)

apps/admin-desktop/src-tauri
  └─ Tauri/Rust crates required for the approved host/capabilities

apps/admin-desktop
  ── HTTPS ──► apps/api runtime

apps/api
  ├─ @miqo/db
  ├─ @miqo/domain
  ├─ @miqo/risk-profile
  └─ authoritative service packages
```

## Forbidden direction

```text
admin-desktop ─X─► @miqo/db
admin-desktop ─X─► PostgreSQL
admin-desktop ─X─► provider adapter internals
admin-desktop ─X─► server domain packages for local re-evaluation
@miqo/ui      ─X─► Tauri API
@miqo/ui      ─X─► network clients
application-adapters ─X─► Tauri / React / network
```

## Rationale

Shared presentation and adapter packages remain portable because native/Desktop APIs stay app-local. This prevents the Desktop programme from contaminating reusable packages with host privileges.
