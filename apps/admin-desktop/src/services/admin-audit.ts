import {composeAdminAuditTracePageVM} from "@miqo/application-adapters";
import type {AdminAuditTraceFiltersVM} from "@miqo/application-contracts";
import type {DesktopApiTransport, DesktopAuditProof} from "./contracts";

const EMPTY_FILTERS: Omit<AdminAuditTraceFiltersVM, "profileId"> = {
  profileVersionId: null,
  recommendationSetId: null,
  selectionId: null,
  scenarioId: null,
  eventType: null,
  dateFrom: null,
  dateTo: null,
};

export async function loadDesktopAuditProof(
  transport: DesktopApiTransport,
  profileId: string,
): Promise<DesktopAuditProof> {
  const runtime = await transport.getRuntimeProfile();

  if (
    runtime.deploymentStage !== "TEST"
    || runtime.applicationEnvironment !== "SYNTHETIC"
    || runtime.profileId !== "test-synthetic"
  ) {
    throw new Error("DESKTOP_ENVIRONMENT_PROFILE_MISMATCH");
  }

  const health = await transport.getHealth();

  if (
    health.status !== "ok"
    || health.dataClassification !== "SYNTHETIC"
    || health.liveProvidersEnabled
  ) {
    throw new Error("DESKTOP_ENVIRONMENT_ATTESTATION_FAILED");
  }

  const evidence = await transport.loadAdminProfileAudit(profileId);

  return {
    runtime,
    health,
    viewModel: composeAdminAuditTracePageVM({
      filters: {profileId, ...EMPTY_FILTERS},
      environment: "SYNTHETIC",
      trace: null,
      auditEvents: evidence.auditEvents,
      rawProviderResponse: null,
      discrepancies: evidence.discrepancies,
    }),
  };
}
