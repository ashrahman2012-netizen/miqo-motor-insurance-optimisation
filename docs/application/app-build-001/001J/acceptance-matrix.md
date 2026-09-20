# MIQOS-APP-BUILD-001 / BUILD-001J — Final Application Certification

**Certification class:** internal engineering certification of the MIQOS application build in the controlled synthetic target stack.  
**Visual authority:** MIQOS-DS-001 v1.1.  
**Behaviour authority:** certified domain/API/database contracts and BUILD-001A through BUILD-001I.

| Gate | Acceptance condition |
|---|---|
| AB-CERT-G0 | BUILD-001A through BUILD-001I acceptance records and target-stack browser proofs are present |
| AB-CERT-G1 | Canonical customer surfaces and the Admin Audit & Trace surface are present and render within the shared application shell |
| AB-CERT-G2 | Deterministic certification script proves non-advised terminology, provider-independent frontend boundaries, no direct UI/database binding and the frozen design-system tokens |
| AB-CERT-G3 | CI explicitly runs with SYNTHETIC data classification and live providers disabled |
| AB-CERT-G4 | ADJUSTED_COMPARABLE remains dormant and is not activated by customer application source |
| AB-CERT-G5 | Results preserve objective-specific ordering, persisted explainability, authoritative final integrity and blocked live-provider handoff |
| AB-CERT-G6 | Documents/Support do not invent insurer-issued files, purchase/binding state, messaging, tickets or external support records |
| AB-CERT-G7 | Customer Activity remains distinct from technical Admin Audit & Trace; raw/normalised provider evidence stays administrative |
| AB-CERT-G8 | Final cross-surface browser proof exercises customer application, non-advised boundaries and governed admin lineage from one persisted synthetic journey |
| AB-CERT-G9 | Responsive/accessibility hardening from BUILD-001I remains green across the complete regression suite |
| AB-CERT-G10 | Locked dependencies, boundary/invariant tests, PostgreSQL contracts, application-adapter/UI tests, API tests, complete Playwright target stack, deterministic certification and production builds all pass |

## Certification decision rule

BUILD-001J may close only when **AB-CERT-G0 through AB-CERT-G10 are PASS on the same branch head**.

This certification does not authorise live-provider operation, provider activation, policy purchase/binding, production authentication, insurer document issuance, customer messaging, external support integration, dormant adjusted-comparison methodology, or regulatory/legal accessibility certification. Those require separate controlled work and evidence.

A green production build means the web applications compile for deployment; it does not by itself mean the MIQOS service is approved for live insurance business.


## Gate outcome

| Gate range | Outcome |
|---|---|
| AB-CERT-G0 → AB-CERT-G10 | **PASS** |

**Programme decision:** `MIQOS-APP-BUILD-001 — COMPLETE` for the bounded internal engineering certification scope. The closing branch head must remain green in the required CI jobs; live-provider and production go-live capabilities remain explicitly outside this decision.
