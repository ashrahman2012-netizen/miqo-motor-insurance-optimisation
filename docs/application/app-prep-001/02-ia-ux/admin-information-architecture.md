# MIQOS Admin Information Architecture v1.0

**Programme:** MIQOS-APP-PREP-001  
**Phase:** P2  
**Gate:** APP-G4  
**Status:** FROZEN FOR APPLICATION PREPARATION

The admin application is an operational, audit and certification surface, not the customer app with extra controls.

## Canonical admin areas

Dashboard; Cases; Optimisation; Scenarios; Market Routes; Quote Runs; Recommendation Sets; Integrity; Discrepancies; Audit & Trace; Providers; Certification; System.

## Canonical routes

```text
/admin/dashboard
/admin/cases
/admin/cases/:caseId
/admin/cases/:caseId/profile
/admin/cases/:caseId/profile/:versionId
/admin/optimisation
/admin/optimisation/catalogues/:catalogueVersion
/admin/scenarios
/admin/scenarios/:scenarioId
/admin/market-routes
/admin/market-routes/:marketRouteId
/admin/quote-runs
/admin/quote-runs/:quoteRunId
/admin/quotes/:quoteId
/admin/recommendations
/admin/recommendations/:recommendationSetId
/admin/integrity
/admin/integrity/:integritySignalId
/admin/discrepancies
/admin/discrepancies/:discrepancyId
/admin/audit
/admin/audit/trace/:selectionId
/admin/providers
/admin/providers/:providerKey
/admin/certification
/admin/certification/:certificationId
/admin/system
```

## Audit & Trace lineage

```text
Case / Profile
→ RiskProfileVersion
→ Objective
→ Optimisation choices
→ Scenario
→ MarketRoute
→ QuoteRequest
→ RawProviderResponse
→ NormalisedQuote
→ RecommendationSet
→ Explanation
→ Selection
→ Final Integrity
→ Completion / Handoff
```

Existing prototype profile/audit/selection trace pages map into these areas during build.

P2 freezes navigation only; it does not grant permissions or authorise live provider activation, locked-profile mutation, audit rewriting, ranking overrides, or dormant methodology activation.

**APP-G4 = PASS**
