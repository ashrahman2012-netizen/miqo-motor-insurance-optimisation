# MIQOS-APP-BUILD-001 / BUILD-001H — Documents, Activity & Support

**Visual authority:** MIQOS-DS-001 v1.1.  
**Behaviour authority:** persisted customer application state, append-only lifecycle audit evidence, the customer/admin information-architecture split, and the frozen non-advised/environment semantics.

| Gate | Acceptance condition |
|---|---|
| AB-RECORD-G0 | BUILD-001A-G behavioural baselines remain green and MIQOS-DS-001 v1.1 remains authoritative |
| AB-RECORD-G1 | Documents is a typed application-record projection and does not invent insurer policy documents, certificates, PDFs or proof of cover |
| AB-RECORD-G2 | Record cards link back to authoritative Profile, Scenario, Quote Comparison and Your Results surfaces rather than duplicating business logic |
| AB-RECORD-G3 | Download/upload controls remain unavailable until a separately implemented document-generation or ingestion capability exists |
| AB-RECORD-G4 | Activity is derived from append-only persisted audit events but exposes only customer-appropriate milestones |
| AB-RECORD-G5 | Raw provider payload capture, hashes and technical lineage are excluded from the customer Activity surface and remain in Admin Audit & Trace |
| AB-RECORD-G6 | Activity is read-only: it cannot edit, delete, replace or reinterpret authoritative audit evidence |
| AB-RECORD-G7 | Help & Support provides governed navigation and environment-aware guidance without creating messages, tickets or external support records |
| AB-RECORD-G8 | SYNTHETIC/CERTIFICATION support language cannot imply a live insurance purchase, binding or insurer-issued document |
| AB-RECORD-G9 | Target-stack E2E proves records, customer-safe activity projection, environment-aware support and unavailable upload/download/contact actions |
| AB-RECORD-G10 | Application adapters, PostgreSQL/API regressions, Playwright and production build remain green |

## Documents boundary

The customer navigation label remains **Documents**, while the canonical page title is **Documents & Records**. BUILD-001H represents only application records that can be traced to persisted MIQOS state. A record card is not a file and is not evidence that an insurer issued a policy schedule, certificate of motor insurance, proof of cover or quotation PDF.

The available records are composed from the current profile version, selected scenario exploration, normalised quotation evidence and persisted RecommendationSet. Each record links back to the application surface that owns that evidence. Download and upload actions remain blocked because no document-generation, document-storage or ingestion contract exists in this increment.

## Activity boundary

Customer Activity is a deliberately simplified projection of the append-only lifecycle record. It includes meaningful profile, objective, scenario, results and integrity milestones. Provider payload capture, SHA fingerprints, raw/normalised forensic evidence and complete lineage remain administrative concerns under BUILD-001G.

The projection does not mutate the audit log and it does not replace the Admin Audit & Trace Console.

## Support boundary

Help & Support is guidance/navigation only. BUILD-001H does not implement messaging, ticket creation, external CRM/service-desk integration, live-agent chat or insurer contact. Environment identity remains explicit and support copy cannot upgrade synthetic/certification activity into a live insurance transaction.
