import {sql} from "drizzle-orm";
import {check,jsonb,pgTable,text,timestamp,unique} from "drizzle-orm/pg-core";
import {customerObjective,optimisationCatalogueVersion,riskProfileVersion,scenario} from "./schema.ts";

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
