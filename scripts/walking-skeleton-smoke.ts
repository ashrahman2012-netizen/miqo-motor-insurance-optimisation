import {
  createScenario,
  finalIntegrityCheck,
  lockProfileVersion,
  type RawProviderResponse,
  type NormalisedQuote
} from "../packages/domain/src/model.ts";

const profile = lockProfileVersion({
  id: "RPV-SYN-001-V1",
  version: 1,
  values: [
    {fieldId: "main_driver_id", controlClass: "F", value: "DRV-SYN-001"},
    {fieldId: "annual_mileage", controlClass: "F", value: 8000},
    {fieldId: "overnight_parking", controlClass: "F", value: "DRIVEWAY"},
    {fieldId: "policy_start_date", controlClass: "O", value: "2026-10-01"},
    {fieldId: "voluntary_excess", controlClass: "O", value: 250},
    {fieldId: "payment_method", controlClass: "O", value: "ANNUAL"}
  ]
});

const scenario = createScenario({
  id: "SCN-SYN-001",
  profileVersion: profile,
  deltas: [
    {fieldId: "voluntary_excess", controlClass: "O", value: 350},
    {fieldId: "payment_method", controlClass: "O", value: "ANNUAL"}
  ]
});

const raw: RawProviderResponse = Object.freeze({
  id: "RAW-SYN-001",
  scenarioId: scenario.id,
  provider: "MOCK-A",
  payload: Object.freeze({
    grossPremiumPence: 74218,
    compulsoryExcessPence: 25000,
    voluntaryExcessPence: 35000
  })
});

const normalised: NormalisedQuote = Object.freeze({
  id: "NOR-SYN-001",
  rawProviderResponseId: raw.id,
  annualCashPremiumPence: Number(raw.payload.grossPremiumPence),
  financeCostPence: 0,
  compulsoryExcessPence: Number(raw.payload.compulsoryExcessPence),
  voluntaryExcessPence: Number(raw.payload.voluntaryExcessPence),
  comparisonState: "COMPARABLE"
});

const integrity = finalIntegrityCheck({
  profile,
  observedFacts: [
    {fieldId: "main_driver_id", value: "DRV-SYN-001"},
    {fieldId: "annual_mileage", value: 8000},
    {fieldId: "overnight_parking", value: "DRIVEWAY"}
  ]
});

if (!integrity.pass) throw new Error(`Final integrity failed: ${integrity.mismatches.join(", ")}`);

console.log(JSON.stringify({
  classification: "SYNTHETIC",
  profileVersion: profile.id,
  scenario: scenario.id,
  rawResponse: raw.id,
  normalisedQuote: normalised.id,
  annualCashPremiumPence: normalised.annualCashPremiumPence,
  totalBaseExcessPence: normalised.compulsoryExcessPence + normalised.voluntaryExcessPence,
  finalIntegrity: "PASS"
}, null, 2));
