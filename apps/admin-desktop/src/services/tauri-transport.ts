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
  DesktopAuthSession,
  DesktopAuthTransport,
} from "./contracts";

function errorText(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}

async function invokeProtected<T>(command: string, args?: Record<string, unknown>) {
  try {
    return await invoke<T>(command, args);
  } catch (reason) {
    const text = errorText(reason);
    if (text.includes("DESKTOP_SESSION_EXPIRED") || text.includes("DESKTOP_AUTHENTICATION_REQUIRED")) {
      window.dispatchEvent(new Event("miqos-session-changed"));
    }
    throw new Error(text);
  }
}

export class TauriDesktopApiTransport implements DesktopApiTransport, DesktopSupportTransport, DesktopAuthTransport {
  getRuntimeProfile() {
    return invoke<DesktopRuntimeProfile>("get_runtime_profile");
  }

  getAuthSession() {
    return invoke<DesktopAuthSession>("get_auth_session");
  }

  beginAuthentication() {
    return invoke<DesktopAuthSession>("begin_authentication");
  }

  logout() {
    return invoke<DesktopAuthSession>("logout");
  }

  getHealth() {
    return invoke<DesktopHealth>("get_health");
  }

  loadAdminProfile(profileId: string) {
    return invokeProtected<DesktopAdminProfileEvidence>("load_admin_profile", {profileId});
  }

  loadAdminProfileVersion(versionId: string) {
    return invokeProtected<DesktopAdminProfileVersionEvidence>("load_admin_profile_version", {versionId});
  }

  loadAdminProfileAudit(profileId: string) {
    return invokeProtected<DesktopAdminProfileAuditEvidence>("load_admin_profile_audit", {profileId});
  }

  loadAdminSelectionTrace(selectionId: string) {
    return invokeProtected<DesktopAdminSelectionTraceEvidence>("load_admin_selection_trace", {selectionId});
  }

  getDiagnostics() {
    return invoke<DesktopDiagnostics>("get_diagnostics");
  }

  createSupportSnapshot() {
    return invoke<DesktopSupportSnapshot>("create_support_snapshot");
  }
}
