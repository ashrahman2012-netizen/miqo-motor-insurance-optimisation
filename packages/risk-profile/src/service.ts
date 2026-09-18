import {
  lockProfileVersion,
  type CanonicalValue,
  type RiskProfileVersion
} from "../../domain/src/model.ts";

export type DraftRiskProfileVersion = {
  id: string;
  version: number;
  status: "DRAFT";
  values: CanonicalValue[];
};

export function createDraftRiskProfileVersion(args: {
  id: string;
  version?: number;
  values: CanonicalValue[];
}): DraftRiskProfileVersion {
  return {
    id: args.id,
    version: args.version ?? 1,
    status: "DRAFT",
    values: args.values.map(v => ({...v}))
  };
}

export function validateDraftProfile(
  draft: DraftRiskProfileVersion
): {valid: boolean; issues: string[]} {
  const required = ["main_driver_id", "annual_mileage", "licence_held_since"];
  const present = new Set(draft.values.map(v => v.fieldId));
  const issues = required.filter(field => !present.has(field)).map(field => `Missing required field: ${field}`);
  return {valid: issues.length === 0, issues};
}

export function confirmAndLock(
  draft: DraftRiskProfileVersion
): RiskProfileVersion {
  const validation = validateDraftProfile(draft);
  if (!validation.valid) {
    throw new Error(`Profile cannot be locked: ${validation.issues.join("; ")}`);
  }

  return lockProfileVersion({
    id: draft.id,
    version: draft.version,
    values: draft.values
  });
}
