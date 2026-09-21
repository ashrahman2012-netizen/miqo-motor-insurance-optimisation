# Blocker Register

## Active blockers

None for G3 closure.

## Known external dependencies — not currently blocking

### D-G3-IDP-001 — Identity-provider registration

**Need:** A real environment will require an OIDC native/public-client registration, issuer/tenant configuration, loopback redirect registration, MIQOS API audience/scopes and group/role assignment.

**Current state:** Not required to freeze the provider-neutral G3 architecture.

**Checkpoint when required:** `UI-IDP`.

**Resume rule:** Start from the exact environment-registration/authentication proof step; do not repeat G0-G3.

## Resolved blockers

### B-G0-001 — GitHub repository integration access

**Previous condition:** Repository integration had returned `403 — Resource not accessible by integration`.  
**G0 result:** RESOLVED. Repository is visible to the installed GitHub integration and reports push/admin-level repository permissions.  
**Impact:** Branch creation and repository reads are available.  
**Rework required:** None.
