# DB-G9 uninstall proof

Accepted source: `1903298c897e3aadb2ed89fbbd9309e24d68005a`

The registered NSIS uninstaller is executed silently after upgrade/downgrade proof.

Acceptance checks:
- uninstaller exits successfully;
- HKCU uninstall registration is removed;
- installed executable is removed;
- Start Menu shortcut is removed;
- no service/firewall/protocol/machine-environment side effect remains.

Result: **PASS**.

Uninstall does not target server-side MIQOS data and is not treated as the sole credential/session revocation mechanism.
