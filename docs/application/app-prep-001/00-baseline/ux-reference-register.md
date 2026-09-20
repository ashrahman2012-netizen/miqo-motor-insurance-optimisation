# MIQOS-APP-PREP-001 — UX Reference Register

**Phase:** P0  
**Gate:** APP-G1  
**Status:** FROZEN v1.0

The supplied image assets are frozen by filename, dimensions, SHA-256 digest and authority role. They are reference inputs; the image bytes are not committed to the application repository in P0.

| Reference | Dimensions | SHA-256 | Frozen authority |
|---|---:|---|---|
| MIQOS - Demo Image 1(1).png | 1448×1086 | `d12e99906cc6577f2fab644a9234c6198793f25d22ca2f712536920b7d914b53` | Customer Dashboard — information architecture, content hierarchy, workflow reference |
| MIQOS - Demo Image 2(1).png | 1448×1086 | `6b778f802e732e4b212fc3f0dc046e748f116fe5b01310f33c3014b49c53705c` | Profile Review & Lock — functional UX reference |
| MIQOS - Demo Image 3(1).png | 1448×1086 | `649b12d36bfedf39a1aa5eed4cac2edffacf2ac92e228a5295e7a80e70a95965` | Objective & Scenario Explorer — functional UX reference |
| MIQOS - Demo Image 4(1).png | 1448×1086 | `a1e6a6e7ace6594e7ba79ab640c966af58012fc5f4680f88cbd223ea18513813` | Quote Comparison — functional UX reference |
| MIQOS - Demo Image 5(1).png | 1448×1086 | `9e4bbe3d2773fdbd3e19c768344ff1e1796fdb5e455894b75c30812127a2a7cd` | Recommendation Detail / result explanation — functional UX reference |
| MIQOS - Demo Image 6(1).png | 1448×1086 | `6e226b805ee680a014cf40eedbe005baa26a3e82ac7e74d30bd63afcef50d923` | Admin Audit & Trace Console — functional UX reference |
| MIQOS - UX Design Model Sample(1).png | 1536×1024 | `ba849fd5c64562924a4b0d88ebbdd0e43e53befc547a64149f3f349c2942c047` | Visual/brand authority: dark navy/near-black, blue/cyan accent, restrained glow, high-contrast premium technical styling |

## Authority hierarchy

```text
UX Design Model Sample
→ VISUAL / BRAND AUTHORITY

Demo Images 1–6
→ INFORMATION ARCHITECTURE
→ SCREEN CONTENT
→ WORKFLOW
→ FUNCTIONAL UX REFERENCE

Certified MIQOS backend
→ SYSTEM BEHAVIOUR
→ DATA CONTRACT
→ GOVERNANCE AUTHORITY
```

## Freeze rules

1. The six functional mockups are not pixel-perfect production mandates.
2. The dark UX model does not override certified business behaviour.
3. Dense forms, comparison tables and audit views must remain readable and relatively calm; glow is reserved for selected/active/important states.
4. Customer-facing production UX must not activate a methodology merely because a mockup depicts it.
5. Any replacement image that changes one of the SHA-256 digests requires an explicit APP-PREP reference update.
