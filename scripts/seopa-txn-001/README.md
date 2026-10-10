# MIQOS-SEOPA-TXN-001 — Synthetic Adapter & Contract UAT

**Scope:** synthetic-only, internal MIQOS mock adapter; **no SEOPA credentials, no partner API, no insurer pricing, no production data, no binding, no payments, no merge authority**.

**Baseline:** branch originally cut from main at 245edbe261d3a1b66d07bd4edf618db98945a566 (DB-G11 promoted source). Modifies only scripts/seopa-txn-001 and its isolated UAT GitHub workflow. Existing Sprint 4 implementation and normalisation/comparison business logic remain unmodified.

## Run

Node 22.16.0, npm 10.9.2; no npm install/network required for this isolated harness:

    node --experimental-strip-types --test scripts/seopa-txn-001/test.mjs
    node --experimental-strip-types scripts/seopa-txn-001/run.mjs

Outputs T01-T08 and evidence JSON in scripts/seopa-txn-001/artifacts/ (ignored). The GitHub Actions workflow uploads a synthetic receipt bundle.

## Contract boundaries

1. T01 CustomerProfile contains non-identifying demonstration data only.
2. T02 LockedRiskProfile hashes canonical facts (includes genuine named driver candidate ND-001; the earlier ZIP omitted that candidate from the locked profile).
3. T03 generates exactly eight permitted O-class scenarios. The approved O-class names are imported from the existing MIQOS Sprint 2/Sprint 4 model.
4. T04 generates eight proposed partner envelopes containing the unchanged facts and scenario choices. These are **NOT** SEOPA request schemas.
5. T05 returns ten deterministic quote fixtures under eight envelopes, all labelled MOCK. It has no network I/O.
6. T06 maps mocks to the repository's existing synthetic normaliser and comparison semantics. Monthly S3 remains NOT_COMPARABLE for cash-premium ranking without full instalment/cash figures.
7. T07 uses MIQOS compareNormalisedQuotes to verify cheapest price and a **separate UAT-only BALANCED_VALUE algorithm** to return S7 Alpha at GBP 612 / GBP 550 total excess. The existing Sprint 4 BALANCED_COST_AND_EXPOSURE production rule is still dormant; this harness must not be misrepresented as activating it.
8. T08 verifies the selection, frozen profile, price/excess consistency, then explicitly blocks the provider/purchase handoff.

Quotes have coverage details unknown: ranking is always PROVISIONAL_MOCK_RECOMMENDATION, not an assertion that real insurance products are equivalent. The synthetic test clock is frozen at 2026-10-10T09:15:00+01:00 to test time-bound quotes; it is not the real current time.

## UAT pass gates

- Eight scenario requests and eight partner mock-response envelopes.
- Ten normalised provider-alias quote fixtures.
- All factual hashes equal, zero factual mutations, all named driver IDs in locked facts.
- Annual cash comparison excludes monthly S3 where cash/APR data are unavailable.
- S0 GBP 812, S6 GBP 571 with GBP 850 total excess, S7 GBP 612 with GBP 550 excess; S7 selection provisional.
- Adversarial suite rejects changed facts, unapproved O-class keys, unknown or duplicate named drivers, live mode, lineage mismatch, response duplication, expiration, excess/payment conflicts, bad telematics, missing mandatory charges, forged deep links, and swapped selection.
- Partner transfer and live policy binding remain blocked.

## Certification limits

Passing these tests proves the isolated adapter and reuse of selected existing MIQOS primitives. It **does not** prove PostgreSQL service integration, actual SEOPA API mapping, partner authentication/retention rights, MIQOS user-interface integration, FCA roles or insurer quote capability. The repository's existing CI and target-stack checks must be evaluated separately before considering any promotion. Do not merge to any certified branch without separate explicit approval.

## Open SEOPA technical gates

Official API/session schema; hosted vs headless route; typed response access; repeated-scenario permission; quote provenance and expiration; full excess/add-on/finance terms; independent ranking and retention/display rights; authenticated purchase handoff and attribution; data-controller/FCA responsibility agreements.
