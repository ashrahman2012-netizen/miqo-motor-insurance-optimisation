# DB-G9 upgrade and downgrade proof

Accepted source: `1903298c897e3aadb2ed89fbbd9309e24d68005a`

Controlled lifecycle:
1. install baseline `0.1.0`;
2. build/install evidence-only higher semantic version `0.1.1`;
3. confirm installed executable version changes to `0.1.1`;
4. confirm approved local log ownership survives;
5. attempt baseline `0.1.0` installer over `0.1.1`;
6. verify the higher version remains installed.

Results:
- upgrade: **PASS**;
- baseline executable version: `0.1.0`;
- upgraded executable version: `0.1.1`;
- downgrade attempt exit code: `1638`;
- downgrade rejected: **PASS**.

The ephemeral evidence-only version mutation is restored by the proof harness and is not committed as application state.
