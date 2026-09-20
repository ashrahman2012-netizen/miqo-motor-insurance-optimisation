# MIQOS Component Accessibility Contract v1.0

**Parent:** APP-G10 accessibility baseline  
**Gate:** APP-G5 component architecture  
**Status:** FROZEN

## Default rule

Accessibility behaviour belongs inside the reusable component wherever it can be made correct once and reused.

Examples:

- `Dialog` owns dialog role, labelling hooks, focus containment/restoration and Escape behaviour.
- `Drawer` owns accessible open/close semantics and focus management.
- form primitives own label/help/error associations.
- `DataTable` owns structural table semantics; callers supply captions/header labels/data.
- `StatusBadge` supplies visible text rather than colour-only state.
- `IconButton` requires an accessible name.
- decorative icons are hidden from assistive technology.
- `Skeleton` is not separately announced for every row/card.
- `AsyncStateBoundary` exposes restrained status/alert semantics appropriate to the state.

## Component rules

1. Components must support keyboard operation for every exposed interactive behaviour.
2. No shared component requires drag as the sole interaction.
3. Disabled visual appearance is not a substitute for read-only semantics.
4. Focus style uses the design-system focus token and must not be clipped.
5. Components with state changes expose programmatic state where applicable.
6. Responsive renderer swaps must preserve accessible meaning and action availability.
7. Financial/ranking information includes text labels; position and colour are supplementary.
8. Error, warning and integrity semantics remain distinguishable in accessible names/text.
9. Component APIs should make inaccessible usage difficult; required labels cannot be optional where the control needs them.

Full conformance remains a BUILD certification obligation because implementation does not yet exist.
