# SIM-G3-R1-SYN005-C1–C4 Controlled Correction

**Classification:** isolated synthetic corrective branch; not a SIM-005 certification replacement.

## Frozen evidence and source
- Base HEAD: `5488d29735983d1c2a7f09f283e7adb0a2fe138a`.
- Original G3 archive SHA-256: `8d1c56e9bf0bb49efa5e1b65b32892ffefaed57520aae925327e649a0004c230` (verified user-upload copy).
- SYN-005 original status: **UNRESOLVED** and historical BLOCKING integrity signal preserved.
- Original 47/47 R1 laboratory status: unchanged; these tests are a separate additional regression pack.

## Authorized change scope
C1 application-layer catalogue alignment and candidate eligibility check; C2 forward-only migration 0014 replacing the quote-request trigger body while preserving migrations 0004 and 0011; C3 isolated PostgreSQL regression tests; C4 separate receipts and decision gate.

## Destructive test isolation
The new test file **TRUNCATEs synthetic tables** and refuses non-local or non-synthetic DB URLs. Run **only in a fresh, disposable local/CI PostgreSQL instance**, never the original G3, production, or shared development database.

## Independent test run (not proof until receipts recorded)
Use pinned Node `v22.16.0`, npm `10.9.2` and PostgreSQL 16:
1. Configure `DATABASE_URL=postgresql://miqo:miqo@127.0.0.1:5432/miqo` to point to a **fresh disposable local** DB.
2. Set `MIQO_DATA_CLASSIFICATION=SYNTHETIC` and `MIQO_LIVE_PROVIDERS_ENABLED=false`.
3. Run `npm ci`, `npm run db:migrate`, then `node --experimental-strip-types --test --test-concurrency=1 apps/api/test/sprint4-candidate-prequote-postgres.test.ts`.
4. Capture Node/DB versions, migration output, `pg_get_functiondef('miqo_guard_quote_request_lineage()'::regprocedure)`, all test TAP results, fixture snapshot SHA and row counts.
5. Execute full existing `ci`, target-stack, postgres-contract and security gates on **the same corrective HEAD** before proposing a merge.

## Acceptance
- 24 accepted SYN-005-equivalent scenarios x 2 synthetic routes = **48 expected**, not a verified result until tested.
- Existing `CURRENT_VEHICLE` disallow, original F-field constraints, generation lineage, candidate registry and immutable historical signals retained.
- `candidate_vehicle` eligibility checked independently by both app and SQL; stale five-field pre-quote whitelist no longer blocks approved candidate choices.
- Mock premium does not depend on EV versus petrol; **no real insurer quotation or pricing validation**.
- No production merge, no retroactive SIM-005 certification change and no live PCW calls.

## Receipt status
Correction branch code is a proposed corrective candidate until complete CI and independent PostgreSQL evidence. Record actual results and correction commit SHA in the subsequent evidence receipt; never rewrite frozen archives.
