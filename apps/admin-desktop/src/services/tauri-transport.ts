import {invoke} from "@tauri-apps/api/core";
import type {
  DesktopAdminProfileAuditEvidence,
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

  loadAdminProfileAudit(profileId: string) {
    return invoke<DesktopAdminProfileAuditEvidence>("load_admin_profile_audit", {profileId});
  }
}
