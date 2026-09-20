# MIQOS UI State Model v1.0

**Gate:** APP-G12  
**Status:** FROZEN FOR APPLICATION PREPARATION

Every significant page/aggregate must define loading, success, empty, error and blocked behaviour before visual implementation.

## Canonical asynchronous states

```text
IDLE
LOADING
REFRESHING
SUCCESS
EMPTY
PARTIAL
ERROR
BLOCKED
NOT_AUTHORISED
```

- **IDLE:** operation has not started; use only where an explicit action is expected.
- **LOADING:** initial data unresolved; preserve heading/navigation/environment identity and never show fabricated values.
- **REFRESHING:** keep previously valid content visible; do not move focus.
- **SUCCESS:** required data is present and usable.
- **EMPTY:** successful request with no items; explain what is empty, whether expected and the legitimate next action.
- **PARTIAL:** some evidence/routes are available and others are not; identify unavailable items/reasons and do not silently imply completeness.
- **ERROR:** unexpected failure; show readable summary, reference ID where supplied and only safe retry actions.
- **BLOCKED:** backend intentionally prevents progression; explain the rule/control and legitimate corrective action.
- **NOT_AUTHORISED:** authority/environment does not allow the action/view; do not expose protected details.

## Domain-specific states

| State ID | Typical area | Required behaviour |
|---|---|---|
| `NO_PROFILE` | Dashboard/Profile | Offer profile capture where authorised |
| `PROFILE_INCOMPLETE` | Profile | Identify missing factual sections |
| `VALIDATION_FAILED` | Profile | Show issues and correction path |
| `DISCREPANCY_REVIEW_REQUIRED` | Profile | Show evidence/value difference and resolution choices |
| `PROFILE_NOT_LOCKED` | Optimise | Block scenario progression; route to review/lock |
| `NO_OBJECTIVE` | Optimise | Require approved objective selection |
| `NO_SCENARIOS` | Scenarios | Explain prerequisite/generation action |
| `ALL_SCENARIOS_REJECTED` | Scenarios | Show persisted rejection reasons; do not invent fallback |
| `NO_QUOTES` | Quotes | Explain not-run/unavailable/failure condition |
| `PARTIAL_QUOTES` | Quotes | Show received quotes and unavailable-route evidence |
| `ALL_QUOTES_NOT_COMPARABLE` | Quotes | Show quotes and reasons but no ranking |
| `NO_ELIGIBLE_RESULTS` | Results | Show exclusions; no top result is invented |
| `FINAL_INTEGRITY_BLOCKED` | Handoff | Stop progression and show control reason |
| `ENVIRONMENT_UNKNOWN` | Any | Fail closed; no provider-impacting action |
| `PROVIDER_ACTION_NOT_AUTHORISED` | Handoff/Admin | Do not expose an executable action |

## Quote evidence buckets

1. directly comparable/rankable;
2. not comparable/excluded from ranking;
3. unavailable/failed route evidence where applicable.

`ADJUSTED_COMPARABLE`, if encountered in internal/historical data, is not an active production ranking bucket in v1.

## State-transition rules

- UI may react to backend state but cannot upgrade eligibility.
- Empty means a successful empty result, not network failure.
- BLOCKED and ERROR are distinct.
- A refresh cannot turn BLOCKED into SUCCESS without a successful backend response.
- Retry actions must be safe/idempotent or explicitly confirmed.
- Async state changes do not steal focus unless an immediate blocking transition legitimately requires it.

**APP-G12 = PASS**
