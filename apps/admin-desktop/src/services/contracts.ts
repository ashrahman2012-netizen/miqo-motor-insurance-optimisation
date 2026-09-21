import type {AdminAuditEventApi, AdminDiscrepancyApi} from "@miqo/application-adapters";
import type {AdminAuditTracePageVM} from "@miqo/application-contracts";

export interface DesktopRuntimeProfile {
  readonly schemaVersion: "miqos-desktop-config-v1";
  readonly profileId: "test-synthetic";
  readonly deploymentStage: "TEST";
  readonly applicationEnvironment: "SYNTHETIC";
  readonly apiService: string;
  readonly apiAudience: string;
  readonly authenticationMode: "NON_PRODUCTION_STUB";
  readonly buildVersion: string;
  readonly buildId: string;
  readonly sourceCommit: string;
  readonly deploymentProfileSha256: string;
}

export interface DesktopHealth {
  readonly status: string;
  readonly dataClassification: string;
  readonly liveProvidersEnabled: boolean;
}

export interface DesktopAdminProfileAuditEvidence {
  readonly auditEvents: ReadonlyArray<AdminAuditEventApi>;
  readonly discrepancies: ReadonlyArray<AdminDiscrepancyApi>;
}

export interface DesktopApiTransport {
  getRuntimeProfile(): Promise<DesktopRuntimeProfile>;
  getHealth(): Promise<DesktopHealth>;
  loadAdminProfileAudit(profileId: string): Promise<DesktopAdminProfileAuditEvidence>;
}

export interface DesktopAuditProof {
  readonly runtime: DesktopRuntimeProfile;
  readonly health: DesktopHealth;
  readonly viewModel: AdminAuditTracePageVM;
}
