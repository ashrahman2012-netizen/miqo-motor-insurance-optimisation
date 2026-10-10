# BV5-01 — Actual Sprint 4 source-to-Balanced-Value contract gap assessment

**Date:** 2026-10-10
**Status:** Mapping assessment completed; adapter cannot safely emit an eligible Balanced Value quote without additional evidence.
**Source branch:** `miqo/bv-gate-005-integration-design`
**Frozen baseline:** `3b6351a32f279bf1429c79d0447c764d32ce2eae` (85/85 BV synthetic tests and 4/4 repository CI GREEN).

## Current verified source boundaries

- `packages/normalisation/src/index.ts` `normaliseMockProviderPayload` provides annual cash premium, finance cost set to **zero**, compulsory and voluntary excess, only a **COMPREHENSIVE coverage marker**, comparison state and fingerprint.
- `apps/api/src/sprint4-market-route-service.ts` and `packages/db/src/sp4-schema.ts` provide synthetic provider/market route provenance, quote and scenario lineage, catalogue and mapping versions.
- The `packages/balanced-value` contract additionally requires confirmed cover benefits, restrictions, fees/IPT completeness, actual finance repayment schedule/APR where relevant, quotation rights, issued/expiry evidence, customer-intent revision and verified locked-profile facts hash.
- The strict BV5 synthetic readiness gate currently accepts **caller-supplied evidence booleans**, not a verified automated mapping from database records. Do **not** treat true flags as proof from the source of record.

## Field-level decision matrix

| Desired target field | Present in current source? | Safe mapping / action |
|---|---|---|
| Stable quote ID, scenario ID, route lineage | Yes in Sprint 4 records | Map with immutable source identifiers and fingerprint checks |
| Annual cash premium | Yes (synthetic mock) | Map verified integer pence as **annual cash**, not financed total |
| Compulsory and voluntary excess | Yes | Add only as contingent total excess; no expected-loss pricing |
| Comprehensive cover indicator | Marker only | Cannot infer full benefit and restriction parity |
| Individual benefit entitlements / endorsements | No complete normalized set | Reject; do not invent false/true coverage attributes |
| Cover restrictions and deductibles by benefit | Not proven | Reject and request mapping contract |
| Mandatory fees and Insurance Premium Tax completeness | Not independently proven | Reject; cannot set `mandatory_fees_ipt_included=true` automatically |
| Monthly total, deposit, instalments and APR | Not complete | Reject monthly comparison; never infer from zero mock finance cost |
| Issued-at and valid-until quote times | Not established for all normalised quotes | Reject missing/stale; never assume current |
| Partner quotation/display and retention rights | Not established | Reject as external production offer; synthetic permission only for generated fixtures |
| Locked profile facts/content hash | Existing risk profile lineage exists, but adapter equivalence not yet proven | Add explicit profile verification and hash join |
| Named driver genuineness and main-driver separation | Factual validation available conceptually | Require join and validated customer selections |
| Customer preference revision/confirmation | Separate BV contract | Confirm separately before selection |
| Provider neutral ordering | Tested in BV3/BV4 | Preserve exact tie-break and avoid commercial influence |

## Safest BV5-01 correction packet

1. Implement a **pure, non-routable adapter** that accepts the existing synthetic normaliser shape plus explicitly supplied verified contract evidence; fields absent from source must remain missing and yield `ADAPTER_INCOMPLETE`, never a fabricated valid BV quote.
2. Add deterministic reason codes per missing source datum and tests for every gap above. Compare against a fully specified synthetic enrichment fixture ONLY; do not claim the actual existing normaliser contains those properties.
3. Prove an enriched fixture can pass BV4 selection in the non-routable synthetic harness; prove raw Sprint 4 normaliser output alone cannot.
4. Run the complete 85 existing tests plus adapter negative/positive tests and original repository four-job CI on one final immutable HEAD.
5. The build remains design/staging-only; do not modify API route registration, DB migrations, objective executability, live provider adapters, SEOPA or public UI.
6. Open a separate promotion/activation gate after FCA and partner rights blockers are resolved.

**Decision:** BV-GATE-005 design CI **PASS**, but source mapping and internal integration acceptance **NOT YET COMPLETE**. No product activation approval.
