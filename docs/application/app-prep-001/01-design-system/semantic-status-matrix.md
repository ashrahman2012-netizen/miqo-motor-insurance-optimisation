# MIQOS Semantic Status Matrix v1.0

**Gate:** APP-G2  
**Status:** FROZEN

Lifecycle/comparison/environment state must be represented by **label + icon where appropriate + semantic treatment**. Colour alone is insufficient.

| State | Semantic family | Required visual treatment | Notes |
|---|---|---|---|
| PASS | success | teal indicator + PASS text + check icon | Positive control outcome |
| READY | success | teal indicator + READY text | Ready for permitted next action |
| LOCKED | info | cyan/blue lock treatment + LOCKED text + lock icon | Immutability, not “success” |
| DRAFT | neutral | slate treatment + DRAFT text | Editable lifecycle state |
| PENDING | warning | amber treatment + PENDING text | Awaiting action/evidence |
| BLOCKED | danger | rose/red treatment + BLOCKED text + block icon | Action cannot proceed |
| EXCLUDED | neutral | slate treatment + EXCLUDED text + exclusion reason | Exclusion is not automatically an error/fraud signal |
| NOT_COMPARABLE | neutral-attention | neutral/slate badge with explicit reason; optional amber icon | Not eligible for direct ranking |
| DIRECTLY_COMPARABLE | success | teal badge + exact label | Eligible for applicable direct comparison |
| ADJUSTED_COMPARABLE | dormant | never rendered as active ranking state in production v1 | If encountered, display informational/excluded treatment only |
| CERTIFICATION | certification | violet environment treatment + exact label | Environment identity, not success |
| SYNTHETIC | info | blue/cyan environment treatment + exact label | Test-data/test-quote identity |
| NOT_AUTHORISED | danger | rose/red + exact label + lock/block icon | Permission/authorisation boundary |
| SUPERSEDED | neutral | muted slate + SUPERSEDED text | Historical profile version |
| ELIGIBLE | success | teal + ELIGIBLE text | Eligibility under active rule |
| RESOLVED | success | teal + RESOLVED text | Resolved discrepancy/control item |
| INFORMATIONAL | info | cyan/blue + INFORMATIONAL text | Non-blocking information |

## Rules

1. **LOCKED is not mapped to green.** It expresses immutability, not a quality judgment.
2. **EXCLUDED and NOT_COMPARABLE are not mapped to danger by default.** They describe eligibility/comparison state and require a reason.
3. **Integrity signals have independent severity.** The fact that something is I-class does not make it warning/error.
4. **CERTIFICATION and SYNTHETIC are environment identities, not business outcomes.**
5. **PRODUCTION is not a success badge.** It is an environment identity and should be presented neutrally in admin.
6. The UI must display server-supplied reason text where available rather than inventing an explanation from colour/state alone.
