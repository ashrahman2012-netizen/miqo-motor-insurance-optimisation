# @miqo/provider-integration

Provider-neutral execution seam for MIQOS quotation providers.

EH3 keeps this package synthetic-only. It owns provider contracts, registration,
capability checks, timeout/error normalization and execution result semantics.

It does not own database persistence, customer-risk mutation, provider credentials,
quote comparison, optimisation, or live-provider transport.
