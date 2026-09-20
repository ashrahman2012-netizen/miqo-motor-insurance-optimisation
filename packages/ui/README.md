# @miqo/ui

Shared MIQOS presentation boundary.

## APP-PREP status

The package currently contains application-preparation artefacts only:

- `tokens/` — frozen design and semantic token contracts;
- `ux/` — frozen route, copy and UI-state contracts;
- `components/` — frozen component catalogue.

Production React component implementation is **not yet authorised**. It begins only under the later controlled application build after APP-PREP build-readiness certification.

## Ownership rule

`@miqo/ui` owns accessible visual primitives and presentation-only MIQOS semantics. It does not own API fetching, persistence, quote ranking, comparison eligibility, integrity evaluation, provider activation or environment authorisation.

See `docs/application/app-prep-001/03-components/` for APP-G5 architecture.
