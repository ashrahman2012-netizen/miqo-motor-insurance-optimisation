# MIQOS F/V/D/O/I Visual Semantics v1.0

**Gate:** APP-G7  
**Status:** FROZEN

This specification maps the certified MIQOS control taxonomy into presentation semantics. It does **not** change the taxonomy.

## 1. Governing data semantics

The inherited architecture is:

```text
Truthful Customer Facts            F
        ↓
Verified / Enriched Data           V
        ↓
Derived Variables                  D
        ↓
Integrity / Consistency Signals    I
        ↓
LOCKED RiskProfileVersion
        ↓
Customer-controllable choices      O
```

The optimiser may READ F/V/D/I/O but may WRITE O only.

## 2. Visual mapping

| Class | Customer/admin label | Base accent | Icon concept | Interaction rule |
|---|---|---|---|---|
| **F** | Fact / Locked fact | `#94A3B8` slate | document / lock | Read-only after lock; edit affordance prohibited |
| **V** | Verified / Enriched evidence | `#22D3EE` cyan | verification / source | Evidence/provenance view; discrepancy/confidence shown separately |
| **D** | Derived | `#A78BFA` violet | function / calculated value | Read-only; derivation/rule version inspectable |
| **O** | Customer choice | `#006CE7` electric blue | sliders / choice | Only class receiving normal optimisation edit/select affordance |
| **I** | Integrity signal | `#2DD4BF` teal identity | shield / integrity | Base identity only; actual PASS/WARN/BLOCKED severity is independent |

## 3. Mandatory behaviour

### F — factual

- Must visually read as stable source information.
- After profile lock, controls become read-only presentation, not disabled-looking ambiguous form fields.
- Correction actions, where authorised, must clearly create a new version rather than suggest in-place editing.

### V — verified / enriched

- Must show source/provenance affordance where relevant.
- Cyan class identity does not imply that every V-class record is conflict-free.
- Confidence, discrepancy or review state uses the separate status/severity system.

### D — derived

- Must identify that the value is computed/derived, not customer-entered fact.
- Rule/version provenance should be inspectable in admin and where materially useful to customers.
- Derived values are not optimisation sliders.

### O — customer-controllable

- Receives the strongest interactive blue treatment.
- Must explain material trade-offs where applicable.
- O-class interaction may change scenario choices, never the locked factual profile.
- “Change choices, not facts” remains the visual and behavioural boundary.

### I — integrity / consistency

- A base I-class badge means “integrity/control evidence,” not “suspected fraud.”
- Severity is represented independently:
  - informational → info;
  - passed/resolved → success;
  - review required → warning;
  - blocking condition → danger.
- Customer copy must avoid accusatory language unless a separate authorised process supplies it.

## 4. Orthogonality rule

A component may carry both a control class and a status, for example:

```text
F + LOCKED
V + PENDING_REVIEW
D + INFORMATIONAL
O + READY
I + BLOCKED
```

The UI must not collapse those two dimensions into one colour or badge.

## 5. Accessibility rule

Every class treatment uses a visible text label or accessible name. Icons and accent colours are supplementary. Full WCAG certification remains APP-G10; this gate only freezes the semantic mapping.
