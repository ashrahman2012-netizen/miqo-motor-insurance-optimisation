import {composeProfileLifecycleVM} from "@miqo/application-adapters";
import type {
  ControlClass,
  ProfileVersionStatus,
  ValidationIssueVM,
} from "@miqo/application-contracts";
import type {DesktopApiTransport} from "./contracts";

export interface DesktopProfileVersionEvidence {
  readonly versionId: string;
  readonly versionNo: number;
  readonly status: ProfileVersionStatus;
  readonly lockedAt: string | null;
  readonly current: boolean;
}

export interface DesktopProfileFieldEvidence {
  readonly fieldId: string;
  readonly label: string;
  readonly controlClass: ControlClass;
  readonly displayValue: string;
  readonly sourceType: string | null;
  readonly provenanceAvailable: boolean;
}

export interface DesktopValidationEvidence {
  readonly valid: boolean;
  readonly versionId: string;
  readonly issues: ReadonlyArray<ValidationIssueVM>;
  readonly latestValidationAt: string | null;
}

export interface DesktopDiscrepancyEvidence {
  readonly discrepancyId: string;
  readonly riskProfileVersionId: string;
  readonly fieldId: string;
  readonly label: string;
  readonly status: string;
  readonly factualValue: unknown;
  readonly evidenceValue: unknown;
  readonly blocking: boolean;
  readonly createdAt: string;
}

export interface DesktopCoreAuditEventEvidence {
  readonly auditEventId: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly occurredAt: string;
}

export interface DesktopProfileReadModel {
  readonly profileId: string;
  readonly version: DesktopProfileVersionEvidence;
  readonly history: ReadonlyArray<DesktopProfileVersionEvidence>;
  readonly fields: ReadonlyArray<DesktopProfileFieldEvidence>;
  readonly validation: DesktopValidationEvidence;
  readonly discrepancies: ReadonlyArray<DesktopDiscrepancyEvidence>;
  readonly auditEvents: ReadonlyArray<DesktopCoreAuditEventEvidence>;
  readonly blockingDiscrepancyCount: number;
}

function toReadModel(args: {
  profileId: string;
  snapshot: Awaited<ReturnType<DesktopApiTransport["loadAdminProfile"]>>;
  onlyVersionId?: string;
}): DesktopProfileReadModel {
  const versions = args.onlyVersionId
    ? args.snapshot.versions.filter(version => version.versionId === args.onlyVersionId)
    : args.snapshot.versions;
  if (!versions.length) throw new Error("DESKTOP_PROFILE_VERSION_NOT_FOUND");

  const discrepancies = args.snapshot.discrepancies.filter(item =>
    !args.onlyVersionId || item.riskProfileVersionId === args.onlyVersionId
  );

  const lifecycle = composeProfileLifecycleVM({
    profileId: args.profileId,
    snapshot: {versions, audit: args.snapshot.audit},
    discrepancies,
  });

  return {
    profileId: args.profileId,
    version: {
      versionId: lifecycle.review.version.versionId,
      versionNo: lifecycle.review.version.versionNo,
      status: lifecycle.review.version.status,
      lockedAt: lifecycle.review.version.lockedAt,
      current: lifecycle.history.find(item => item.versionId === lifecycle.review.version.versionId)?.current ?? true,
    },
    history: lifecycle.history.map(item => ({
      versionId: item.versionId,
      versionNo: item.versionNo,
      status: item.status,
      lockedAt: item.lockedAt,
      current: item.current,
    })),
    fields: lifecycle.review.fields.map(field => ({
      fieldId: field.fieldId,
      label: field.label,
      controlClass: field.controlClass,
      displayValue: field.displayValue,
      sourceType: field.sourceType,
      provenanceAvailable: field.provenanceAvailable,
    })),
    validation: {
      valid: lifecycle.review.validation.valid,
      versionId: lifecycle.review.validation.versionId,
      issues: lifecycle.review.validation.issues,
      latestValidationAt: lifecycle.latestValidationAt,
    },
    discrepancies: discrepancies.map(item => {
      const presented = lifecycle.review.discrepancies.find(value => value.discrepancyId === item.discrepancyId);
      return {
        discrepancyId: item.discrepancyId,
        riskProfileVersionId: item.riskProfileVersionId,
        fieldId: item.fieldId,
        label: presented?.label ?? item.fieldId.replaceAll("_", " "),
        status: item.state,
        factualValue: item.declaredValueJson,
        evidenceValue: item.verifiedValueJson,
        blocking: item.blocking,
        createdAt: item.createdAt,
      };
    }),
    auditEvents: args.snapshot.audit.map(event => ({
      auditEventId: event.auditEventId,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      occurredAt: event.occurredAt,
    })),
    blockingDiscrepancyCount: discrepancies.filter(item => item.blocking).length,
  };
}

export async function loadDesktopProfileEvidence(
  transport: DesktopApiTransport,
  profileId: string,
): Promise<DesktopProfileReadModel> {
  const snapshot = await transport.loadAdminProfile(profileId);
  return toReadModel({profileId, snapshot});
}

export async function loadDesktopProfileVersionEvidence(
  transport: DesktopApiTransport,
  versionId: string,
): Promise<DesktopProfileReadModel> {
  const exact = await transport.loadAdminProfileVersion(versionId);
  const profile = await transport.loadAdminProfile(exact.profileId);
  const versions = profile.versions.some(item => item.versionId === versionId)
    ? profile.versions
    : [...profile.versions, exact.version];
  return toReadModel({
    profileId: exact.profileId,
    snapshot: {...profile, versions},
    onlyVersionId: versionId,
  });
}

export function classifyDesktopReadFailure(reason: unknown): {
  readonly state: "EMPTY" | "BLOCKED" | "ERROR";
  readonly title: string;
  readonly message: string;
  readonly reference: string;
} {
  const reference = reason instanceof Error ? reason.message : String(reason);
  if (reference.includes("STATUS_404") || reference.includes("NOT_FOUND")) {
    return {
      state: "EMPTY",
      title: "Evidence not found",
      message: "No authoritative evidence is available for that exact identifier.",
      reference,
    };
  }
  if (reference.includes("STATUS_409") || reference.includes("STATUS_422")) {
    return {
      state: "BLOCKED",
      title: "Evidence request blocked",
      message: "The authoritative API rejected this read request. No substitute data is shown.",
      reference,
    };
  }
  return {
    state: "ERROR",
    title: "Authoritative evidence unavailable",
    message: "The Desktop could not complete the approved read. No cached or fabricated evidence is substituted.",
    reference,
  };
}
