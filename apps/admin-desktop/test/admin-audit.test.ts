import {describe, expect, it} from "vitest";
import {loadDesktopAuditProof} from "../src/services/admin-audit";
import type {
  DesktopAdminProfileAuditEvidence,
  DesktopApiTransport,
  DesktopHealth,
  DesktopRuntimeProfile,
} from "../src/services/contracts";

const runtime: DesktopRuntimeProfile = {
  schemaVersion: "miqos-desktop-config-v1",
  profileId: "test-synthetic",
  deploymentStage: "TEST",
  applicationEnvironment: "SYNTHETIC",
  apiService: "127.0.0.1:4000",
  apiAudience: "miqos-api-test",
  authenticationMode: "NON_PRODUCTION_STUB",
  buildVersion: "0.1.0",
  buildId: "test",
  sourceCommit: "test",
  deploymentProfileSha256: "test",
};

function transport(
  health: DesktopHealth,
  evidence: DesktopAdminProfileAuditEvidence,
): DesktopApiTransport {
  return {
    getRuntimeProfile: async () => runtime,
    getHealth: async () => health,
    loadAdminProfile: async () => ({versions: [], audit: [], discrepancies: []}),
    loadAdminProfileVersion: async () => { throw new Error("NOT_USED"); },
    loadAdminProfileAudit: async () => evidence,
  };
}

describe("Desktop Admin Audit proof service", () => {
  it("composes the existing Admin ViewModel for synthetic audit evidence", async () => {
    const proof = await loadDesktopAuditProof(
      transport(
        {status: "ok", dataClassification: "SYNTHETIC", liveProvidersEnabled: false},
        {
          auditEvents: [{
            auditEventId: "AUD-G8-1",
            eventType: "profile_created",
            entityType: "profile",
            entityId: "PRO-SYN-001",
            traceId: "PRO-SYN-001",
            occurredAt: "2026-09-21T12:00:00.000Z",
            metadataJson: {},
          }],
          discrepancies: [],
        },
      ),
      "PRO-SYN-001",
    );

    expect(proof.viewModel.pageState.state).toBe("PARTIAL");
    expect(proof.viewModel.timeline?.events[0]?.summary).toBe("Profile created");
    expect(proof.health.liveProvidersEnabled).toBe(false);
  });

  it("fails closed on contradictory provider/environment evidence", async () => {
    await expect(loadDesktopAuditProof(
      transport(
        {status: "ok", dataClassification: "PRODUCTION", liveProvidersEnabled: true},
        {auditEvents: [], discrepancies: []},
      ),
      "PRO-SYN-001",
    )).rejects.toThrow("DESKTOP_ENVIRONMENT_ATTESTATION_FAILED");
  });
});
