# MIQOS EH3 — Provider-Integration Seam Hardening

## Boundary

EH3 is provider-neutral and synthetic-only. It does not activate SEOPA, Quotezone,
or any live insurance provider.

The seam is:

Locked truthful RiskProfileVersion + approved optimisation deltas
→ ProviderExecutionRequest
→ ProviderRegistry
→ ProviderAdapter
→ ProviderExecutionResult
→ existing immutable raw-response persistence
→ existing quote normalisation.

## Invariants

- Change choices, not facts.
- Provider adapters cannot mutate RiskProfileVersion or write to the database.
- Unknown providers, unsupported channels, adapter-version mismatch and live adapters fail closed.
- NO_QUOTE, TIMEOUT, UNAVAILABLE and ERROR are distinct from RESPONSE.
- Only RESPONSE is eligible for raw-provider-response capture.
- Credentials are not part of the EH3 contract or persisted data model.
- No live-provider endpoint, schema or authentication assumption is introduced.
- Provider payloads do not flow directly into optimisation logic.

## Future INT1

A future SEOPA/Quotezone adapter may implement ProviderAdapter only after confirmed
provider documentation establishes authentication, schemas, sandbox rules, errors,
rate limits, certification and regulatory/display obligations.
