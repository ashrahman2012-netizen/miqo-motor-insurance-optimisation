# Blocker Register

## Active blockers

None for G4 closure.

## Known external dependencies — not currently blocking

### D-G3-IDP-001 — Identity-provider registration

**Need:** Real environment OIDC native/public-client registration, issuer configuration, redirect registration, MIQOS API audience/scopes and group/role assignment.

**Checkpoint:** UI-IDP.

**Resume rule:** Resume at environment registration/authentication proof; do not repeat G0-G4.

### D-G4-SIGN-001 — Production Windows signing identity

**Need:** Organisation-controlled trusted Windows code-signing identity and least-privilege release-pipeline access.

**Current state:** Not required for G4 packaging-design closure or an explicitly non-production G8 mechanical package proof.

**Checkpoint:** UI-SIGN.

**Becomes blocking for:** production signing evidence and G9 certification if production-signed release readiness is in certification scope.

**Security rule:** private signing keys/secrets must not be pasted into chat, committed to Git or placed in ordinary build artefacts.

**Resume rule:** resume at G7 signing integration/verification; do not repeat G0-G4.

## Resolved blockers

### B-G0-001 — GitHub repository integration access

Previous 403 integration condition is resolved. Repository read/write access and branch creation are available.
