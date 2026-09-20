# MIQOS-APP-BUILD-001 / BUILD-001I — Responsive, Accessibility & Browser E2E Hardening

**Visual authority:** MIQOS-DS-001 v1.1.  
**Behaviour authority:** certified BUILD-001A-H application contracts and existing backend/domain behaviour.

| Gate | Acceptance condition |
|---|---|
| AB-HARDEN-G0 | BUILD-001A-H behavioural baselines remain green; hardening does not change pricing, optimisation, comparison, recommendation, provider or integrity decisions |
| AB-HARDEN-G1 | Canonical customer surfaces render without document/body horizontal overflow at 1440px and 375px |
| AB-HARDEN-G2 | Dense Quotes, Results and Admin Audit surfaces remain usable at 1024px, 768px and 320px |
| AB-HARDEN-G3 | Mobile Quote Comparison transforms the wide ranked table into ranked cards and supports a two-result presentation drawer without recalculating ranking |
| AB-HARDEN-G4 | Shared mobile navigation is a modal keyboard surface: initial focus, Tab/Shift+Tab containment, Escape close and focus restoration are deterministic |
| AB-HARDEN-G5 | Skip-to-content works by keyboard and the active navigation item exposes aria-current=page |
| AB-HARDEN-G6 | Dense horizontally scrollable tables/raw evidence expose labelled keyboard-focusable regions and table captions where applicable |
| AB-HARDEN-G7 | Critical administrative form controls have accessible labels; buttons have accessible names; duplicate DOM IDs are absent in the tested console |
| AB-HARDEN-G8 | Reduced-motion and increased/forced-contrast CSS fallbacks are present in the shared design-system runtime |
| AB-HARDEN-G9 | Browser E2E proves responsive breakpoints, keyboard navigation, focus management, labelling, mobile comparison and no viewport overflow |
| AB-HARDEN-G10 | Full application-adapter/UI/API/PostgreSQL/browser/build CI remains green |

## Responsive contract

The certified responsive bands remain:

- Desktop: 1440px and above
- Laptop: 1024–1439px
- Tablet: 768–1023px
- Mobile: 320–767px

BUILD-001I does not hide dense evidence by clipping the page. Wide tabular evidence remains inside its own labelled scroll region where appropriate. Quote Comparison receives an additional mobile-native ranked-card presentation; the desktop table remains the authoritative same-data representation.

The mobile two-result drawer compares only fields already present in the canonical NormalisedQuoteVM. It does not derive a composite score, rerank quotations or create a recommendation.

## Accessibility contract

The shared shell now treats the mobile navigation as a modal dialog with trapped focus, Escape handling, focus restoration and scroll locking. The existing skip link remains the first keyboard target and moves focus to the application workspace.

Shared focus-visible treatment, reduced-motion support, increased-contrast treatment and forced-colour fallbacks remain presentation-level protections. No accessibility hardening changes semantic status meanings.

## Browser proof

The target-stack suite exercises all primary customer surfaces at desktop and mobile widths, the densest customer/admin surfaces at laptop/tablet/320px widths, mobile quote selection/comparison, keyboard skip navigation, mobile dialog focus containment, active-navigation semantics, form labelling and reduced-motion behaviour.
