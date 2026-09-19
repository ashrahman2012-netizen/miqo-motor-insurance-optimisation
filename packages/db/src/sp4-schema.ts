import {sql} from "drizzle-orm";
import {boolean,check,integer,jsonb,pgTable,text,timestamp,unique} from "drizzle-orm/pg-core";
import {customerObjective,normalisedQuote,optimisationCatalogueVersion,quoteRequest,riskProfileVersion,scenario} from "./schema.ts";

export const sp4ScenarioLineage=pgTable("sp4_scenario_lineage",{
  scenarioId:text("scenario_id").primaryKey().references(()=>scenario.scenarioId),
  customerObjectiveId:text("customer_objective_id").notNull().references(()=>customerObjective.customerObjectiveId),
  riskProfileVersionId:text("risk_profile_version_id").notNull().references(()=>riskProfileVersion.riskProfileVersionId),
  catalogueVersion:text("catalogue_version").notNull().references(()=>optimisationCatalogueVersion.catalogueVersion),
  policyFingerprint:text("policy_fingerprint").notNull(),
  generationVersion:text("generation_version").notNull(),
  explorationFingerprint:text("exploration_fingerprint").notNull(),
  candidateFingerprint:text("candidate_fingerprint").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("sp4_scenario_lineage_policy_fingerprint_format",sql`${t.policyFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("sp4_scenario_lineage_generation_fingerprint_format",sql`${t.explorationFingerprint} ~ '^[0-9a-f]{64}$' AND ${t.candidateFingerprint} ~ '^[0-9a-f]{64}$'`),
  unique("uq_sp4_scenario_lineage_candidate").on(t.customerObjectiveId,t.explorationFingerprint,t.candidateFingerprint),
]);

export const scenarioGenerationRejection=pgTable("scenario_generation_rejection",{
  scenarioGenerationRejectionId:text("scenario_generation_rejection_id").primaryKey(),
  customerObjectiveId:text("customer_objective_id").notNull().references(()=>customerObjective.customerObjectiveId),
  riskProfileVersionId:text("risk_profile_version_id").notNull().references(()=>riskProfileVersion.riskProfileVersionId),
  catalogueVersion:text("catalogue_version").notNull().references(()=>optimisationCatalogueVersion.catalogueVersion),
  generationVersion:text("generation_version").notNull(),
  explorationFingerprint:text("exploration_fingerprint").notNull(),
  candidateFingerprint:text("candidate_fingerprint").notNull(),
  candidateJson:jsonb("candidate_json").notNull(),
  ruleId:text("rule_id").notNull(),
  category:text("category").notNull(),
  reason:text("reason").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("scenario_generation_rejection_fingerprint_format",sql`${t.explorationFingerprint} ~ '^[0-9a-f]{64}$' AND ${t.candidateFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("scenario_generation_rejection_category",sql`${t.category} IN ('POLICY_INELIGIBLE','IMPOSSIBLE','CONTRADICTORY','NOT_ENABLED')`),
  unique("uq_scenario_generation_rejection").on(t.customerObjectiveId,t.explorationFingerprint,t.candidateFingerprint,t.ruleId),
]);


export const marketRoute=pgTable("market_route",{
  marketRouteId:text("market_route_id").primaryKey(),
  routeKey:text("route_key").notNull().unique(),
  routeCatalogueVersion:text("route_catalogue_version").notNull(),
  providerKey:text("provider_key").notNull(),
  channelKey:text("channel_key").notNull(),
  adapterVersion:text("adapter_version").notNull(),
  mappingVersion:text("mapping_version").notNull(),
  routeFingerprint:text("route_fingerprint").notNull().unique(),
  synthetic:boolean("synthetic").notNull().default(true),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("market_route_fingerprint_format",sql`${t.routeFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("market_route_synthetic_only",sql`${t.synthetic}=true AND ${t.providerKey} LIKE 'MOCK-%' AND ${t.channelKey} IN ('DIRECT_SYNTHETIC','PCW_SYNTHETIC')`),
]);

export const sp4QuoteRequestLineage=pgTable("sp4_quote_request_lineage",{
  quoteRequestId:text("quote_request_id").primaryKey().references(()=>quoteRequest.quoteRequestId),
  marketRouteId:text("market_route_id").notNull().references(()=>marketRoute.marketRouteId),
  customerObjectiveId:text("customer_objective_id").notNull().references(()=>customerObjective.customerObjectiveId),
  scenarioId:text("scenario_id").notNull().references(()=>scenario.scenarioId),
  riskProfileVersionId:text("risk_profile_version_id").notNull().references(()=>riskProfileVersion.riskProfileVersionId),
  routeFingerprint:text("route_fingerprint").notNull(),
  orchestrationVersion:text("orchestration_version").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("sp4_quote_lineage_route_fingerprint_format",sql`${t.routeFingerprint} ~ '^[0-9a-f]{64}$'`),
  unique("uq_sp4_quote_route").on(t.scenarioId,t.marketRouteId),
]);


export const occupationTaxonomyRule=pgTable("occupation_taxonomy_rule",{
  occupationTaxonomyRuleId:text("occupation_taxonomy_rule_id").primaryKey(),
  taxonomyVersion:text("taxonomy_version").notNull(),
  providerKey:text("provider_key").notNull(),
  mappingVersion:text("mapping_version").notNull(),
  canonicalOccupation:text("canonical_occupation").notNull(),
  providerOccupationCode:text("provider_occupation_code").notNull(),
  ruleFingerprint:text("rule_fingerprint").notNull().unique(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("occupation_taxonomy_rule_fingerprint_format",sql`${t.ruleFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("occupation_taxonomy_rule_synthetic_provider",sql`${t.providerKey} LIKE 'MOCK-%'`),
  unique("uq_occupation_taxonomy_rule").on(t.taxonomyVersion,t.providerKey,t.mappingVersion,t.canonicalOccupation),
]);

export const occupationTaxonomyMapping=pgTable("occupation_taxonomy_mapping",{
  occupationTaxonomyMappingId:text("occupation_taxonomy_mapping_id").primaryKey(),
  riskProfileVersionId:text("risk_profile_version_id").notNull().references(()=>riskProfileVersion.riskProfileVersionId),
  marketRouteId:text("market_route_id").notNull().references(()=>marketRoute.marketRouteId),
  occupationTaxonomyRuleId:text("occupation_taxonomy_rule_id").notNull().references(()=>occupationTaxonomyRule.occupationTaxonomyRuleId),
  taxonomyVersion:text("taxonomy_version").notNull(),
  canonicalOccupation:text("canonical_occupation").notNull(),
  providerOccupationCode:text("provider_occupation_code").notNull(),
  ruleFingerprint:text("rule_fingerprint").notNull(),
  mappingFingerprint:text("mapping_fingerprint").notNull().unique(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("occupation_taxonomy_mapping_fingerprint_format",sql`${t.ruleFingerprint} ~ '^[0-9a-f]{64}$' AND ${t.mappingFingerprint} ~ '^[0-9a-f]{64}$'`),
  unique("uq_occupation_taxonomy_mapping").on(t.riskProfileVersionId,t.marketRouteId,t.taxonomyVersion),
]);

export const candidateVehicle=pgTable("candidate_vehicle",{
  candidateVehicleEvidenceId:text("candidate_vehicle_evidence_id").primaryKey(),
  riskProfileVersionId:text("risk_profile_version_id").notNull().references(()=>riskProfileVersion.riskProfileVersionId),
  candidateVehicleId:text("candidate_vehicle_id").notNull(),
  vehicleSnapshotJson:jsonb("vehicle_snapshot_json").notNull(),
  evidenceFingerprint:text("evidence_fingerprint").notNull().unique(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("candidate_vehicle_evidence_fingerprint_format",sql`${t.evidenceFingerprint} ~ '^[0-9a-f]{64}$'`),
  unique("uq_candidate_vehicle_profile").on(t.riskProfileVersionId,t.candidateVehicleId),
]);


export const recommendationSet=pgTable("recommendation_set",{
  recommendationSetId:text("recommendation_set_id").primaryKey(),
  customerObjectiveId:text("customer_objective_id").notNull().references(()=>customerObjective.customerObjectiveId),
  riskProfileVersionId:text("risk_profile_version_id").notNull().references(()=>riskProfileVersion.riskProfileVersionId),
  explorationFingerprint:text("exploration_fingerprint").notNull(),
  objectiveId:text("objective_id").notNull(),
  objectiveVersion:text("objective_version").notNull(),
  catalogueVersion:text("catalogue_version").notNull().references(()=>optimisationCatalogueVersion.catalogueVersion),
  policyFingerprint:text("policy_fingerprint").notNull(),
  recommendationRuleVersion:text("recommendation_rule_version").notNull(),
  recommendationFingerprint:text("recommendation_fingerprint").notNull().unique(),
  surfacedNormalisedQuoteId:text("surfaced_normalised_quote_id").references(()=>normalisedQuote.normalisedQuoteId),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("recommendation_set_exploration_fingerprint_format",sql`${t.explorationFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("recommendation_set_policy_fingerprint_format",sql`${t.policyFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("recommendation_set_fingerprint_format",sql`${t.recommendationFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("recommendation_set_rule_version",sql`${t.recommendationRuleVersion}='sp4-recommendation-v1'`),
  check("recommendation_set_objective_allowed",sql`${t.objectiveId} IN ('LOWEST_ANNUAL_PREMIUM','LOWEST_MONTHLY_COMMITMENT','LOWEST_FINANCE_COST','LOWER_EXCESS_EXPOSURE')`),
  unique("uq_recommendation_set_exploration").on(t.customerObjectiveId,t.explorationFingerprint,t.recommendationRuleVersion),
]);

export const recommendationQuoteEvidence=pgTable("recommendation_quote_evidence",{
  recommendationQuoteEvidenceId:text("recommendation_quote_evidence_id").primaryKey(),
  recommendationSetId:text("recommendation_set_id").notNull().references(()=>recommendationSet.recommendationSetId),
  normalisedQuoteId:text("normalised_quote_id").notNull().references(()=>normalisedQuote.normalisedQuoteId),
  quoteRequestId:text("quote_request_id").notNull().references(()=>quoteRequest.quoteRequestId),
  scenarioId:text("scenario_id").notNull().references(()=>scenario.scenarioId),
  marketRouteId:text("market_route_id").notNull().references(()=>marketRoute.marketRouteId),
  evidenceStatus:text("evidence_status").notNull(),
  ordinal:integer("ordinal"),
  objectiveMetric:text("objective_metric"),
  objectiveMetricValuePence:integer("objective_metric_value_pence"),
  exclusionReason:text("exclusion_reason"),
  evidenceJson:jsonb("evidence_json").notNull().default({}),
  evidenceFingerprint:text("evidence_fingerprint").notNull().unique(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("recommendation_quote_status",sql`${t.evidenceStatus} IN ('ELIGIBLE','EXCLUDED')`),
  check("recommendation_quote_metric_allowed",sql`${t.objectiveMetric} IS NULL OR ${t.objectiveMetric} IN ('annual_cash_premium_pence','monthly_commitment_pence','finance_cost_pence','total_excess_exposure_pence')`),
  check("recommendation_quote_metric_nonnegative",sql`${t.objectiveMetricValuePence} IS NULL OR ${t.objectiveMetricValuePence} >= 0`),
  check("recommendation_quote_ordinal_positive",sql`${t.ordinal} IS NULL OR ${t.ordinal} > 0`),
  check("recommendation_quote_evidence_fingerprint_format",sql`${t.evidenceFingerprint} ~ '^[0-9a-f]{64}$'`),
  unique("uq_recommendation_quote_evidence").on(t.recommendationSetId,t.normalisedQuoteId),
  unique("uq_recommendation_quote_ordinal").on(t.recommendationSetId,t.ordinal),
]);

export const recommendationExplanation=pgTable("recommendation_explanation",{
  recommendationExplanationId:text("recommendation_explanation_id").primaryKey(),
  recommendationSetId:text("recommendation_set_id").notNull().unique().references(()=>recommendationSet.recommendationSetId),
  objectiveId:text("objective_id").notNull(),
  objectiveVersion:text("objective_version").notNull(),
  catalogueVersion:text("catalogue_version").notNull().references(()=>optimisationCatalogueVersion.catalogueVersion),
  policyFingerprint:text("policy_fingerprint").notNull(),
  recommendationRuleVersion:text("recommendation_rule_version").notNull(),
  explanationRuleVersion:text("explanation_rule_version").notNull(),
  surfacedScenarioId:text("surfaced_scenario_id").notNull().references(()=>scenario.scenarioId),
  surfacedMarketRouteId:text("surfaced_market_route_id").notNull().references(()=>marketRoute.marketRouteId),
  surfacedNormalisedQuoteId:text("surfaced_normalised_quote_id").notNull().references(()=>normalisedQuote.normalisedQuoteId),
  eligibleEvidenceJson:jsonb("eligible_evidence_json").notNull(),
  excludedEvidenceJson:jsonb("excluded_evidence_json").notNull(),
  materialReasonsJson:jsonb("material_reasons_json").notNull(),
  explanationFingerprint:text("explanation_fingerprint").notNull().unique(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("recommendation_explanation_policy_fingerprint_format",sql`${t.policyFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("recommendation_explanation_fingerprint_format",sql`${t.explanationFingerprint} ~ '^[0-9a-f]{64}$'`),
  check("recommendation_explanation_rule_version",sql`${t.explanationRuleVersion}='sp4-explainability-v1'`),
]);

export const optimisationExplanation=pgTable("optimisation_explanation",{
  explanationId:text("explanation_id").primaryKey(),
  recommendationSetId:text("recommendation_set_id").notNull().references(()=>recommendationSet.recommendationSetId),
  scenarioId:text("scenario_id").notNull().references(()=>scenario.scenarioId),
  marketRouteId:text("market_route_id").notNull().references(()=>marketRoute.marketRouteId),
  fieldOrControl:text("field_or_control").notNull(),
  classification:text("classification").notNull(),
  source:text("source").notNull(),
  customerCanChange:boolean("customer_can_change").notNull(),
  baselineValue:jsonb("baseline_value"),
  scenarioValue:jsonb("scenario_value"),
  quotedEffectIfObservable:jsonb("quoted_effect_if_observable"),
  legitimacyReason:text("legitimacy_reason").notNull(),
  providerChannelApplicability:jsonb("provider_channel_applicability").notNull(),
  ruleVersion:text("rule_version").notNull(),
  explanationFingerprint:text("explanation_fingerprint").notNull().unique(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[
  check("optimisation_explanation_classification",sql`${t.classification} IN ('FIXED','CONTROLLABLE','TIME_DEPENDENT','PROVIDER_SPECIFIC')`),
  check("optimisation_explanation_rule_version",sql`${t.ruleVersion}='sp4-explainability-v1'`),
  check("optimisation_explanation_fingerprint_format",sql`${t.explanationFingerprint} ~ '^[0-9a-f]{64}$'`),
  unique("uq_optimisation_explanation_control").on(t.recommendationSetId,t.scenarioId,t.marketRouteId,t.fieldOrControl),
]);

