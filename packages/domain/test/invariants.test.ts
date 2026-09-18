import test from "node:test";
import assert from "node:assert/strict";
import {createScenario, finalIntegrityCheck, lockProfileVersion} from "../src/model.ts";

const locked = lockProfileVersion({
  id: "RPV-SYN-001-V1",
  version: 1,
  values: [
    {fieldId: "annual_mileage", controlClass: "F", value: 8000},
    {fieldId: "main_driver_id", controlClass: "F", value: "DRV-SYN-001"},
    {fieldId: "voluntary_excess", controlClass: "O", value: 250}
  ]
});

test("locked profile is frozen", () => {
  assert.equal(locked.status, "LOCKED");
  assert.equal(Object.isFrozen(locked), true);
  assert.equal(Object.isFrozen(locked.values), true);
});

test("scenario accepts O-class delta", () => {
  const scenario = createScenario({
    id: "SCN-001",
    profileVersion: locked,
    deltas: [{fieldId: "voluntary_excess", controlClass: "O", value: 500}]
  });
  assert.equal(scenario.riskProfileVersionId, locked.id);
  assert.equal(scenario.deltas[0].value, 500);
});

test("scenario rejects factual delta", () => {
  assert.throws(() => createScenario({
    id: "SCN-BAD",
    profileVersion: locked,
    deltas: [{fieldId: "annual_mileage", controlClass: "F", value: 5000}]
  }), /only O is permitted/);
});

test("final integrity detects factual mismatch", () => {
  const result = finalIntegrityCheck({
    profile: locked,
    observedFacts: [
      {fieldId: "annual_mileage", value: 7000},
      {fieldId: "main_driver_id", value: "DRV-SYN-001"}
    ]
  });
  assert.equal(result.pass, false);
  assert.deepEqual(result.mismatches, ["annual_mileage"]);
});
