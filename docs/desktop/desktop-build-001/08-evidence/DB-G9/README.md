# DB-G9 evidence — Installed Windows Application & Package Lifecycle Proof

**Status:** PASS  
**Programme entry:** `c1fb5ad5349186030e10140deb5fd04ce7916f80`  
**Accepted executable source:** `1903298c897e3aadb2ed89fbbd9309e24d68005a`

Evidence set:
- [Package provenance](package-provenance.md)
- [Installation proof](install-proof.md)
- [Runtime prerequisites and package inspection](runtime-prerequisites-and-inspection.md)
- [Installed application proof](installed-app-proof.md)
- [Upgrade / downgrade proof](upgrade-downgrade-proof.md)
- [Uninstall proof](uninstall-proof.md)
- [Acceptance](acceptance.md)
- [Controller execution block](controller-execution-block.md)

Dedicated exact-source workflow proof:
- DB-G9 push #4 / run `35926095214`, job `107401698281`, artifact `10779608930`, artifact digest `sha256:30e2eec17cda3f44667e464dee7880a96edfbfe13edb954c9ccfedfb16cf5f89`;
- DB-G9 PR #5 / run `35926101156`, job `107401730777`, artifact `10779643441`, artifact digest `sha256:9b012c3825d799e842b3bbfd5af703f11939d15d961933fafc04e51bcda18df4`.

Production Authenticode signing, release publication and deployment are outside this PASS.
