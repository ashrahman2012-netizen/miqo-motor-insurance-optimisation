# MIQOS-APP-BUILD-001 / BUILD-001C — Profile Capture, Validation, Discrepancy, Review & Lock

**Visual authority:** supplied `MIQOS - Profile Review & Lock - Demo Page 2.png` for information hierarchy and dark MIQOS visual treatment.  
**Behaviour authority:** existing certified profile service, immutable locked versions, correction/versioning contract, validation audit and P4 ViewModels.

| Gate | Acceptance condition |
|---|---|
| AB-PROFILE-G0 | BUILD-001A/B baselines remain green |
| AB-PROFILE-G1 | Canonical customer profile routes exist for capture, validation, discrepancies, review and lock |
| AB-PROFILE-G2 | Factual inputs write only through the existing profile facts API and are read-only after lock |
| AB-PROFILE-G3 | Validation is explicit and persisted; page render does not silently POST validation |
| AB-PROFILE-G4 | Persisted discrepancies are visible; blocking evidence disables UI lock until moved through supported correction/version flow |
| AB-PROFILE-G5 | Corrections create a new DRAFT version; no locked version is mutated |
| AB-PROFILE-G6 | Lock requires explicit customer confirmation and calls the existing transactional lock endpoint |
| AB-PROFILE-G7 | Version lineage and immutable-history semantics remain visible |
| AB-PROFILE-G8 | Customer profile experience follows dark responsive design and preserves keyboard/label semantics |
| AB-PROFILE-G9 | Target-stack E2E proves capture → validation → review → lock and locked correction → v2 draft |
| AB-PROFILE-G10 | Adapter tests, existing PostgreSQL/immutability tests, browser tests and production build are green |

## Deliberate scope boundary

BUILD-001C does not invent external-data discrepancy detection or a new discrepancy-resolution domain service. It renders discrepancy records already persisted by the authoritative backend and uses the already-certified factual correction endpoint for locked-profile corrections.

The supplied reference screen contains richer motor-risk fields than the current certified Sprint 1 minimum factual model. BUILD-001C therefore presents only fields currently supported by the authoritative profile service: main driver ID, annual mileage and licence-held-since. Additional insurance facts are not fabricated for visual parity.
