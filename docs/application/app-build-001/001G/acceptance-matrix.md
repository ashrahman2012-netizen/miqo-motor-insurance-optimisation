# MIQOS-APP-BUILD-001 / BUILD-001G — Admin Audit & Trace Console

**Visual authority:** MIQOS-DS-001 v1.1 plus the supplied Admin Audit & Trace functional reference.  
**Behaviour authority:** persisted append-only audit events, Sprint 4 selection trace, raw provider response evidence, normalised quotation evidence, RecommendationSet/Explanation lineage and final-integrity records.

| Gate | Acceptance condition |
|---|---|
| AB-AUDIT-G0 | BUILD-001A-F behavioural baselines remain green; MIQOS-DS-001 v1.1 remains the active visual authority |
| AB-AUDIT-G1 | Admin console consumes typed ViewModels over API resources and never binds React directly to database entities |
| AB-AUDIT-G2 | Profile audit history is a read-only projection of append-only persisted events; filtering never mutates evidence |
| AB-AUDIT-G3 | Selection lineage resolves Profile → ProfileVersion → Objective → Scenario → MarketRoute → QuoteRequest → RawProviderResponse → NormalisedQuote → RecommendationSet → Explanation → Selection → FinalIntegrity → Completion |
| AB-AUDIT-G4 | Raw provider response and normalised quote remain visibly separate artefacts with independent IDs/fingerprints |
| AB-AUDIT-G5 | Current artefact panel exposes the exact profile, scenario, exploration, route fingerprint, quote, recommendation, explanation, selection and applicable rule versions |
| AB-AUDIT-G6 | Commercial-independence status is VERIFIED only when persisted explanation evidence contains COMMERCIAL_INPUTS_EXCLUDED |
| AB-AUDIT-G7 | Final-integrity PASS/BLOCKED state is taken only from the persisted authoritative final-integrity result |
| AB-AUDIT-G8 | Environment identity remains explicit in the admin console and no destructive audit action is exposed |
| AB-AUDIT-G9 | Target-stack E2E proves selected-result lineage, audit timeline, raw/normalised separation, evidence-backed governance, discrepancy separation and read-only filtering |
| AB-AUDIT-G10 | Adapter/UI tests, PostgreSQL/API regressions, Playwright and production builds remain green |

## Controlled scope

BUILD-001G provides the canonical `/admin/audit` operational surface. A profile reference loads lifecycle audit history. A selection reference resolves the complete recommendation/selection lineage and derives the profile automatically. Profile-version, recommendation-set, scenario, event-type and date filters operate only on the presentation of already-persisted audit events. A selection reference resolves the complete selection lineage; optional profile-version and recommendation-set references are validated against that authoritative lineage.

The console does not introduce provider activation, certification changes, data correction, audit deletion, recommendation override, quote mutation or customer workflow actions.

## Evidence separation

The console intentionally renders `RawProviderResponse` and `NormalisedQuote` as different lineage nodes and different evidence panels. The raw payload SHA-256 remains visible alongside the normalisation version and normalisation fingerprint.

## Governance semantics

Audit Trail ACTIVE and Append-only are structural properties of the console and backend evidence model. Commercial Independence is not automatically marked verified: it becomes VERIFIED only where the persisted recommendation explanation includes `COMMERCIAL_INPUTS_EXCLUDED`. Final Integrity similarly reflects only the stored final-integrity outcome.


## Integrity and discrepancy separation

The console also reads the current profile's persisted discrepancy records. These are shown in a separate sub-queue from recommendation/explanation/final-integrity checks; the UI does not reinterpret a factual discrepancy as an integrity outcome or vice versa. No discrepancy resolution action is exposed by BUILD-001G.
