import {describe, expect, it} from "vitest";
import type {
  AdminAuditEventApi,
  AdminDiscrepancyApi,
  ProfileDiscrepancyApi,
  ProfileSnapshotApi,
  ProfileVersionApi,
} from "@miqo/application-adapters";
import {loadDesktopAuditProof} from "../src/services/admin-audit";
import {
  loadDesktopProfileEvidence,
  loadDesktopProfileVersionEvidence,
} from "../src/services/admin-profile";
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

  async loadAdminProfile(profileId: string) {
    const response = await fetch(this.baseUrl + "/admin/profiles/" + encodeURIComponent(profileId));
    if (!response.ok) throw new Error(`DESKTOP_API_STATUS_${response.status}`);
    return response.json() as Promise<ProfileSnapshotApi & {discrepancies: ReadonlyArray<ProfileDiscrepancyApi>}>;
  }

  async loadAdminProfileVersion(versionId: string) {
    const response = await fetch(this.baseUrl + "/admin/profile-versions/" + encodeURIComponent(versionId));
    if (!response.ok) throw new Error(`DESKTOP_API_STATUS_${response.status}`);
    return response.json() as Promise<{profileId: string; version: ProfileVersionApi}>;
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

  it("loads exact profile and profile-version evidence through existing Admin reads", async () => {
    const created = await fetch(baseUrl + "/profiles", {method: "POST"});
    expect(created.status).toBe(201);
    const profile = await created.json() as {profileId: string; versionId: string};
    const transport = new FastifyProofTransport(baseUrl);

    const profileEvidence = await loadDesktopProfileEvidence(transport, profile.profileId);
    expect(profileEvidence.profileId).toBe(profile.profileId);
    expect(profileEvidence.version.versionId).toBe(profile.versionId);
    expect(profileEvidence.fields).toEqual([]);

    const versionEvidence = await loadDesktopProfileVersionEvidence(transport, profile.versionId);
    expect(versionEvidence.profileId).toBe(profile.profileId);
    expect(versionEvidence.version.versionId).toBe(profile.versionId);
  });

  it("fails closed when server environment attestation contradicts TEST/SYNTHETIC", async () => {
    const transport: DesktopApiTransport = {
      getRuntimeProfile: () => new FastifyProofTransport(baseUrl).getRuntimeProfile(),
      getHealth: async () => ({
        status: "ok",
        dataClassification: "PRODUCTION",
        liveProvidersEnabled: true,
      }),
      loadAdminProfile: async () => ({versions: [], audit: [], discrepancies: []}),
      loadAdminProfileVersion: async () => { throw new Error("NOT_USED"); },
      loadAdminProfileAudit: async () => ({auditEvents: [], discrepancies: []}),
    };

    await expect(loadDesktopAuditProof(transport, "PRO-SYN-001"))
      .rejects.toThrow("DESKTOP_ENVIRONMENT_ATTESTATION_FAILED");
  });
});
