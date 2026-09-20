# MIQOS Design Token Accessibility Pre-check

**Phase:** P1  
**Status:** PRE-CHECK ONLY — NOT APP-G10 CERTIFICATION

APP-G10 remains a later accessibility gate. P1 nevertheless checks the principal dark-theme text pairings before freezing tokens.

Approximate WCAG contrast ratios for core pairs:

| Foreground | Background | Ratio |
|---|---|---:|
| `#F2F3F4` primary text | `#00040F` canvas | 18.45:1 |
| `#F2F3F4` primary text | `#000D1F` primary surface | 17.54:1 |
| `#B7C4D4` secondary text | `#000D1F` primary surface | 11.01:1 |
| `#FFFFFF` CTA text | `#006CE7` primary blue | 4.88:1 |
| `#00101E` inverse text | `#1AA5F2` accent | 7.05:1 |
| `#5EEAD4` success text | `#000D1F` primary surface | 13.18:1 |
| `#F8D477` warning text | `#000D1F` primary surface | 13.62:1 |
| `#FDA4AF` danger text | `#000D1F` primary surface | 10.31:1 |
| `#7DD3FC` info text | `#000D1F` primary surface | 11.69:1 |

These calculations support the frozen token direction but do not constitute full accessibility certification. APP-G10 must still validate component states, focus order, keyboard behaviour, zoom/reflow, chart alternatives, error semantics and responsive layouts.
