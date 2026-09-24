# DESKTOP-G2 — Installer Packaging, Clean-Machine Execution & Platform Certification

**Branch:** `miqo/desktop-g2`  
**Certified entry:** DESKTOP-G1 SHA `590aaf62da5148ecb3a255d1894ad19f0594ae14`  
**Tracker:** issue #12  
**Primary target:** Windows x64 / MSVC  
**Installer:** unsigned NSIS, current-user install  
**Environment:** SYNTHETIC only

## Objective

Convert the certified G1 distributable runtime into a genuinely installable Windows desktop application and prove installation, execution, persistence, restart, synthetic admin diagnostics, shutdown, uninstall/reinstall behaviour and artifact integrity on a Windows CI host.

## Installer architecture

- Tauri 2 NSIS bundle.
- Current-user install; MIQO installer does not require administrator privileges.
- Tauri pinned CLI default for the Windows MSVC static C runtime remains in force; Node remains the official packaged Node Windows binary.
- WebView2 bootstrapper embedded and invoked silently if required.
- Code signing deliberately absent in this gateway.
- G1 packaged Node/Next/Fastify/PGlite runtime included as Tauri resources.

## Data-retention policy

Uninstall removes installed application binaries and installer registration but preserves the application-local PGlite data directory by default.

Rationale: profile/audit data must not be silently destroyed by uninstall. Explicit destructive data deletion requires a separately designed user-controlled capability.

G2 must prove that reinstall reconnects to the retained database and can read a previously locked synthetic profile.

## Controlled order

1. G2.0 Windows installer architecture/policy.
2. G2.1 production NSIS bundle generation.
3. G2.2 packaged runtime/resource inventory.
4. G2.3 clean-machine dependency-independence install proof.
5. G2.4 first-run PGlite creation/migrations and customer journey.
6. G2.5 restart persistence and synthetic admin diagnostics.
7. G2.6 uninstall/reinstall retention proof.
8. G2.7 installer/runtime security inspection and SHA-256 inventory.
9. G2.8 dedicated Windows + inherited CI certification.
10. G2.9 immutable-head closure.

## Clean-machine proof definition

The installed MIQO process is launched with a PATH that excludes development toolchains and substitutes failing poison commands for Node, npm, npx, Docker, psql, PostgreSQL and pg_ctl.

The application must nevertheless start its packaged runtime and pass. Test tooling may use CI-host Node outside the application process to drive browser assertions; that does not constitute an installed-runtime dependency.

## Security inspection

G2 records:

- unsigned Authenticode state, expected because signing is prohibited;
- installer/app/runtime SHA-256 hashes and sizes;
- packaged Node version;
- loopback-only listeners on ports 3000/3001/4000;
- absence of non-loopback established connections from packaged MIQO Node service processes during proof;
- synthetic-only API health and PGlite backend;
- absence of host dependency poison-command invocation.

## Non-goals / hard boundaries

Not authorised:
- merge to `main`;
- public release/deployment;
- code signing/notarisation;
- auto-update;
- real IdP/RBAC;
- real customer/provider data or credentials;
- live insurer/provider activation;
- production infrastructure mutation.

A PASS certifies an unsigned synthetic Windows x64 installer only.
