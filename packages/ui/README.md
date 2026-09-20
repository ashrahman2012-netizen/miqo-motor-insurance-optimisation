# @miqo/ui

Shared MIQOS presentation boundary for the customer and admin applications.

## Application Build status

The package is active under **MIQOS-APP-BUILD-001** and provides:

- runtime shared application shell and responsive navigation;
- MIQOS-DS-001 v1.1 design tokens and semantic mappings;
- environment banner/badge semantics;
- accessible buttons, cards, panels, page states and layout primitives;
- status, integrity, comparison, governance, version, lineage, fingerprint and money presentation primitives.

**Primary visual authority:** `MIQOS-DS-001 v1.1 — Visual Baseline Refinement`.

The original v1 token files remain historical preparation artefacts. Runtime styles and subsequent application work use v1.1.

## Visual semantic rule

Blue communicates interaction. Green communicates success. Amber communicates attention. Red communicates failure. Purple is reserved for specialised/system semantics.

Glow is selective emphasis, not a default decoration. Dense forms, tables, audit data and provenance surfaces remain visually calm.

## Ownership rule

`@miqo/ui` owns accessible visual primitives and presentation-only MIQOS semantics. It does **not** own API fetching, persistence, pricing, quote ranking, comparison eligibility, optimisation rules, integrity evaluation, provider activation or environment authorisation.

Application data must continue through the typed API/ViewModel boundary before rendering.
