# DB-G9 installation proof

Accepted source: `1903298c897e3aadb2ed89fbbd9309e24d68005a`

The dedicated Windows proof establishes:
- silent/default current-user NSIS installation succeeds;
- uninstall registration exists in HKCU and no corresponding HKLM product registration exists;
- installed executable is under LocalAppData;
- required Start Menu shortcut exists;
- no MIQOS auto-start entry exists;
- no MIQOS Windows service is installed;
- no MIQOS firewall rule is installed;
- no authorised protocol/file-association class is added;
- no MIQO machine-wide environment variable is added.

All checks are recorded PASS in `db-g9-windows-lifecycle.json` inside artifact `10779608930`.
