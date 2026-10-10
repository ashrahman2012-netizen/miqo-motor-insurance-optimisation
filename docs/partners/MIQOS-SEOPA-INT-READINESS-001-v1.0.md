# MIQOS–SEOPA Integration Readiness & Qualification Matrix

**Document:** MIQOS-SEOPA-INT-READINESS-001-v1.0
**Date:** 10 October 2026
**Classification:** Technical discovery and internal synthetic readiness; **not partner-certified**.
**Purpose:** Attach an accurate engineering-readiness statement to the Partner Decision Series dossier without implying unverified SEOPA functionality.

## Meaning of “plug-and-play ready”

MIQOS can build a **provider-adapter slot** which accepts a future SEOPA payload through a versioned, validated contract and can then process it through customer integrity, quote normalisation, price/coverage eligibility, Balanced Value selection, and audit controls. This does **not** mean that connection of an API key alone authorises or enables personal-data processing or real UK insurance quotations.

Current BV5-01 adapter: `scripts/bv-gate-005/evidence-adapter.mjs`. It uses actual current Sprint 4 mock-normaliser fields and **independent synthetic test attestations** for missing cover, fee, finance and permission evidence. It has no API route, SEOPA SDK, network request, insurer credential, persistence or real customer profile acceptance.

## SEOPA integration contract: items that must be obtained from the partner

| Contract family | Specific items required | Why it matters |
|---|---|---|
| API access model | Written availability of headless quotation API vs hosted/affiliate referral; sandbox/production environments | Determines feasibility of MIQOS in-app quote display |
| Request schema | Vehicle, driver, risk, prior claims, address, usage, mileage, disclosure format, mandatory insurer questions | Ensures truthful locked factual profile can be submitted unchanged |
| Response schema | Quote IDs, insurer identities, annual cash and finance prices, IPT, all charges and optional extras | Ensures defensible cost comparisons |
| Policy benefits | Coverage level, exclusions, limits, excess split and benefit entitlements per offer | Prevents false comparability |
| Identity/lineage | Session IDs, provider/insurer mapping, quote/transaction IDs, timestamps, expiry and change tracking | Enables traceable replays and audit |
| Purchase lifecycle | Requote, redirect, binding restrictions, customer handoff, attribution and sale confirmation | Prevents unapproved broker activity |
| Security | Authentication, transport, token renewal, request signing, rate limits, logging and certificates | Makes connector operable securely |
| Data rights | GDPR controller roles, lawful basis, retention, erasure, quote display/reordering and permitted derivative analysis | Defines what MIQOS may actually do |
| Compliance | FCA distribution perimeter, Consumer Duty split, target-market/product governance, disclosures, complaints responsibilities | Determines whether MIQOS may provide this customer journey |
| Commercial | Fees, commissions, ranking conflicts, settlement, tracking and permitted marketing | Determines commercial viability and impartiality |
| Certification | Partner sandbox UAT, negative cases, approval criteria, SLA, support, rollback and production enablement | Sets acceptance for actual integration |

## Connector acceptance strategy (future, separately gated)

1. **Adapter interface freeze:** strictly typed `ProviderQuoteRequest` and `ProviderQuoteResponse`, with immutable risk-profile and customer-choice fingerprints. No invented SEOPA field names.
2. **Contract qualification:** obtain partner-supplied schemas and legal display/data rights; reconcile all mandatory questions, quote coverage, finance and fees. Unknowns become explicit blocked reason codes.
3. **Mock-response conformance:** test SEOPA-approved fixture data in a completely isolated, non-networked staging harness, preserving integrity and no factual optimisation.
4. **Controlled sandbox:** only after approved sandbox credentials and privacy/security scope, demonstrate requests, normalisation and expiry handling; no customer PII until separately approved.
5. **Production decision:** security tests and operational monitoring, signed regulated-role/commercial approvals, independent legal review, real insurer UAT, release and rollback authority. No automatic go-live.

## Readiness statement suitable for partner dossier

> MIQOS has implemented a modular, synthetic-only quotation evidence adapter and demonstrated end-to-end customer-constraint selection on fabricated mock insurer offers with reproducible validation receipts. The architecture can accommodate a future SEOPA-specific connector subject to confirmation of the API product, complete request/response schema, quotation/coverage semantics, permitted ranking and display rights, commercial and regulatory responsibilities, and joint sandbox certification. **MIQOS is not yet SEOPA API-certified or authorised to process live customer quotation requests**, and no actual insurer quotation or customer policy arrangement is claimed.

## Go/no-go

- **Synthetic adapter and decision logic:** tested on branch, exact CI receipts required for final HEAD.
- **True SEOPA plug-and-play readiness:** NOT VERIFIED without partner contract and sandbox UAT.
- **Real customer quotation processing:** NO-GO pending partner activation, regulatory permissions/role allocation, privacy safeguards, production security, operations and final signed release.
- **What can be sent now:** a truthful strategic and technical qualification dossier expressing a conditional integration design; not a statement that only API credentials remain.

See issue #42 `SEOPA-INT-001`, issue #41 `MIQOS-REG-001`, issue #40 `BV-GATE-005`.
