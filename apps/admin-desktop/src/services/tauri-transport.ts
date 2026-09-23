import {invoke} from "@tauri-apps/api/core";
import type {
  DesktopAdminProfileAuditEvidence,
  DesktopAdminProfileEvidence,
  DesktopAdminProfileVersionEvidence,
  DesktopApiTransport,
  DesktopHealth,
  DesktopRuntimeProfile,
} from "./contracts";

export class TauriDesktopApiTransport implements DesktopApiTransport {
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
}
