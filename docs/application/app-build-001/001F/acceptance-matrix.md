# MIQOS-APP-BUILD-001 / BUILD-001F — Results, Why This Surfaced & Handoff

**Visual authority:** MIQOS-DS-001 v1.1 plus the supplied Recommendation Detail functional reference.  
**Behaviour authority:** persisted Sprint 4 RecommendationSet, RecommendationExplanation, comparison evidence, final-integrity selection service and environment boundary.

| Gate | Acceptance condition |
|---|---|
| AB-RESULT-G0 | BUILD-001A-E behavioural baselines remain green and MIQOS-DS-001 v1.1 is the active visual authority |
| AB-RESULT-G1 | Your Results are created only from persisted comparison evidence for the exact locked profile/objective/exploration |
| AB-RESULT-G2 | Recommendation ordering remains backend/domain-owned; React does not calculate or change the surfaced result |
| AB-RESULT-G3 | Why This Surfaced renders persisted RecommendationExplanation material reasons and O-class control explanations |
| AB-RESULT-G4 | Alternative eligible results preserve persisted objective ordering; excluded evidence remains separate |
| AB-RESULT-G5 | Commercial independence is shown from persisted explanation evidence, not invented UI claims |
| AB-RESULT-G6 | Final integrity is labelled PASS only when an authoritative persisted final-integrity result exists |
| AB-RESULT-G7 | SYNTHETIC/CERTIFICATION cannot expose live insurer handoff, purchase or binding; no provider URL is fabricated |
| AB-RESULT-G8 | Production handoff remains blocked until a separately certified provider handoff contract exists |
| AB-RESULT-G9 | Target-stack E2E proves result persistence, explanation evidence, final-integrity proof and synthetic live-provider disablement |
| AB-RESULT-G10 | Application adapters, UI design-governance tests, PostgreSQL/API regressions, Playwright and production build are green |

## Semantic correction to the visual reference

Customer-facing terminology remains the frozen non-advised model: **Your Results**, **Surfaced result**, and **Why This Surfaced**. The application does not present ordinal #1 as general advice or a universal best policy.

The supplied reference includes a Go to Insurer action. BUILD-001F represents that handoff state but does not activate it in the synthetic runtime and does not invent provider destinations. The existing final-integrity path is exposed separately as a controlled synthetic proof.

The Integrity card is informational until the persisted final-integrity service has executed. It may display PASS only after that authoritative result exists.
