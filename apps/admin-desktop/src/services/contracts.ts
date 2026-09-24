import type {
  AdminAuditEventApi,
  AdminDiscrepancyApi,
  AdminRawProviderResponseApi,
  AdminSprint4TraceApi,
  ProfileDiscrepancyApi,
  ProfileSnapshotApi,
  ProfileVersionApi,
} from "@miqo/application-adapters";
import type {AdminAuditTracePageVM} from "@miqo/application-contracts";

export interface DesktopRuntimeProfile {
  readonly schemaVersion: "miqos-desktop-config-v1";
  readonly profileId: "test-synthetic";
  readonly deploymentStage: "TEST";
  readonly applicationEnvironment: "SYNTHETIC";
  readonly apiService: string;
  readonly apiAudience: string;
  readonly authenticationMode: "NATIVE_OIDC_PKCE";
  readonly buildVersion: string;
  readonly buildId: string;
  readonly sourceCommit: string;
  readonly deploymentProfileSha256: string;
}


export type DesktopSessionState =
  | "SIGNED_OUT"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "REAUTH_REQUIRED"
  | "NOT_AUTHORISED"
  | "EXPIRED"
  | "ERROR";

export interface DesktopSessionDescriptor {
  readonly subjectId: string;
  readonly displayName: string;
  readonly environment: string;
  readonly permissions: ReadonlyArray<string>;
  readonly sessionExpiresAt: string;
  readonly authenticationContext: Readonly<Record<string, unknown>>;
}

export interface DesktopAuthSession {
  readonly state: DesktopSessionState;
  readonly descriptor: DesktopSessionDescriptor | null;
}

export interface DesktopAuthTransport {
  getAuthSession(): Promise<DesktopAuthSession>;
  beginAuthentication(): Promise<DesktopAuthSession>;
  logout(): Promise<DesktopAuthSession>;
}

export interface DesktopHealth {
  readonly status: string;
  readonly dataClassification: string;
  readonly liveProvidersEnabled: boolean;
}

export interface DesktopAdminProfileEvidence extends ProfileSnapshotApi {
  readonly discrepancies: ReadonlyArray<ProfileDiscrepancyApi>;
}

export interface DesktopAdminProfileVersionEvidence {
  readonly profileId: string;
  readonly version: ProfileVersionApi;
}

export interface DesktopAdminProfileAuditEvidence {
  readonly auditEvents: ReadonlyArray<AdminAuditEventApi>;
  readonly discrepancies: ReadonlyArray<AdminDiscrepancyApi>;
}

export interface DesktopAdminSelectionTraceEvidence {
  readonly trace: AdminSprint4TraceApi;
  readonly auditEvents: ReadonlyArray<AdminAuditEventApi>;
  readonly discrepancies: ReadonlyArray<AdminDiscrepancyApi>;
  readonly rawProviderResponse: AdminRawProviderResponseApi | null;
}

export interface DesktopApiTransport {
  getRuntimeProfile(): Promise<DesktopRuntimeProfile>;
  getHealth(): Promise<DesktopHealth>;
  loadAdminProfile(profileId: string): Promise<DesktopAdminProfileEvidence>;
  loadAdminProfileVersion(versionId: string): Promise<DesktopAdminProfileVersionEvidence>;
  loadAdminProfileAudit(profileId: string): Promise<DesktopAdminProfileAuditEvidence>;
  loadAdminSelectionTrace(selectionId: string): Promise<DesktopAdminSelectionTraceEvidence>;
}

export interface DesktopAuditProof {
  readonly runtime: DesktopRuntimeProfile;
  readonly health: DesktopHealth;
  readonly viewModel: AdminAuditTracePageVM;
}

export interface DesktopDecisionTraceProof {
  readonly runtime: DesktopRuntimeProfile;
  readonly health: DesktopHealth;
  readonly trace: AdminSprint4TraceApi;
  readonly viewModel: AdminAuditTracePageVM;
}

export interface DesktopDiagnostics {
  readonly productName: string;
  readonly appVersion: string;
  readonly buildId: string;
  readonly sourceCommit: string;
  readonly packageArchitecture: string;
  readonly deploymentStage: string;
  readonly applicationEnvironment: string;
  readonly deploymentProfileId: string;
  readonly deploymentProfileSha256: string;
  readonly apiService: string;
  readonly apiHealthStatus: string;
  readonly apiServiceVersion: string | null;
  readonly apiBuildId: string | null;
  readonly apiSourceCommit: string | null;
  readonly sessionCorrelationId: string;
  readonly lastTraceId: string | null;
  readonly lastServerRequestId: string | null;
  readonly lastOperation: string | null;
  readonly lastReasonCode: string | null;
  readonly logDirectoryStatus: string;
  readonly logFileCount: number;
  readonly logTotalBytes: number;
  readonly logRetentionMaxFiles: number;
  readonly logRetentionMaxAgeDays: number;
  readonly supportSnapshotAvailable: boolean;
}

export interface DesktopSupportSnapshot {
  readonly schemaVersion: "miqos-desktop-support-snapshot-v1";
  readonly createdAtUtc: string;
  readonly supportReference: string;
  readonly evidenceScope: "REDACTED_DIAGNOSTIC_METADATA_ONLY";
  readonly diagnostics: DesktopDiagnostics;
  readonly excludedCategories: ReadonlyArray<string>;
  readonly sha256: string;
}

export interface DesktopSupportTransport {
  getDiagnostics(): Promise<DesktopDiagnostics>;
  createSupportSnapshot(): Promise<DesktopSupportSnapshot>;
}
