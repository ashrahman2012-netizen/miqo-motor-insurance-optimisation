import {describe, expect, it} from "vitest";
import type {
  AdminAuditEventApi,
  AdminDiscrepancyApi,
} from "@miqo/application-adapters";
import {loadDesktopAuditProof} from "../src/services/admin-audit";
import type {
  DesktopAdminProfileAuditEvidence,
  DesktopApiTransport,
  DesktopHealth,
  DesktopRuntimeProfile,
} from "../src/services/contracts";

const apiUrl = process.env.MIQO_G8_API_URL?.replace(/\/$/, "") ?? null;

class FastifyProofTransport implements DesktopApiTransport {
  constructor(private readonly baseUrl: string) {}

  async getRuntimeProfile(): Promise<DesktopRuntimeProfile> {
    return {
      schemaVersion: "miqos-desktop-config-v1",
      profileId: "test-synthetic",
      deploymentStage: "TEST",
      applicationEnvironment: "SYNTHETIC",
      apiService: "127.0.0.1:4000",
      apiAudience: "miqos-api-test",
      authenticationMode: "NON_PRODUCTION_STUB",
      buildVersion: "0.1.0",
      buildId: "g8-api-integration",
      sourceCommit: "integration-test",
      deploymentProfileSha256: "integration-test",
    };
  }

  async getHealth(): Promise<DesktopHealth> {
    const response = await fetch(this.baseUrl + "/health");
    if (!response.ok) throw new Error("G8_HEALTH_REQUEST_FAILED");
    return response.json() as Promise<DesktopHealth>;
  }

  async loadAdminProfileAudit(profileId: string): Promise<DesktopAdminProfileAuditEvidence> {
    const [auditResponse, discrepancyResponse] = await Promise.all([
      fetch(this.baseUrl + "/admin/audit?profileId=" + encodeURIComponent(profileId)),
      fetch(this.baseUrl + "/profiles/" + encodeURIComponent(profileId) + "/discrepancies"),
    ]);
    if (!auditResponse.ok || !discrepancyResponse.ok) {
      throw new Error("G8_ADMIN_AUDIT_REQUEST_FAILED");
    }
    const audit = await auditResponse.json() as {items: ReadonlyArray<AdminAuditEventApi>};
    const discrepancies = await discrepancyResponse.json() as {items: ReadonlyArray<AdminDiscrepancyApi>};
    return {auditEvents: audit.items, discrepancies: discrepancies.items};
  }
}

describe.skipIf(!apiUrl)("G8 Desktop application service against certified Fastify API", () => {
  const baseUrl = apiUrl as string;

  it("attests SYNTHETIC and composes the existing Admin Audit ViewModel", async () => {
    const created = await fetch(baseUrl + "/profiles", {method: "POST"});
    expect(created.status).toBe(201);
    const profile = await created.json() as {profileId: string};

    const proof = await loadDesktopAuditProof(
      new FastifyProofTransport(baseUrl),
      profile.profileId,
    );

    expect(proof.runtime.applicationEnvironment).toBe("SYNTHETIC");
    expect(proof.health).toEqual({
      status: "ok",
      dataClassification: "SYNTHETIC",
      liveProvidersEnabled: false,
    });
    expect(proof.viewModel.filters.profileId).toBe(profile.profileId);
    expect(proof.viewModel.timeline?.events.some(
      event => event.eventType === "profile_created",
    )).toBe(true);
    expect(proof.viewModel.pageState.state).toBe("PARTIAL");
  });

  it("fails closed when server environment attestation contradicts TEST/SYNTHETIC", async () => {
    const transport: DesktopApiTransport = {
      getRuntimeProfile: () => new FastifyProofTransport(baseUrl).getRuntimeProfile(),
      getHealth: async () => ({
        status: "ok",
        dataClassification: "PRODUCTION",
        liveProvidersEnabled: true,
      }),
      loadAdminProfileAudit: async () => ({auditEvents: [], discrepancies: []}),
    };

    await expect(loadDesktopAuditProof(transport, "PRO-SYN-001"))
      .rejects.toThrow("DESKTOP_ENVIRONMENT_ATTESTATION_FAILED");
  });
});
