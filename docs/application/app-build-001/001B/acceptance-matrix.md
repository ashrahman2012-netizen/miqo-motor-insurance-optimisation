# MIQOS-APP-BUILD-001 / BUILD-001B — Customer Dashboard Acceptance

**Visual authority:** supplied `MIQOS - Customer Dashboard - Demo Page 1.png` for hierarchy and dark visual direction.  
**Runtime authority:** certified API/domain evidence and P4 application contracts.

| Gate | Acceptance condition |
|---|---|
| AB-DASH-G0 | BUILD-001A shell/design/environment baseline remains green |
| AB-DASH-G1 | Dashboard is a read-only composition over existing APIs; no dashboard mutation endpoint is introduced |
| AB-DASH-G2 | Current profile/version and latest objective are derived from persisted lifecycle read models |
| AB-DASH-G3 | Scenario/quote/result summaries use persisted exploration, normalised quote and RecommendationSet evidence |
| AB-DASH-G4 | Surfaced result comes only from backend RecommendationSet evidence; frontend does not rank or determine eligibility |
| AB-DASH-G5 | Visual hierarchy implements summary cards, journey, case context, quote distribution, quick actions, governance and surfaced-result panel |
| AB-DASH-G6 | Empty/loading/error states are explicit and synthetic environment remains visibly disclosed |
| AB-DASH-G7 | Quick actions link only to already-proven workflow surfaces and remain disabled when prerequisites are absent |
| AB-DASH-G8 | Dashboard reflows through laptop/tablet/mobile without hiding material financial state |
| AB-DASH-G9 | Target-stack Playwright proves a dashboard built from freshly persisted API evidence |
| AB-DASH-G10 | Adapter tests/typecheck, existing repository contracts, Playwright and production build are green |

## Boundary

The dashboard may calculate descriptive display aggregates such as quotation counts and histogram buckets. It may not select the surfaced result, change comparison state, infer eligibility, modify facts, execute quotes or activate provider/handoff behaviour.

The screenshot contains conceptual fields not supported by the current backend read model (for example a policy-type label and standalone case entity). BUILD-001B does not fabricate those fields: it displays profile/version references and only financial/comparison dimensions supported by persisted evidence.
