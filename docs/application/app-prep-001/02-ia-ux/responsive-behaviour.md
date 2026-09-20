# MIQOS Responsive Behaviour Specification v1.0

**Gate:** APP-G9  
**Status:** FROZEN FOR APPLICATION PREPARATION

## Breakpoints

| Mode | Width |
|---|---:|
| Mobile | 320–767 CSS px |
| Tablet | 768–1023 CSS px |
| Laptop | 1024–1439 CSS px |
| Desktop | 1440+ CSS px |

## Shell

Desktop uses persistent full left navigation and top utility bar. Laptop may use compact/collapsible navigation. Tablet uses an accessible drawer/sheet. Mobile uses single-column flow with explicit accessible navigation control.

## Quote Comparison

Desktop/laptop may use a data table containing provider/route, comparison state, annual premium, finance/monthly dimension where applicable, compulsory excess, voluntary excess, and objective-specific ordering.

Tablet/mobile must not squeeze the desktop table into unreadable columns. Quotes transform into ordered quote cards preserving the same material dimensions. Not-comparable/excluded quotes remain visible with reasons and are not silently removed.

## Other responsive rules

- Dashboard: multi-column → single-column with blocking/next action before decorative analytics.
- Profile: two-column summaries → one column; locked facts become read-only information rows.
- Discrepancies: side-by-side choices → vertically stacked.
- Scenario explorer: objective cards/grid → stacked controls and scenario cards when needed.
- Admin: genuine dense tables may use labelled horizontal scroll regions where card conversion would destroy relationships.
- Lineage explorer: wide visual chain → ordered stacked nodes.

Responsive adaptation must not alter ranking, hide material price/excess dimensions, remove exclusion reasons, hide environment identity, or convert informational content into implied advice.

**APP-G9 = PASS**
