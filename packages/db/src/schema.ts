import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";

export const controlClass = pgEnum("control_class", ["F", "V", "D", "O", "I"]);
export const profileVersionStatus = pgEnum("profile_version_status", ["DRAFT", "LOCKED", "SUPERSEDED"]);
export const comparisonState = pgEnum("comparison_state", ["DIRECTLY_COMPARABLE", "ADJUSTED_COMPARABLE", "NOT_COMPARABLE"]);

export const customer = pgTable("customer", {
  customerId: text("customer_id").primaryKey(),
  synthetic: boolean("synthetic").notNull().default(true),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [check("customer_synthetic_only", sql`${t.synthetic} = true`)]);

export const profile = pgTable("profile", {
  profileId: text("profile_id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customer.customerId),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
});

export const riskProfileVersion = pgTable("risk_profile_version", {
  riskProfileVersionId: text("risk_profile_version_id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profile.profileId),
  versionNo: integer("version_no").notNull(),
  status: profileVersionStatus("status").notNull(),
  lockedAt: timestamp("locked_at", {withTimezone:true}),
}, t => [
  uniqueIndex("uq_profile_version_number").on(t.profileId,t.versionNo),
]);

export const canonicalFieldValue = pgTable("canonical_field_value", {
  canonicalFieldValueId: text("canonical_field_value_id").primaryKey(),
  riskProfileVersionId: text("risk_profile_version_id").notNull().references(() => riskProfileVersion.riskProfileVersionId),
  fieldId: text("field_id").notNull(),
  controlClass: controlClass("control_class").notNull(),
  valueJson: jsonb("value_json").notNull(),
  sourceType: text("source_type").notNull(),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [uniqueIndex("uq_version_field").on(t.riskProfileVersionId,t.fieldId)]);

export const discrepancy = pgTable("discrepancy", {
  discrepancyId: text("discrepancy_id").primaryKey(),
  riskProfileVersionId: text("risk_profile_version_id").notNull().references(() => riskProfileVersion.riskProfileVersionId),
  fieldId: text("field_id").notNull(),
  declaredValueJson: jsonb("declared_value_json"),
  verifiedValueJson: jsonb("verified_value_json"),
  state: text("state").notNull(),
  blocking: boolean("blocking").notNull().default(false),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
});

export const optimisationPreference = pgTable("optimisation_preference", {
  optimisationPreferenceId: text("optimisation_preference_id").primaryKey(),
  riskProfileVersionId: text("risk_profile_version_id").notNull().references(() => riskProfileVersion.riskProfileVersionId),
  preferenceKey: text("preference_key").notNull(),
  valueJson: jsonb("value_json").notNull(),
  frozenAt: timestamp("frozen_at", {withTimezone:true}),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  unique("uq_optimisation_preference_version_key").on(t.riskProfileVersionId,t.preferenceKey),
  check("optimisation_preference_key_allowed", sql`${t.preferenceKey} IN ('voluntary_excess','payment_structure','policy_start_date','telematics_preference','genuine_named_driver_inclusion')`),
]);

export const scenario = pgTable("scenario", {
  scenarioId: text("scenario_id").primaryKey(),
  riskProfileVersionId: text("risk_profile_version_id").notNull().references(() => riskProfileVersion.riskProfileVersionId),
  optimisationPreferenceId: text("optimisation_preference_id").references(() => optimisationPreference.optimisationPreferenceId),
  generationVersion: text("generation_version"),
  generatedAt: timestamp("generated_at", {withTimezone:true}),
  preferenceSnapshotJson: jsonb("preference_snapshot_json"),
  generationFingerprint: text("generation_fingerprint"),
  generationOrdinal: integer("generation_ordinal"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
});

export const scenarioDelta = pgTable("scenario_delta", {
  scenarioDeltaId: text("scenario_delta_id").primaryKey(),
  scenarioId: text("scenario_id").notNull().references(() => scenario.scenarioId, {onDelete:"cascade"}),
  fieldId: text("field_id").notNull(),
  controlClass: controlClass("control_class").notNull(),
  valueJson: jsonb("value_json").notNull(),
}, t => [
  check("scenario_delta_o_only", sql`${t.controlClass} = 'O'`),
  check("scenario_delta_approved_o_field", sql`${t.fieldId} IN ('voluntary_excess','payment_structure','policy_start_date','telematics_preference','genuine_named_driver_inclusion')`),
]);

export const quoteRun = pgTable("quote_run", {
  quoteRunId: text("quote_run_id").primaryKey(),
  riskProfileVersionId: text("risk_profile_version_id").notNull().references(() => riskProfileVersion.riskProfileVersionId),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
});

export const quoteRequest = pgTable("quote_request", {
  quoteRequestId: text("quote_request_id").primaryKey(),
  quoteRunId: text("quote_run_id").notNull().references(() => quoteRun.quoteRunId),
  scenarioId: text("scenario_id").notNull().references(() => scenario.scenarioId),
  providerKey: text("provider_key").notNull(),
  channelKey: text("channel_key").notNull(),
  adapterVersion: text("adapter_version").notNull(),
  mappingVersion: text("mapping_version").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_quote_request_fingerprint").on(t.requestFingerprint),
  check("quote_request_synthetic_provider", sql`${t.providerKey} LIKE 'MOCK-%'`),
  check("quote_request_synthetic_channel", sql`${t.channelKey} = 'DIRECT_SYNTHETIC'`),
]);

export const rawProviderResponse = pgTable("raw_provider_response", {
  rawProviderResponseId: text("raw_provider_response_id").primaryKey(),
  quoteRequestId: text("quote_request_id").notNull().references(() => quoteRequest.quoteRequestId),
  payloadJson: jsonb("payload_json").notNull(),
  payloadText: text("payload_text"),
  payloadSha256: text("payload_sha256"),
  providerReference: text("provider_reference"),
  providerResponseAt: timestamp("provider_response_at", {withTimezone:true}),
  receivedAt: timestamp("received_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_raw_provider_response_quote_request").on(t.quoteRequestId),
  check("raw_provider_payload_sha256_format", sql`${t.payloadSha256} IS NULL OR ${t.payloadSha256} ~ '^[0-9a-f]{64}
  integritySignalId: text("integrity_signal_id").primaryKey(),
  stage: text("stage").notNull(),
  ruleId: text("rule_id").notNull(),
  riskProfileVersionId: text("risk_profile_version_id").references(() => riskProfileVersion.riskProfileVersionId),
  scenarioId: text("scenario_id").references(() => scenario.scenarioId),
  normalisedQuoteId: text("normalised_quote_id"),
  state: text("state").notNull(),
  blocking: boolean("blocking").notNull().default(false),
  evidenceJson: jsonb("evidence_json").notNull().default({}),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
});

export const auditEvent = pgTable("audit_event", {
  auditEventId: text("audit_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  traceId: text("trace_id"),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  occurredAt: timestamp("occurred_at", {withTimezone:true}).notNull().defaultNow(),
});
`),
  check("raw_provider_payload_text_nonempty", sql`${t.payloadText} IS NULL OR length(${t.payloadText}) > 0`),
]);

export const normalisedQuote = pgTable("normalised_quote", {
  normalisedQuoteId: text("normalised_quote_id").primaryKey(),
  rawProviderResponseId: text("raw_provider_response_id").notNull().references(() => rawProviderResponse.rawProviderResponseId),
  normalisationVersion: text("normalisation_version").notNull(),
  annualCashPremiumPence: integer("annual_cash_premium_pence"),
  financeCostPence: integer("finance_cost_pence"),
  compulsoryExcessPence: integer("compulsory_excess_pence"),
  voluntaryExcessPence: integer("voluntary_excess_pence"),
  comparisonState: comparisonState("comparison_state").notNull(),
  comparisonReason: text("comparison_reason"),
  normalisationFingerprint: text("normalisation_fingerprint"),
  normalisedAt: timestamp("normalised_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_normalised_quote_raw_version").on(t.rawProviderResponseId,t.normalisationVersion),
  uniqueIndex("uq_normalised_quote_fingerprint").on(t.normalisationFingerprint),
]);

export const shortlist = pgTable("shortlist", {
  shortlistId: text("shortlist_id").primaryKey(),
  riskProfileVersionId: text("risk_profile_version_id").notNull().references(() => riskProfileVersion.riskProfileVersionId),
  comparisonRuleVersion: text("comparison_rule_version").notNull(),
  comparisonFingerprint: text("comparison_fingerprint").notNull(),
  generatedAt: timestamp("generated_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_shortlist_version_fingerprint").on(t.riskProfileVersionId,t.comparisonFingerprint),
]);

export const shortlistEntry = pgTable("shortlist_entry", {
  shortlistEntryId: text("shortlist_entry_id").primaryKey(),
  shortlistId: text("shortlist_id").notNull().references(() => shortlist.shortlistId),
  normalisedQuoteId: text("normalised_quote_id").notNull().references(() => normalisedQuote.normalisedQuoteId),
  ordinal: integer("ordinal").notNull(),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  unique("uq_shortlist_entry_quote").on(t.shortlistId,t.normalisedQuoteId),
  unique("uq_shortlist_entry_ordinal").on(t.shortlistId,t.ordinal),
  check("shortlist_entry_ordinal_positive", sql`${t.ordinal} > 0`),
]);

export const selection = pgTable("selection", {
  selectionId: text("selection_id").primaryKey(),
  shortlistId: text("shortlist_id").notNull().references(() => shortlist.shortlistId),
  normalisedQuoteId: text("normalised_quote_id").notNull().references(() => normalisedQuote.normalisedQuoteId),
  scenarioId: text("scenario_id").notNull().references(() => scenario.scenarioId),
  quoteRequestId: text("quote_request_id").notNull().references(() => quoteRequest.quoteRequestId),
  riskProfileVersionId: text("risk_profile_version_id").notNull().references(() => riskProfileVersion.riskProfileVersionId),
  status: text("status").notNull(),
  selectedAt: timestamp("selected_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_selection_shortlist").on(t.shortlistId),
  check("selection_status_allowed", sql`${t.status} IN ('ACCEPTED','BLOCKED')`),
]);

export const finalIntegrityResult = pgTable("final_integrity_result", {
  finalIntegrityResultId: text("final_integrity_result_id").primaryKey(),
  selectionId: text("selection_id").notNull().references(() => selection.selectionId),
  integrityRuleVersion: text("integrity_rule_version").notNull(),
  outcome: text("outcome").notNull(),
  evidenceJson: jsonb("evidence_json").notNull().default({}),
  evaluatedAt: timestamp("evaluated_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_final_integrity_selection").on(t.selectionId),
  check("final_integrity_outcome_allowed", sql`${t.outcome} IN ('PASS','BLOCKED')`),
]);

export const prototypeCompletion = pgTable("prototype_completion", {
  prototypeCompletionId: text("prototype_completion_id").primaryKey(),
  selectionId: text("selection_id").notNull().references(() => selection.selectionId),
  profileId: text("profile_id").notNull().references(() => profile.profileId),
  status: text("status").notNull(),
  dataClassification: text("data_classification").notNull(),
  liveProviderActivity: text("live_provider_activity").notNull(),
  completedAt: timestamp("completed_at", {withTimezone:true}).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_prototype_completion_selection").on(t.selectionId),
  check("prototype_completion_status", sql`${t.status} = 'PROTOTYPE_JOURNEY_COMPLETE'`),
  check("prototype_completion_synthetic", sql`${t.dataClassification} = 'SYNTHETIC'`),
  check("prototype_completion_live_disabled", sql`${t.liveProviderActivity} = 'DISABLED'`),
]);

export const integritySignal = pgTable("integrity_signal", {
  integritySignalId: text("integrity_signal_id").primaryKey(),
  stage: text("stage").notNull(),
  ruleId: text("rule_id").notNull(),
  riskProfileVersionId: text("risk_profile_version_id").references(() => riskProfileVersion.riskProfileVersionId),
  scenarioId: text("scenario_id").references(() => scenario.scenarioId),
  normalisedQuoteId: text("normalised_quote_id"),
  state: text("state").notNull(),
  blocking: boolean("blocking").notNull().default(false),
  evidenceJson: jsonb("evidence_json").notNull().default({}),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
});

export const auditEvent = pgTable("audit_event", {
  auditEventId: text("audit_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  traceId: text("trace_id"),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  occurredAt: timestamp("occurred_at", {withTimezone:true}).notNull().defaultNow(),
});
