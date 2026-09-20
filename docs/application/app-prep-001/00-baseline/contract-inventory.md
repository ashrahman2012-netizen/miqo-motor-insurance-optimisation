# MIQOS-APP-PREP-001 — API / Application Contract Inventory

**Phase:** P0  
**Gate:** APP-G0

The Fastify API already exposes domain-oriented resources. No formal UI ViewModel package exists yet.

## 1. Profile lifecycle

Current API groups include:

- `POST /profiles`
- `GET /profiles/:profileId`
- `POST /profiles/:profileId/validate`
- `GET /profiles/:profileId/discrepancies`
- `POST /profiles/:profileId/lock`
- `POST /profiles/:profileId/corrections`
- `GET /profiles/:profileId/snapshot`
- factual field and admin profile/version inspection endpoints.

Candidate application contracts:

`ProfileSummaryVM`, `ProfileReviewVM`, `ValidationResultVM`, `DiscrepancyVM`, `ProfileVersionVM`.

## 2. Optimisation and scenario exploration

Current API groups include optimisation preferences, customer objectives, persisted catalogue reads, generated scenarios and Sprint 4 scenario explorations.

Candidate contracts:

`ObjectiveSelectorVM`, `OptimisationCatalogueVM`, `OptimisationControlVM`, `ScenarioExplorationVM`, `ScenarioVM`, `RejectedCombinationVM`.

## 3. Market routes and quote lineage

Current API groups support synthetic market routes, QuoteRequests, raw provider responses and normalisation.

Candidate contracts:

`MarketRouteVM`, `QuoteRunVM`, `QuoteLineageVM`, `NormalisedQuoteVM`.

Provider/channel details are already separated from factual profile/scenario data and should stay that way.

## 4. Comparison and selection

Current APIs create/read shortlists and selections. The comparison package recognises:

- `DIRECTLY_COMPARABLE`
- `ADJUSTED_COMPARABLE`
- `NOT_COMPARABLE`

Certified Sprint 4 logic explicitly excludes `ADJUSTED_COMPARABLE` from recommendation eligibility. Production UI must therefore not present the adjusted state as an active ranking methodology.

Candidate contracts:

`QuoteComparisonVM`, `ComparisonStateVM`, `ShortlistVM`, `SelectionVM`.

## 5. Surfaced results and explanation

Current APIs create/read RecommendationSets and retrieve persisted explanations.

Candidate aggregate:

```text
RecommendationDetailVM
  objective
  surfacedResult
  pricing
  excess
  scenario
  marketRoute
  whyThisSurfaced[]
  alternatives[]
  integrity
  handoff
```

The UI should preserve engineering entities internally while allowing non-advised customer terminology at the presentation layer.

## 6. Admin trace

Current admin APIs expose profile/audit inspection and selection traces, including the Sprint 4 exact provenance path.

Candidate contracts:

`AuditTimelineVM`, `LineageExplorerVM`, `ArtefactInspectorVM`, `IntegrityQueueVM`, `ProviderResponseVM`.

## 7. P0 conclusion

The API is sufficiently domain-oriented to support APP-PREP without reopening persistence architecture. APP-G6 remains intentionally open: P4 must define the typed ViewModel/API mapping and decide whether those contracts live in a shared package or an application-layer module.
