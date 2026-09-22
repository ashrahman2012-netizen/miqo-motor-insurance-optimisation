# Desktop UX reference model — DB-G1 freeze

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G1 — BUILD Control System & UX/Capability Baseline  
**Status:** FROZEN FOR DB-G2 IMPLEMENTATION  
**Reference archive:** `MIQOS-Desktop-App-UX-Demo.zip`  
**SHA-256:** `4bdb761e9c0f7b3ebb6c702ec7e834a1e981358fa352a1bab1faf6b329ca35db`  
**Binary policy:** reference ZIP/PNGs remain outside Git; this record captures the controlled interpretation.

## Reference screen map

| Archive member | Screen | DB-G1 disposition |
|---|---|---|
| `ChatGPT Image Sep 20, 2026, 04_55_09 PM-1.png` | Customer Dashboard | ADAPT |
| `ChatGPT Image Sep 20, 2026, 04_55_12 PM-2.png` | Profile Review & Lock | ADAPT HEAVILY; customer mutation excluded |
| `ChatGPT Image Sep 20, 2026, 04_55_14 PM-3.png` | Objective & Scenario Explorer | ADAPT AS READ-ONLY EVIDENCE |
| `ChatGPT Image Sep 20, 2026, 04_55_16 PM-4.png` | Quote Comparison | ADAPT AS READ-ONLY EVIDENCE |
| `ChatGPT Image Sep 20, 2026, 04_55_18 PM-5.png` | Recommendation Detail | ADAPT AS READ-ONLY DECISION EVIDENCE |
| `ChatGPT Image Sep 20, 2026, 04_55_20 PM-6.png` | Audit & Trace Console | ADOPT AS PRIMARY ADMIN OPERATIONAL REFERENCE |
| `ChatGPT Image Sep 20, 2026, 05_04_38 PM-7.png` | Foundation, App Shell & Shared Design System | ADOPT AS PRIMARY VISUAL-SYSTEM REFERENCE |

The archive was re-hashed and all seven PNGs were inspected directly for DB-G1. The visual reference is not a source of API, mutation, identity, provider, ranking or environment authority.

## Visual language

The reference establishes a dense, operational MIQOS visual language: deep navy application chrome; persistent left navigation; compact command/identity bar; blue interaction, green successful evaluated outcomes, amber attention, red failure/blocked state and purple specialised/system semantics; card/panel information grouping; dense evidence tables; conspicuous environment/governance/integrity presentation; technical IDs/fingerprints/version lineage; contextual evidence panels; and progress/timeline/lineage visualisations.

The repository already contains the authoritative v1.1 token/semantic layer in `@miqo/ui`; the demo confirms/refines that system rather than creating a second token authority.

## Shell and command/search principles

The Desktop Admin shell adapts the demo chrome while retaining shared `AppShell`, responsive navigation and global environment identity. Route navigation is presentation state only and never permission authority.

The demo search field is **ADAPTED**, not accepted as global backend search. Until an authorised search resource exists it may provide local route/navigation commands and local filtering of already-loaded ViewModels only. It must not imply cross-case or global entity search.

## Typography, spacing and status

Exact pixel values are not re-derived. Implementation uses the frozen repository v1.1 design tokens/runtime CSS. Status colour is supplementary: every material state requires textual/semantic meaning. Shared status components remain authoritative for PASS/READY/LOCKED/PENDING/BLOCKED/comparability/environment/authorisation semantics.

## Screen authority summary

- **Customer Dashboard — ADAPT:** adopt shell hierarchy, summary/evidence cards and governance panels; exclude customer journey mutations and unsupported KPIs/distributions.
- **Profile Review & Lock — ADAPT HEAVILY:** adopt read-only summary, validation/discrepancy and version/rules presentation; exclude edit, keep/update, confirmation and lock actions.
- **Objective & Scenario Explorer — READ-ONLY ADAPTATION:** adopt objective/scenario/rejection/provenance presentation; exclude objective selection, optimisation-input changes and scenario generation.
- **Quote Comparison — READ-ONLY ADAPTATION:** adopt dense comparison, comparability distinction and methodology/result evidence; exclude quote selection and frontend ranking/comparability computation.
- **Recommendation Detail — READ-ONLY DECISION EVIDENCE:** adopt why-surfaced, objective, independence, alternatives and integrity panels; exclude acceptance, insurer handoff and customer-summary actions.
- **Audit & Trace Console — PRIMARY ADMIN REFERENCE:** adopt filters, lineage, event timeline, current artefact, discrepancy/integrity queue and raw/normalised evidence viewer; sensitive evidence remains permissioned and not default-persisted/logged/exported.
- **Foundation/App Shell — PRIMARY VISUAL REFERENCE:** adopt shell, interaction hierarchy, status language, cards, tables, badges and environment treatment through `@miqo/ui`.

## Accessibility baseline

The images are visual references, not accessibility proof. Later implementation must prove keyboard-only operation, visible/logical focus, landmarks/headings, screen-reader labels, status/error announcements, non-colour-only communication, semantic tables, resize/zoom and Windows text scaling, reduced motion and usable control targets. Conflicting demo patterns are ADAPT, not copied literally.

## Functional-authority disclaimer

Visual similarity never imports customer actions or business-state authority into Desktop Admin. The frozen G2 mutation matrix, API/interface contract, G3 security architecture, G5 environment model and DB-G1 capability register remain authoritative.
