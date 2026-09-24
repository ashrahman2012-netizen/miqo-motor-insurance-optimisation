# DB-G9 installed application proof

Accepted source: `1903298c897e3aadb2ed89fbbd9309e24d68005a`

The installed executable, not a build-tree binary, is launched and exercised.

Proof establishes:
- product window identity `MIQOS Admin [TEST]`;
- baseline executable version `0.1.0`;
- native OIDC Authorization Code + PKCE authentication PASS;
- bearer material absent from renderer-facing proof/log evidence;
- SYNTHETIC environment rendered/attested;
- `liveProviders=false` boundary retained;
- representative protected Admin audit read PASS;
- structured operational logging PASS;
- production signing/release authority remains false.

Dedicated DB-G9 push job `107401698281` records `DESKTOP_DB_G9_WINDOWS_LIFECYCLE_PASS`.
