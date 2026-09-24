# DB-G9 acceptance — Installed Windows Application & Package Lifecycle Proof

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G9 — Installed Windows Application & Package Lifecycle Proof  
**Result:** PASS  
**Closeout date:** 2026-09-24  
**Programme entry:** `c1fb5ad5349186030e10140deb5fd04ce7916f80`  
**Accepted executable predecessor (DB-G8):** `7e11769cf78c0d3e70082226d231316cee1b765c`  
**Accepted DB-G9 executable source:** `1903298c897e3aadb2ed89fbbd9309e24d68005a`

## Executable delta

DB-G9 executable changes are limited to:
- `.github/workflows/desktop-build-g9.yml`;
- `apps/admin-desktop/test/package-contract.test.ts`;
- `scripts/desktop-g8-proof.ps1`;
- `scripts/desktop-g9-proof.ps1`.

No API, domain, database, identity, deployment-profile, dependency, lockfile or Admin business-capability source changed.

## Package identity and provenance

- package: `MIQOS Admin [TEST]` `0.1.0`;
- installer: `miqos-admin_0.1.0_windows-x64_nsis.exe`;
- size: 3,778,375 bytes;
- SHA-256: `ad37a064b7258985ae8c6e8d3b446d90f61bbb3cbf6612e1a1420a9c32a15d98`;
- x64 NSIS;
- install scope: current user;
- signature state: `NotSigned`;
- WebView2 observed: `152.0.4191.66`.

## Installed lifecycle result

| Criterion | Result |
|---|---|
| Current-user install under LocalAppData | PASS |
| Machine product registration absent | PASS |
| Start Menu shortcut created | PASS |
| Auto-start absent | PASS |
| Windows service absent | PASS |
| Firewall rule absent | PASS |
| Protocol/file association absent | PASS |
| Machine environment mutation absent | PASS |
| Hidden developer/runtime dependencies absent | PASS |
| Production secret/private-key material absent | PASS |
| Local authoritative datastore absent | PASS |
| Installed launch | PASS |
| Native OIDC PKCE sign-in | PASS |
| SYNTHETIC/liveProviders=false boundary | PASS |
| Protected representative Admin read | PASS |
| Upgrade 0.1.0 → 0.1.1 | PASS |
| Downgrade rejection | PASS, exit 1638 |
| Uninstall | PASS |

## Exact-source workflow proof

Accepted executable source `1903298c897e3aadb2ed89fbbd9309e24d68005a` is green under:
- push CI #794 / run `35926095203` — SUCCESS;
- PR CI #795 / run `35926101126` — SUCCESS;
- Desktop G7 #272 / run `35926101193` — SUCCESS;
- Desktop G8 #92 / run `35926101143` — SUCCESS;
- dedicated DB-G9 push #4 / run `35926095214`, job `107401698281` — SUCCESS;
- dedicated DB-G9 PR #5 / run `35926101156`, job `107401730777` — SUCCESS.

Dedicated push artifact:
- ID `10779608930`;
- digest `sha256:30e2eec17cda3f44667e464dee7880a96edfbfe13edb954c9ccfedfb16cf5f89`;
- contains `db-g9-windows-lifecycle.json`, strengthened G8 proof JSON, build manifest, checksum and Cargo.lock.

The PR workflow uses synthetic merge SHA `80ce1c3b4dcea94e41b6f2e4274b8803c3e57250`, paired with exact branch head `1903298c897e3aadb2ed89fbbd9309e24d68005a`.

## Signing and release boundary

The tested package is **NotSigned**. This is acceptable for DB-G9 TEST lifecycle proof.

Still open:
- `D-G4-SIGN-001 / UI-SIGN` — organisation-controlled production Authenticode identity;
- real IdP registration;
- non-synthetic environment authority;
- provider activation;
- release publication/deployment.

No production signing or release authority is inferred.

## Exit

**DB-G9 = PASS.**

Next controlled gateway: **DB-G10 — Accessibility, Security & Cross-Stack Hardening**.

DB-G10 remains NOT STARTED until separately authorised.
