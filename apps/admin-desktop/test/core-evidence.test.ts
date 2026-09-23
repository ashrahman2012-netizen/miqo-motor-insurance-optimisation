import {describe, expect, it} from "vitest";
import type {DesktopApiTransport} from "../src/services/contracts";
import {
  loadDesktopProfileEvidence,
  loadDesktopProfileVersionEvidence,
} from "../src/services/admin-profile";

const profileEvidence = {
  versions: [{
    versionId: "RPV-SYN-001-V1",
    versionNo: 1,
    status: "LOCKED" as const,
    lockedAt: "2026-09-20T12:30:00.000Z",
    values: [{
      fieldId: "annual_mileage",
      controlClass: "F" as const,
      value: 8000,
      sourceType: "customer_declared",
      createdAt: "2026-09-20T12:00:00.000Z",
    }],
  }],
  audit: [{
    auditEventId: "AUD-1",
    eventType: "profile_validated",
    entityType: "risk_profile_version",
    entityId: "RPV-SYN-001-V1",
    traceId: "PRO-SYN-001",
    metadataJson: {valid: true, issues: []},
    occurredAt: "2026-09-20T12:20:00.000Z",
  }],
  discrepancies: [{
    discrepancyId: "DIS-1",
    riskProfileVersionId: "RPV-SYN-001-V1",
    fieldId: "annual_mileage",
    declaredValueJson: 8000,
    verifiedValueJson: 9000,
    state: "OPEN",
    blocking: true,
    createdAt: "2026-09-20T12:10:00.000Z",
  }],
};

function transport(): DesktopApiTransport {
  return {
    getRuntimeProfile: async () => { throw new Error("NOT_USED"); },
    getHealth: async () => { throw new Error("NOT_USED"); },
    loadAdminProfile: async () => profileEvidence,
    loadAdminProfileVersion: async versionId => ({
      profileId: "PRO-SYN-001",
      version: {...profileEvidence.versions[0], versionId},
    }),
    loadAdminProfileAudit: async () => ({auditEvents: [], discrepancies: []}),
  };
}

describe("DB-G4 core Admin evidence mapping", () => {
  it("maps profile evidence into a passive Desktop read model", async () => {
    const model = await loadDesktopProfileEvidence(transport(), "PRO-SYN-001");
    expect(model.version).toMatchObject({versionId: "RPV-SYN-001-V1", status: "LOCKED"});
    expect(model.fields[0]).toMatchObject({
      fieldId: "annual_mileage",
      displayValue: "8,000 miles",
      controlClass: "F",
    });
    expect(model.discrepancies[0]).toMatchObject({blocking: true, status: "OPEN"});
    expect(model.validation.valid).toBe(true);

    expect("lockAction" in model).toBe(false);
    expect("resolutionAction" in model.discrepancies[0]).toBe(false);
    expect("editable" in model.fields[0]).toBe(false);
  });

  it("loads an exact profile version without creating mutation authority", async () => {
    const model = await loadDesktopProfileVersionEvidence(transport(), "RPV-SYN-001-V1");
    expect(model.profileId).toBe("PRO-SYN-001");
    expect(model.version.versionId).toBe("RPV-SYN-001-V1");
    expect(model.fields[0]?.controlClass).toBe("F");
  });
});
