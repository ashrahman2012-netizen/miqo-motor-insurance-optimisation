import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";

export const controlClass = pgEnum("control_class", ["F", "V", "D", "O", "I"]);
export const profileVersionStatus = pgEnum("profile_version_status", ["DRAFT", "LOCKED", "SUPERSEDED"]);
export const comparisonState = pgEnum("comparison_state", ["COMPARABLE", "ADJUSTED", "NON_COMPARABLE"]);

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

export const auditEvent = pgTable("audit_event", {
  auditEventId: text("audit_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  traceId: text("trace_id"),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  occurredAt: timestamp("occurred_at", {withTimezone:true}).notNull().defaultNow(),
});
