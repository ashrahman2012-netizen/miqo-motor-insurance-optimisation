# Windows package lifecycle

**Gateway:** DB-G9 — Installed Windows Application & Package Lifecycle Proof  
**Status:** PASS  
**Programme entry:** `c1fb5ad5349186030e10140deb5fd04ce7916f80`  
**Accepted executable predecessor:** `7e11769cf78c0d3e70082226d231316cee1b765c`  
**Accepted DB-G9 executable source:** `1903298c897e3aadb2ed89fbbd9309e24d68005a`

## Accepted package

- product: `MIQOS Admin [TEST]`;
- version: `0.1.0`;
- installer: `miqos-admin_0.1.0_windows-x64_nsis.exe`;
- bytes: `3778375`;
- SHA-256: `ad37a064b7258985ae8c6e8d3b446d90f61bbb3cbf6612e1a1420a9c32a15d98`;
- x64 NSIS, current-user install;
- signature state: `NotSigned`;
- deployment profile SHA-256: `e3b2ff24e1646515ea1ad3447e91e17f35d9b6b4a92242fe34d674418dbf706d`;
- WebView2 observed: `152.0.4191.66`.

Lifecycle: install PASS; installed OIDC PKCE + protected Admin read PASS; package/runtime inspection PASS; upgrade 0.1.0→0.1.1 PASS; downgrade rejected exit 1638; uninstall PASS.

Production signing is not certified by DB-G9. `D-G4-SIGN-001 / UI-SIGN` remains OPEN.
