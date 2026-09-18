export type ControlClass = "F" | "V" | "D" | "O" | "I";
export type ProfileVersionStatus = "DRAFT" | "LOCKED" | "SUPERSEDED";

export type CanonicalValue = {
  fieldId: string;
  controlClass: ControlClass;
  value: unknown;
};

export type RiskProfileVersion = Readonly<{
  id: string;
  version: number;
  status: ProfileVersionStatus;
  values: ReadonlyArray<Readonly<CanonicalValue>>;
}>;

export type ScenarioDelta = Readonly<{
  fieldId: string;
  controlClass: "O";
  value: unknown;
}>;

export type Scenario = Readonly<{
  id: string;
  riskProfileVersionId: string;
  deltas: ReadonlyArray<ScenarioDelta>;
}>;

export type RawProviderResponse = Readonly<{
  id: string;
  scenarioId: string;
  provider: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export type NormalisedQuote = Readonly<{
  id: string;
  rawProviderResponseId: string;
  annualCashPremiumPence: number;
  financeCostPence: number;
  compulsoryExcessPence: number;
  voluntaryExcessPence: number;
  comparisonState: "COMPARABLE" | "ADJUSTED" | "NON_COMPARABLE";
}>;

export function lockProfileVersion(input: Omit<RiskProfileVersion, "status">): RiskProfileVersion {
  return Object.freeze({
    ...input,
    status: "LOCKED" as const,
    values: Object.freeze(input.values.map(v => Object.freeze({...v})))
  });
}

export function createScenario(args: {
  id: string;
  profileVersion: RiskProfileVersion;
  deltas: ReadonlyArray<{fieldId: string; controlClass: ControlClass; value: unknown}>;
}): Scenario {
  if (args.profileVersion.status !== "LOCKED") {
    throw new Error("Scenario requires a LOCKED RiskProfileVersion");
  }

  for (const delta of args.deltas) {
    if (delta.controlClass !== "O") {
      throw new Error(
        `Scenario delta ${delta.fieldId} has control class ${delta.controlClass}; only O is permitted`
      );
    }
  }

  return Object.freeze({
    id: args.id,
    riskProfileVersionId: args.profileVersion.id,
    deltas: Object.freeze(args.deltas.map(d => Object.freeze({
      fieldId: d.fieldId,
      controlClass: "O" as const,
      value: d.value
    })))
  });
}

export function getProfileValue(profile: RiskProfileVersion, fieldId: string): unknown {
  return profile.values.find(v => v.fieldId === fieldId)?.value;
}

export function finalIntegrityCheck(args: {
  profile: RiskProfileVersion;
  observedFacts: ReadonlyArray<{fieldId: string; value: unknown}>;
}): {pass: boolean; mismatches: string[]} {
  const mismatches: string[] = [];

  for (const observed of args.observedFacts) {
    const expected = getProfileValue(args.profile, observed.fieldId);
    if (expected !== observed.value) mismatches.push(observed.fieldId);
  }

  return {pass: mismatches.length === 0, mismatches};
}
