# MIQOS Accessibility Baseline v1.0

**Gate:** APP-G10  
**Status:** FROZEN ENGINEERING BASELINE

MIQOS implementation shall target **WCAG 2.2 Level AA** as its engineering accessibility baseline. This is an implementation target, not a claim of external/legal certification.

## Required baseline

- One meaningful page H1 and logical heading hierarchy.
- Appropriate header/navigation/main landmarks and a keyboard-accessible skip link.
- Every essential action operable without a pointer.
- No essential hover-only or drag-only interaction. If drag-and-drop is introduced, provide keyboard pickup/move/drop/cancel or an equivalent non-drag operation.
- Visible focus indication; sticky elements must not obscure focus.
- Dialog/drawer focus management and restoration.
- Explicit form labels, required-state text, field-linked errors and correction guidance.
- Locked facts rendered as read-only information rather than ambiguous disabled controls.
- Loading/status/error changes accessible to assistive technology without excessive live-region announcements.
- True tables use semantic headers and accessible names/captions; sort state is exposed when present.
- Mobile quote cards preserve the same information meaning and ordering as wide-screen comparison.
- State/ranking/exclusion is never conveyed by colour alone.
- Charts require non-colour differentiation and an accessible text/data alternative.
- Core journeys reflow at 320 CSS px without loss of information/operation; horizontal scrolling is limited to genuine two-dimensional data regions such as labelled admin tables.
- Aim for 44×44 CSS px interactive targets where practical.
- Respect reduced-motion preferences.
- Customer language remains plain and non-accusatory; integrity signals are not described as fraud conclusions.

## Build verification obligation

Each core customer screen must later receive keyboard, screen-reader structure/name/role/value, zoom/reflow, focus, async/error and colour-independence checks. Core admin audit/trace and quote comparison screens additionally require semantic table/lineage testing.

Automated accessibility scans are required but are not sufficient on their own.

**APP-G10 = PASS**
