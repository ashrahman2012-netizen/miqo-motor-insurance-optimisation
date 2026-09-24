# MIQOS-DESKTOP-BUILD-001 — Execution status

**Date:** 2026-09-24  
**Gateway:** DB-G9 — Installed Windows Application & Package Lifecycle Proof  
**Status:** PASS  
**Branch:** `miqos/desktop-build-001`  
**DB-G9 programme entry:** `c1fb5ad5349186030e10140deb5fd04ce7916f80`  
**Accepted executable predecessor (DB-G8):** `7e11769cf78c0d3e70082226d231316cee1b765c`  
**Accepted DB-G9 executable source:** `1903298c897e3aadb2ed89fbbd9309e24d68005a`

DB-G0 through DB-G9 are PASS.

DB-G9 executed the frozen Windows package lifecycle against the TEST/SYNTHETIC Desktop build and produced dedicated exact-source lifecycle evidence.

Accepted proof: current-user x64 NSIS install under LocalAppData; Start Menu registration; no machine registration, auto-start, service, firewall rule, protocol association or machine environment mutation; no hidden Node/npm/Rust/Cargo/PostgreSQL/Git/Visual Studio runtime dependency; no local authoritative MIQOS datastore or production secret/private-key material; installed native OIDC PKCE sign-in; SYNTHETIC/liveProviders=false attestation; representative protected Admin read; 0.1.0→0.1.1 upgrade; downgrade rejected with exit code 1638; uninstall cleanup PASS.

The package is accurately recorded as **NotSigned**. Production Authenticode signing remains dependent on `D-G4-SIGN-001 / UI-SIGN`.

Exact accepted-source proof:
- push CI #794 / `35926095203` — SUCCESS;
- PR CI #795 / `35926101126` — SUCCESS;
- Desktop G7 #272 / `35926101193` — SUCCESS;
- Desktop G8 #92 / `35926101143` — SUCCESS;
- dedicated DB-G9 push #4 / `35926095214` — SUCCESS;
- dedicated DB-G9 PR #5 / `35926101156` — SUCCESS.

Next controlled gateway: **DB-G10 — Accessibility, Security & Cross-Stack Hardening**.

DB-G10 and DB-G11 remain NOT STARTED. No DB-G9 PASS authorises production signing, release publication, deployment, real IdP activation, non-synthetic operation or provider activation.
