# DB-G1 UX reference inspection

**Result:** reference inspection complete; acceptance pending CI.

Archive `MIQOS-Desktop-App-UX-Demo.zip` re-hashed to `4bdb761e9c0f7b3ebb6c702ec7e834a1e981358fa352a1bab1faf6b329ca35db`, matching DB-G0/handover.

## Exact members and mapping

1. `ChatGPT Image Sep 20, 2026, 04_55_09 PM-1.png` — Customer Dashboard — ADAPT
2. `ChatGPT Image Sep 20, 2026, 04_55_12 PM-2.png` — Profile Review & Lock — ADAPT HEAVILY
3. `ChatGPT Image Sep 20, 2026, 04_55_14 PM-3.png` — Objective & Scenario Explorer — READ-ONLY ADAPTATION
4. `ChatGPT Image Sep 20, 2026, 04_55_16 PM-4.png` — Quote Comparison — READ-ONLY ADAPTATION
5. `ChatGPT Image Sep 20, 2026, 04_55_18 PM-5.png` — Recommendation Detail — READ-ONLY DECISION EVIDENCE
6. `ChatGPT Image Sep 20, 2026, 04_55_20 PM-6.png` — Audit & Trace Console — PRIMARY ADMIN OPERATIONAL REFERENCE
7. `ChatGPT Image Sep 20, 2026, 05_04_38 PM-7.png` — Foundation, App Shell & Shared Design System — PRIMARY VISUAL-SYSTEM REFERENCE

No binary member is committed.

## Direct findings

Dashboard provides shell/card/governance patterns but its journey actions and unsupported KPIs are excluded/deferred. Profile provides strong read-only validation/discrepancy/version patterns but edit/update/lock actions are excluded. Scenario and Quote screens provide dense read-only evidence/provenance/comparability patterns but customer selection/generation/execution is excluded. Recommendation provides why-surfaced/independence/integrity evidence but handoff/send actions are excluded. Audit & Trace most directly matches the Admin mission and is adopted as the primary operational pattern. Foundation aligns with the existing v1.1 token/semantic authority.

Every material customer/business action visible in the images now has an explicit authority disposition. The images are not accessibility proof; later implementation must prove keyboard/focus/screen-reader/resize/non-colour-only behaviour.
