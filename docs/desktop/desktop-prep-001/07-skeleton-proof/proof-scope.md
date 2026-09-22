# G8 Skeleton Proof — Architecture Scope Defined at G1

**Status:** PASS — WINDOWS INSTALLED DESKTOP SKELETON PROOF COMPLETE

The G8 skeleton must prove ADR-001 rather than grow into feature implementation.

## Minimum proof

1. build `apps/admin-desktop` from the controlled monorepo;
2. start the packaged Tauri application on Windows;
3. render the MIQOS Admin shell using reusable `@miqo/ui` semantics;
4. display application version/build/environment identity;
5. resolve environment through the G5-approved configuration path;
6. connect to the synthetic MIQOS Fastify API through a Desktop application service;
7. load one representative read-only Admin Audit/Trace ViewModel using existing `@miqo/application-adapters`;
8. render success and controlled failure states;
9. demonstrate restrictive Tauri capability configuration and CSP;
10. produce the G4-selected Windows installer;
11. install, launch and uninstall from that package;
12. prove no direct `@miqo/db` or PostgreSQL dependency exists in Desktop.

## Deliberate exclusions

The skeleton does not need to implement:

- full admin navigation/capability set;
- production authentication;
- provider activation;
- quote mutation/binding;
- local database;
- arbitrary filesystem/shell access;
- automatic updater activation.

## Success criterion

The skeleton passes only if the installed Windows application demonstrates:

```text
Tauri host
  + React renderer
  + shared MIQOS contracts/adapters/UI
  + controlled API boundary
  + native privilege isolation
  + reproducible Windows package
```

without altering certified application/domain semantics.


## Execution evidence — complete

Same-head run `35736586909` has proved:

1. controlled monorepo Desktop build — PASS;
2. shared MIQOS UI/contracts/adapters integration — PASS;
3. G5 TEST/SYNTHETIC profile path — PASS;
4. certified Fastify/PostgreSQL application-service integration — PASS;
5. representative read-only Admin Audit ViewModel composition — PASS;
6. restrictive native command/capability/CSP build contract — PASS;
7. Rust fmt/clippy/test — PASS;
8. Tauri release compilation — PASS;
9. NSIS installer generation — PASS;
10. current-user install and installed launch — PASS;
11. controlled API-unavailable and SYNTHETIC retry states — PASS;
12. installed structured logging and development-runtime independence — PASS;
13. 0.1.0 → 0.1.1 upgrade — PASS;
14. downgrade rejection without package replacement — PASS;
15. silent uninstall and proof artefact upload — PASS.

The installed package lifecycle is therefore proved at source `d8eb075b894ead75b00f7a501a2acde032d7a6c3`.
