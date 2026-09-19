# MIQO-SP4-EXEC-001H — Restart Persistence & Exact Provenance

## Scope

This bounded increment targets S4-G13 only. It adds no customer or admin browser journey, navigation, live-provider behaviour, or final Sprint 4 clean-environment certification.

## Executable acceptance evidence

`apps/api/test/sprint4-restart-provenance-postgres.test.ts` creates a complete synthetic Sprint 4 lineage and captures a canonical provenance snapshot spanning:

- CustomerObjective and locked RiskProfileVersion;
- optimisation catalogue and policy versions;
- scenario exploration, Scenario and ScenarioDelta;
- MarketRoute, QuoteRequest, RawProviderResponse and NormalisedQuote;
- RecommendationSet, RecommendationExplanation and OptimisationExplanation.

The test then closes Fastify, which closes its application-owned PostgreSQL pool, creates a new Fastify application and database client, and re-reads the lineage through the public API. It asserts exact structural equality for identifiers, fingerprints, versions, rules, evidence, and lineage.

Finally, it replays scenario generation, quote orchestration and recommendation creation. All operations must report reuse, and persisted row counts must remain unchanged. This proves restart does not create replacement scenarios, duplicate quote evidence, duplicate recommendation sets, or duplicate explanations.

## Gate mapping

| Gate | Evidence | Status before CI |
| --- | --- | --- |
| S4-G13 | PostgreSQL restart and exact-provenance integration contract | Implemented; certification pending |

S4-G14, S4-G15 and S4-G16 remain open and outside this increment.
