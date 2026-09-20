# MIQOS State Mapping & Route Guard Contract v1.0

**Gate:** APP-G13  
**Status:** FROZEN FOR APPLICATION PREPARATION

## 1. Principle

Application route guards improve journey integrity and UX. They are **not security/business-rule authority**. APIs remain authoritative and must still reject invalid operations.

## 2. Customer route preconditions

| Route | Presentation precondition | Fallback state/route |
|---|---|---|
| `/dashboard` | environment resolved | `ENVIRONMENT_UNKNOWN` fail-closed state if not |
| `/profile/capture` | applicable profile/version is DRAFT or profile can be created | read-only review/current lifecycle state |
| `/profile/validation` | profile/version exists | `NO_PROFILE` |
| `/profile/discrepancies` | discrepancy evidence exists or review is required | empty resolved state / profile review |
| `/profile/review` | profile/version exists | `NO_PROFILE` |
| `/profile/lock` | validation successful and lock operation available | `VALIDATION_FAILED` / `DISCREPANCY_REVIEW_REQUIRED` / BLOCKED |
| `/optimise/objective` | current applicable version is LOCKED | `PROFILE_NOT_LOCKED` |
| `/optimise/controls` | locked version + approved selected objective | `NO_OBJECTIVE` |
| `/optimise/scenarios` | locked version + objective + valid choice input | BLOCKED/NO_SCENARIOS until generation |
| `/optimise/vehicles` | PRE_PURCHASE applicability | HIDDEN/NOT_AUTHORISED otherwise |
| `/quotes/compare` | quotation evidence exists or quote run can legitimately be started | `NO_QUOTES` / PARTIAL |
| `/results/:resultSetId` | persisted recommendation/result set exists | `NO_ELIGIBLE_RESULTS` or ERROR |
| `/results/:resultSetId/why` | persisted explanation exists | PARTIAL/ERROR; never fabricate explanation |

## 3. Handoff/selection

A selection/handoff action is rendered only from an explicit `ActionAvailabilityVM`.

```text
AVAILABLE
BLOCKED
NOT_AUTHORISED
HIDDEN
```

For the current synthetic prototype, purchase/bind/provider handoff remains unavailable even if a surfaced result exists.

## 4. Error-to-state mapping

| API condition | UI state |
|---|---|
| 404 profile/version/result missing | EMPTY or ERROR depending whether absence is expected |
| 409 domain conflict | BLOCKED |
| 422 validation | BLOCKED with field/reason detail |
| final-integrity 409 + signals | `FINAL_INTEGRITY_BLOCKED` |
| unknown environment | NOT_AUTHORISED / `ENVIRONMENT_UNKNOWN` |
| network/server failure | ERROR |
| successful empty quote set | EMPTY / `NO_QUOTES` |
| some route results + some failures | PARTIAL / `PARTIAL_QUOTES` |
| successful quotes but none directly comparable | EMPTY-like domain state `ALL_QUOTES_NOT_COMPARABLE`, with quote evidence still visible |

## 5. Comparison mapping invariant

Adapters must not convert:

```text
NOT_COMPARABLE → DIRECTLY_COMPARABLE
ADJUSTED_COMPARABLE → DIRECTLY_COMPARABLE
EXCLUDED → ELIGIBLE
BLOCKED → AVAILABLE
```

Any such transition requires new authoritative backend evidence.

## 6. APP-G13 decision

**APP-G13 = PASS**
