# BV-GATE-003 — Proposed specification and synthetic UAT

**Authority:** spec + isolated synthetic reference proof only. Product execution, merging, SEOPA connections and customer-facing release **NOT AUTHORISED**.

- Formal specification: [MIQO-BV-SPEC-001 v1.0](../../docs/specifications/MIQO-BV-SPEC-001-v1.0.md)
- Proposed Draft 2020-12 JSON Schema: [contract.schema.json](../../contracts/balanced-value/contract.schema.json)
- Reference evaluator: [reference.mjs](reference.mjs)
- Deterministic synthetic fixture: [fixtures.mjs](fixtures.mjs)
- Negative / acceptance test suite: [test.mjs](test.mjs)
- Gate issue: [#37](https://github.com/ashrahman2012-netizen/miqo-motor-insurance-optimisation/issues/37)

Pinned environment Node v22.16.0, npm 10.9.2. The reference imports Ajv/ajv-formats already present in the locked dependency graph to assert the proposed JSON Schema. They are **not being added as direct production dependencies** by this spec-only gate; a later product implementation would need its own exact dependency/lockfile design.

From the repository root:

    npm ci
    MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_LIVE_PROVIDERS_ENABLED=false node --experimental-strip-types --test scripts/bv-gate-003/test.mjs
    MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_LIVE_PROVIDERS_ENABLED=false node --experimental-strip-types scripts/bv-gate-003/run.mjs

The dedicated GitHub workflow executes the test + export and uploads three JSON evidence receipts. Running \`ci\` on the same HEAD is independent and mandatory for gate closure.

Unlike the earlier TXN-001 partner **adapter** fixture (which correctly represented coverage as incomplete), these fixtures deliberately construct **complete *synthetic* coverage parity markers**. They prove eligibility logic under assumed synthetic terms but **do not validate real provider benefit completeness or partner permission**.

Expected sample: eight mock scenarios / ten offers; customer states £600 max excess and comprehensive like-for-like cover; S6 absolute cheapest £571 / £850 excess; S7 mock provider Alpha constrained-selected £612 / £550 excess, £41 more premium and £300 less excess. This is a conditional trade-off, not a universal optimal offer.

Prohibited: editing the Sprint 4 dormant objective flag, changing legacy comparison or optimisation code, database migration, creating a real partner quote, policy binding, collecting customer data, API credentials, merges or deployments.

**Required next gate:** review of product suitability, actual insurer cover comparability, FCA/legal role, independent display/ranking permissions and deterministic algorithm before BV-GATE-004 or any activation request.
