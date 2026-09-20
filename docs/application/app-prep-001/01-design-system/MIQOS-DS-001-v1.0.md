# MIQOS-DS-001 — Design System v1.0

**Programme:** MIQOS-APP-PREP-001  
**Phase:** P1 — Design & Semantic System  
**Gates:** APP-G2 / APP-G7 / APP-G8  
**Status:** FROZEN FOR APPLICATION PREPARATION  
**Date:** 20 September 2026

## 1. Purpose

MIQOS-DS-001 converts the frozen visual direction into an implementation-ready design-token and semantic system without changing any certified pricing, optimisation, comparison, provider, integrity or persistence behaviour.

The visual authority remains the frozen **MIQOS - UX Design Model Sample**. The six functional demo screens remain workflow/content references. Certified MIQOS domain/API behaviour remains authoritative where a visual reference conflicts with system behaviour.

## 2. Design principles

1. **Premium technical, not gaming UI.** Dark navy surfaces, blue/cyan emphasis and restrained illumination.
2. **Readability before decoration.** Dense forms, quote tables and audit views remain flat and calm.
3. **Semantic colour is orthogonal to business meaning.** A control class, lifecycle state and severity are separate concepts.
4. **Never rely on colour alone.** Every semantic state requires text and, where useful, an icon.
5. **No UI-created business state.** The frontend represents certified state; it does not infer eligibility, ranking, integrity or environment authorisation.
6. **Financial dimensions stay separate.** Premium, finance cost and excess are never collapsed into a fabricated composite score.
7. **Customer choice stays distinct from factual truth.** O-class controls look actionable; locked factual values do not.

## 3. Core colour tokens

### Neutral / surface

| Token | Value | Use |
|---|---|---|
| `color.bg.canvas` | `#00040F` | Application canvas |
| `color.bg.navigation` | `#000816` | Primary navigation |
| `color.surface.primary` | `#000D1F` | Standard cards/panels |
| `color.surface.secondary` | `#001235` | Elevated/selected-adjacent surfaces |
| `color.surface.tertiary` | `#062045` | Strong emphasis surface |
| `color.border.subtle` | `#17395F` | Standard panel/control borders |
| `color.border.active` | `#0489EF` | Selected/active control border |
| `color.grid.subtle` | `#0B2540` | Dense table/chart separators |

### Brand / interaction

| Token | Value | Use |
|---|---|---|
| `color.brand.primary` | `#006CE7` | Primary CTA and selected interactive state |
| `color.brand.primaryHover` | `#0489EF` | Hover |
| `color.brand.primaryPressed` | `#0058BF` | Pressed/active |
| `color.brand.accent` | `#1AA5F2` | Focus/high-value accent |
| `color.brand.cyan` | `#22D3EE` | Secondary technical accent |
| `color.focus.ring` | `rgba(26,165,242,0.32)` | Keyboard focus ring |

### Text

| Token | Value |
|---|---|
| `color.text.primary` | `#F2F3F4` |
| `color.text.secondary` | `#B7C4D4` |
| `color.text.tertiary` | `#8FA0B5` |
| `color.text.disabled` | `#66758A` |
| `color.text.inverse` | `#00101E` |
| `color.text.onPrimary` | `#FFFFFF` |

### State colours

| Token | Value | Meaning |
|---|---|---|
| `color.state.success` | `#2DD4BF` | PASS / READY / eligible success |
| `color.state.successText` | `#5EEAD4` | Success text on dark surfaces |
| `color.state.warning` | `#F4B740` | Review/pending/attention |
| `color.state.warningText` | `#F8D477` | Warning text on dark surfaces |
| `color.state.danger` | `#FB7185` | Blocked/not authorised/error |
| `color.state.dangerText` | `#FDA4AF` | Danger text on dark surfaces |
| `color.state.info` | `#38BDF8` | Informational/system identity |
| `color.state.infoText` | `#7DD3FC` | Informational text on dark surfaces |
| `color.state.certification` | `#A78BFA` | Certification environment identity |
| `color.state.neutral` | `#94A3B8` | Draft/superseded/excluded-neutral identity |

## 4. Typography tokens

Primary stack:

```text
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Monospace stack:

```text
"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace
```

No font binary is introduced by APP-PREP.

| Token | Size / line-height | Weight |
|---|---|---|
| `type.display.lg` | 48 / 56 | 700 |
| `type.display.md` | 40 / 48 | 700 |
| `type.heading.h1` | 32 / 40 | 700 |
| `type.heading.h2` | 24 / 32 | 700 |
| `type.heading.h3` | 20 / 28 | 600 |
| `type.body.lg` | 18 / 28 | 400 |
| `type.body.md` | 16 / 24 | 400 |
| `type.body.sm` | 14 / 20 | 400 |
| `type.label.md` | 14 / 20 | 600 |
| `type.label.sm` | 12 / 16 | 600 |
| `type.code.sm` | 12 / 18 | 500 |

## 5. Spacing, radius and borders

Spacing scale in pixels:

```text
0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

Radius:

```text
sm  = 6px
md  = 10px
lg  = 14px
xl  = 18px
pill = 999px
```

Borders:

- standard surface/control: 1px;
- selected/active: 1px active border plus restrained glow;
- keyboard focus: visible 3px focus ring external to the component boundary;
- semantic severity may not be represented by border colour alone.

## 6. Elevation and glow rules

Default card elevation:

```css
box-shadow: 0 10px 30px rgba(0,0,0,0.28);
```

Selected/active surface:

```css
box-shadow:
  0 0 0 1px rgba(4,137,239,0.24),
  0 0 24px rgba(4,137,239,0.18);
```

Major hero/result surface:

```css
box-shadow:
  0 12px 36px rgba(0,0,0,0.32),
  0 0 32px rgba(4,137,239,0.10);
```

Glow is **not** permitted on every card. It is reserved for:

- active navigation;
- primary CTA;
- selected objective/control;
- active workflow step;
- surfaced/top result;
- critical system/environment indicator.

Tables, profile forms, audit records and long-form administrative panels default to flat surfaces and subtle borders.

## 7. Interaction and motion

- Minimum interactive target: 44×44 CSS px where practical.
- Standard transition: 120–180 ms ease-out for hover/focus/selection.
- No continuous pulsing/glow for ordinary status.
- Motion must not be required to understand state.
- `prefers-reduced-motion` must disable non-essential transition/animation.
- Loading activity may use restrained progress/skeleton states; no misleading completion animation.

## 8. Design-system boundary

MIQOS-DS-001 governs presentation primitives only. It MUST NOT:

- redefine domain/control classifications;
- calculate quote eligibility;
- rank quotes;
- activate dormant `ADJUSTED_COMPARABLE`;
- change customer objectives;
- infer provider certification;
- infer integrity outcomes;
- alter environment authorisation;
- write factual profile data.

## 9. Implementation target

Machine-readable token/mapping baselines are stored under `packages/ui/tokens/`. P1 does not wire them into customer/admin production pages. Component implementation remains P3/BUILD work.

## 10. Change control

Any change to a frozen token that materially changes semantic meaning, environment identity, F/V/D/O/I treatment or status severity requires an APP-PREP change record. Pure implementation translation (for example CSS custom-property naming) may occur later without changing the semantic contract.
