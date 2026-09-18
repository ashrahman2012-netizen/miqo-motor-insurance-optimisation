# @miqo/scenarios

Sprint 2 domain boundary for approved optimisation preferences and deterministic O-only scenario generation.

The optimiser may read factual profile inputs, but it can write only the approved O-class controls:

- `voluntary_excess`
- `payment_structure`
- `policy_start_date`
- `telematics_preference`
- `genuine_named_driver_inclusion`

Every generated scenario retains its locked risk-profile version, source preference, generation version and timestamp.
