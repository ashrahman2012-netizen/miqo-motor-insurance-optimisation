import {invoke} from "@tauri-apps/api/core";
import type {
  DesktopAdminProfileAuditEvidence,
  DesktopAdminProfileEvidence,
  DesktopAdminSelectionTraceEvidence,
  DesktopAdminProfileVersionEvidence,
  DesktopApiTransport,
  DesktopHealth,
  DesktopRuntimeProfile,
  DesktopDiagnostics,
  DesktopSupportSnapshot,
  DesktopSupportTransport,
} from "./contracts";

export class TauriDesktopApiTransport implements DesktopApiTransport, DesktopSupportTransport {
  getRuntimeProfile() {
    return invoke<DesktopRuntimeProfile>("get_runtime_profile");
  }

  getHealth() {
    return invoke<DesktopHealth>("get_health");
  }

  loadAdminProfile(profileId: string) {
    return invoke<DesktopAdminProfileEvidence>("load_admin_profile", {profileId});
  }

  loadAdminProfileVersion(versionId: string) {
    return invoke<DesktopAdminProfileVersionEvidence>("load_admin_profile_version", {versionId});
  }

  loadAdminProfileAudit(profileId: string) {
    return invoke<DesktopAdminProfileAuditEvidence>("load_admin_profile_audit", {profileId});
  }

  loadAdminSelectionTrace(selectionId: string) {
    return invoke<DesktopAdminSelectionTraceEvidence>("load_admin_selection_trace", {selectionId});
  }

  getDiagnostics() {
    return invoke<DesktopDiagnostics>("get_diagnostics");
  }

  createSupportSnapshot() {
    return invoke<DesktopSupportSnapshot>("create_support_snapshot");
  }
}
