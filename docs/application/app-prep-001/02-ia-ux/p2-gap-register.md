# MIQOS-APP-PREP-001 — P2 Gap Register

**Phase:** P2 — Information Architecture & UX Rules

| ID | Classification | Finding | Treatment |
|---|---|---|---|
| P2-01 | PASS | Customer IA and canonical route groups frozen. | P3/P4 consume. |
| P2-02 | PASS | Admin IA and audit/trace entry points frozen. | P3/P4 consume. |
| P2-03 | PASS | Responsive breakpoints and structural transformations frozen. | Build implementation later. |
| P2-04 | PASS | Quote Comparison transforms to cards on narrow screens instead of compressing the desktop table. | Preserve. |
| P2-05 | PASS | WCAG 2.2 AA engineering baseline frozen. | Implementation verification later. |
| P2-06 | PASS | Customer terminology separates surfaced results from personalised-advice language. | P3/P4 consume. |
| P2-07 | PASS | Loading/empty/partial/error/blocked/not-authorised states frozen. | P3 components + P4 contracts. |
| P2-08 | PASS | No essential drag-only interaction permitted. | Preserve. |
| P2-09 | AVAILABLE | Legacy routes have target-area mappings. | P5 build plan defines redirect sequencing. |
| P2-10 | PARTIAL | Authentication/account context and exact permission model are outside current certified application scope. | Do not invent RBAC. |
| P2-11 | PARTIAL | Documents/support/settings service backends are not present in the current prototype. | Reserve IA only; build must not fake server capability. |
| P2-12 | PARTIAL | Accessibility implementation conformance cannot be certified before components/pages exist. | Build certification obligation. |
| P2-13 | REQUIRES_DECISION | Exact icon library remains unselected. | P3 may select implementation library. |
| P2-14 | REQUIRES_DECISION | Component-level route guards and ViewModel shapes are not yet frozen. | P4 / APP-G6 + APP-G13. |

**P2 architectural blocker:** none identified.
