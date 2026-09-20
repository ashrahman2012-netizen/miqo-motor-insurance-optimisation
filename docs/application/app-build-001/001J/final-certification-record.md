# MIQOS-APP-BUILD-001 — Final Application Certification Record

**Increment:** BUILD-001J — Final Application Certification  
**Status:** CERTIFIED  
**Certification environment:** SYNTHETIC  
**Live provider activity:** DISABLED  
**Design authority:** MIQOS-DS-001 v1.1

## Certified build scope

The application-build certification covers the bounded increments:

1. BUILD-001A — Foundation, App Shell & Shared Design System
2. BUILD-001B — Customer Dashboard
3. BUILD-001C — Profile Capture, Validation, Discrepancy, Review & Lock
4. BUILD-001D — Objective, Optimisation Catalogue & Scenario Explorer
5. BUILD-001E — Quote Comparison
6. BUILD-001F — Results, Why This Surfaced & Handoff
7. BUILD-001G — Admin Audit & Trace Console
8. BUILD-001H — Documents, Activity & Support
9. BUILD-001I — Responsive, Accessibility & Browser E2E Hardening
10. BUILD-001J — Final Application Certification

## Certification invariants

- Customer facts remain distinct from optimisation choices; locked factual versions remain immutable.
- Objective, scenario, comparison, recommendation, explanation and final-integrity decisions remain backend/domain-owned.
- The frontend uses typed application ViewModels and does not bind React to database entities.
- Quote rank remains objective-specific; ordinal #1 is not presented as personal advice.
- ADJUSTED_COMPARABLE remains dormant.
- Premium, finance cost and excess remain separate dimensions.
- Commercial independence is evidence-backed rather than asserted without persisted evidence.
- SYNTHETIC/CERTIFICATION cannot be presented as live insurer activity.
- Live provider handoff remains unavailable until separately certified provider capability exists.
- Raw provider response and normalised quotation evidence remain distinct in the admin trace.
- Customer Activity is a safe projection, not a substitute for the append-only technical audit.
- Application records are not represented as insurer policy documents or proof of cover.
- Support guidance does not create messaging/ticketing capability.

## Required closing evidence

The closing branch head must show all three CI jobs green and must include:

- repository boundary/invariant suites;
- PostgreSQL contract suites;
- application-adapter and UI typecheck/tests;
- API PostgreSQL tests;
- all target-stack Playwright tests, including BUILD-001A through BUILD-001J;
- deterministic `certify:app-build-001` checks;
- production builds for all participating workspaces.

The certification record is valid only while the closing branch head passes the required CI jobs. The exact closing head and CI run are recorded operationally at closure rather than hard-coded into this source document.

## Explicit non-certifications / deferred capability

This application certification is not a production go-live decision. It does not certify or activate:

- Seopa or any other live provider integration;
- provider-specific customer UI;
- live quote/purchase/binding;
- production authentication/authorisation integration;
- insurer-issued policy documents or certificates;
- document upload/processing;
- messaging, CRM or support-ticket integration;
- adjusted-comparable ranking methodology;
- external WCAG audit, legal accessibility attestation, penetration test, load test or regulatory approval.

These boundaries remain visible so later programmes can extend capability without rewriting the certified application semantics.


## Certification decision

BUILD-001J is **PASS** and MIQOS-APP-BUILD-001 is **COMPLETE** for the bounded internal engineering application-build scope defined above. Any later source change invalidates the operational closing-head evidence until CI is green again.
