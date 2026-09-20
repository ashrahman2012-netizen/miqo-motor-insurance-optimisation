# MIQOS API → ViewModel Mapping Matrix v1.0

**Gate:** APP-G6  
**Status:** FROZEN

The current Fastify resources remain domain-oriented. P4 freezes how application loaders/adapters compose them into typed presentation models without requiring an API redesign.

| Application surface | Current API evidence | Target ViewModel | Adapter responsibility |
|---|---|---|---|
| Profile review | `GET /profiles/:profileId`, `POST /profiles/:profileId/validate`, `GET /profiles/:profileId/discrepancies` | `ProfileReviewVM` | Select applicable version, label fields, preserve F/V/D/O/I class, map validation/discrepancy state |
| Profile lock | profile validation + `POST /profiles/:profileId/lock` | `ActionAvailabilityVM` + updated `ProfileVersionVM` | Expose backend-authorised lock state; never bypass validation |
| Objectives | `GET/POST /profile-versions/:versionId/customer-objectives`, `GET /optimisation/catalogues/:catalogueVersion` | `ObjectiveSelectorVM` | Present approved executable objectives; dormant objective stays non-executable |
| Optimisation controls | catalogue + preferences endpoints | `OptimisationControlVM[]` | Convert permitted values to presentation options; never classify facts as O |
| Scenarios | scenario-exploration POST/GET | `ScenarioExplorationVM` | Preserve scenario IDs, generation versions, O-class deltas and rejection reasons |
| Market-route quotations | market-route quote POST/GET | quote-source inputs for `QuoteComparisonVM` | Preserve route/provider/channel lineage and unavailable-route evidence |
| Quote comparison | normalised quote + recommendation evidence | `QuoteComparisonVM` | Bucket authoritative directly-comparable/not-comparable/unavailable evidence; preserve server ordering |
| Your Results | recommendation set + `GET /recommendations/:recommendationSetId/explanation` | `ResultDetailVM` | Rename presentation concepts only; preserve source recommendation ID/fingerprints/ordering |
| Selection/final integrity | shortlist/selection endpoints | `IntegrityVM`, `HandoffVM` | Reflect PASS/BLOCKED and action authority; never infer safety from signal count |
| Customer activity | profile snapshot/audit projection | `AuditTimelineVM` | Customer-readable summaries from append-only events |
| Admin trace | `GET /admin/selections/:selectionId/sp4-trace` | `LineageExplorerVM` | Convert exact persisted lineage to ordered nodes without altering IDs/versions |
| Admin audit | `GET /admin/audit?profileId=...` | `AuditTimelineVM` | Chronological event presentation |

## Mapping rules

1. **IDs remain opaque strings.** No UI meaning is inferred from prefixes.
2. **Dates are ISO strings at the ViewModel boundary.** Adapters format for locale only at display time.
3. **Money remains integer pence** in contracts; formatting belongs to presentation.
4. **Unknown/missing fields do not silently become zero/false.**
5. **Reasons are preserved.** Backend validation, rejection, exclusion and integrity reasons take priority over frontend-generated copy.
6. **Ordering is preserved.** Objective-specific ordinal is not recomputed in React.
7. **Raw and normalised provider artefacts remain distinct** in admin contracts.
8. **Provider identity is data.** No provider-specific ViewModel types.
9. **Environment is trusted server/application context**, not a client-selectable field.
10. **Error responses map to explicit PageStateVM states**, not generic empty data.
