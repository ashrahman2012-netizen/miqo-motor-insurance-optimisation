import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmAndLock,
  createDraftRiskProfileVersion,
  validateDraftProfile
} from "../src/service.ts";

test("Sprint 1 draft validates and locks", () => {
  const draft = createDraftRiskProfileVersion({
    id: "RPV-SYN-001-V1",
    values: [
      {fieldId: "main_driver_id", controlClass: "F", value: "DRV-SYN-001"},
      {fieldId: "annual_mileage", controlClass: "F", value: 8000},
      {fieldId: "licence_held_since", controlClass: "F", value: "2018-04-16"}
    ]
  });

  assert.deepEqual(validateDraftProfile(draft), {valid: true, issues: []});
  const locked = confirmAndLock(draft);
  assert.equal(locked.status, "LOCKED");
  assert.equal(Object.isFrozen(locked), true);
});

test("Sprint 1 cannot lock an incomplete factual profile", () => {
  const draft = createDraftRiskProfileVersion({
    id: "RPV-SYN-BAD-V1",
    values: [{fieldId: "annual_mileage", controlClass: "F", value: 8000}]
  });

  assert.throws(() => confirmAndLock(draft), /cannot be locked/);
});
