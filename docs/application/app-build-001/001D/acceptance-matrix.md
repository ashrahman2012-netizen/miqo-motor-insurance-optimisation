# MIQOS-APP-BUILD-001 / BUILD-001D — Objective, Optimisation Catalogue & Scenario Explorer

**Visual authority:** supplied `MIQOS - Objective & Scenario Explorer - Demo Page 3.png` for hierarchy and dark MIQOS presentation.  
**Behaviour authority:** existing versioned optimisation policy, locked-profile objective persistence, Sprint 4 deterministic scenario generator and P4 application contracts.

| Gate | Acceptance condition |
|---|---|
| AB-SCEN-G0 | BUILD-001A/B/C baselines and certified domain/DB invariants remain green |
| AB-SCEN-G1 | Optimisation runs only against the current exact LOCKED RiskProfileVersion |
| AB-SCEN-G2 | Objective cards are driven by the current versioned objective model; dormant objectives remain non-executable |
| AB-SCEN-G3 | Catalogue controls are O-class only and sourced from the backend policy definition |
| AB-SCEN-G4 | F/V/D/I values have no editable scenario controls; frontend sends only approved O-class choice sets |
| AB-SCEN-G5 | Scenario generation uses the existing deterministic Sprint 4 generator and persists accepted/rejected evidence |
| AB-SCEN-G6 | Accepted scenario deltas render with O provenance; rejection rule/category/reason remain visible |
| AB-SCEN-G7 | BUILD-001D does not execute market routes, calculate premiums, rank quotes or build recommendations |
| AB-SCEN-G8 | Explorer is responsive, keyboard-operable and preserves labels/disabled-state semantics |
| AB-SCEN-G9 | Target-stack E2E proves four O-only scenarios plus deterministic rejected-candidate presentation |
| AB-SCEN-G10 | Adapter tests/typecheck, existing PostgreSQL/API/browser regressions and production build are green |

## Reference-model corrections

The supplied design illustrates `Telematics Accepted` as an objective. The certified objective model does not define that objective; telematics is an O-class optimisation control. BUILD-001D therefore shows the actual executable objective model: lowest annual premium, lowest monthly commitment, lowest finance cost and lower excess exposure, while Balanced cost and exposure remains visible but dormant pending a separately approved methodology.

The reference also shows annual premium, excess and expected route coverage directly in the scenario table. Those are quotation/market-route outcomes and are intentionally not fabricated in BUILD-001D. This increment shows scenario identity, O-class deltas, readiness and provenance only; quotation comparison belongs to BUILD-001E.


## Visual authority revision

This certified increment now inherits **MIQOS-DS-001 v1.1 — Visual Baseline Refinement**. The revision changes visual tokens and presentation semantics only; all previously certified behavioural gates remain unchanged. See `docs/application/app-build-001/visual-retrofit-register-v1.1.md`.
