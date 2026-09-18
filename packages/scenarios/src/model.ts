import type { ControlClass, RiskProfileVersion } from "../../domain/src/model.ts";

export const OPTIMISATION_PREFERENCE_KEYS = [
  "voluntary_excess",
  "payment_structure",
  "policy_start_date",
  "telematics_preference",
  "genuine_named_driver_inclusion",
] as const;

export type OptimisationPreferenceKey = typeof OPTIMISATION_PREFERENCE_KEYS[number];

export type OptimisationPreference = Readonly<{
  id: string;
  riskProfileVersionId: string;
  key: OptimisationPreferenceKey;
  value: unknown;
  createdAt: Date;
}>;

export type GeneratedScenario = Readonly<{
  id: string;
  riskProfileVersionId: string;
  optimisationPreferenceId: string;
  generationVersion: string;
  generatedAt: Date;
  deltas: ReadonlyArray<Readonly<{
    fieldId: OptimisationPreferenceKey;
    controlClass: "O";
    value: unknown;
  }>>;
}>;

function isPreferenceKey(value: string): value is OptimisationPreferenceKey {
  return (OPTIMISATION_PREFERENCE_KEYS as readonly string[]).includes(value);
}

export function createOptimisationPreference(args: {
  id: string;
  profileVersion: RiskProfileVersion;
  key: string;
  value: unknown;
  createdAt?: Date;
}): OptimisationPreference {
  if (args.profileVersion.status !== "LOCKED") {
    throw new Error("Optimisation preferences require a LOCKED RiskProfileVersion");
  }
  if (!isPreferenceKey(args.key)) {
    throw new Error(`Preference ${args.key} is not an approved O-class optimisation control`);
  }
  return Object.freeze({
    id: args.id,
    riskProfileVersionId: args.profileVersion.id,
    key: args.key,
    value: args.value,
    createdAt: args.createdAt ?? new Date(),
  });
}

export function generateScenario(args: {
  id: string;
  profileVersion: RiskProfileVersion;
  preference: OptimisationPreference;
  generationVersion: string;
  generatedAt?: Date;
  deltas: ReadonlyArray<{fieldId: string; controlClass: ControlClass; value: unknown}>;
}): GeneratedScenario {
  if (args.profileVersion.status !== "LOCKED") {
    throw new Error("Scenario generation requires a LOCKED RiskProfileVersion");
  }
  if (args.preference.riskProfileVersionId !== args.profileVersion.id) {
    throw new Error("Scenario preference must reference the same RiskProfileVersion");
  }
  if (!args.generationVersion.trim()) throw new Error("Scenario generation version is required");
  for (const delta of args.deltas) {
    if (delta.controlClass !== "O" || !isPreferenceKey(delta.fieldId)) {
      throw new Error(`Scenario delta ${delta.fieldId} is not an approved O-class optimisation control`);
    }
  }
  return Object.freeze({
    id: args.id,
    riskProfileVersionId: args.profileVersion.id,
    optimisationPreferenceId: args.preference.id,
    generationVersion: args.generationVersion,
    generatedAt: args.generatedAt ?? new Date(),
    deltas: Object.freeze(args.deltas.map(delta=>Object.freeze({
      fieldId: delta.fieldId as OptimisationPreferenceKey,
      controlClass: "O" as const,
      value: delta.value,
    }))),
  });
}
