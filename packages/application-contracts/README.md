# @miqo/application-contracts

Type-only application-facing contracts between MIQOS APIs/application adapters and the customer/admin presentation layers.

## APP-PREP P4 boundary

This package contains **ViewModel contracts and synthetic contract fixtures**. It does not fetch APIs, access persistence, calculate rankings, determine eligibility, evaluate integrity or authorise provider/environment actions.

Use these contracts from UI/application code with `import type` until BUILD establishes the final adapter implementation.

The mapping authority is documented under `docs/application/app-prep-001/04-contracts/`.
