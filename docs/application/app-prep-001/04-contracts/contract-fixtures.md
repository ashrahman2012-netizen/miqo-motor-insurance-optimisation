# MIQOS Contract Fixtures v1.0

**Gate:** APP-G13  
**Status:** FROZEN

Synthetic ViewModel fixtures are stored under:

```text
packages/application-contracts/fixtures/
```

They are application-contract fixtures, not provider simulations and not real customer data.

## Fixture set

| Fixture | Purpose |
|---|---|
| `profile-review.locked.json` | Locked factual profile review with PASS validation |
| `quote-comparison.mixed.json` | Directly comparable result + not-comparable evidence; no adjusted ranking |
| `result-detail.synthetic.json` | Customer “Your Results / Why This Surfaced” contract with synthetic handoff blocked |
| `admin-lineage.json` | Exact ordered admin trace presentation |
| `final-integrity-blocked.json` | Explicit BLOCKED PageState/Integrity contract |

## Fixture rules

- IDs are synthetic opaque identifiers.
- Money uses integer pence.
- No fixture contains real customer data or live provider credentials.
- Fixtures intentionally carry explicit authoritative states so components do not calculate them.
- `ADJUSTED_COMPARABLE` is not used as an active ranked fixture.
- Fixtures are stable contract examples; BUILD tests may import/copy them but must not treat fixture content as domain truth.

## Acceptance use

P4 fixtures demonstrate that the same component architecture can render:

- happy locked-profile state;
- mixed comparison eligibility;
- result/explanation state;
- admin lineage;
- final-integrity block.

They do not replace target-stack E2E tests.
