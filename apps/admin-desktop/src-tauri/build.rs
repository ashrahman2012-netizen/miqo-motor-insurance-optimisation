fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "get_runtime_profile",
            "get_health",
            "load_admin_profile",
            "load_admin_profile_version",
            "load_admin_profile_audit",
        ]),
    ))
    .expect("failed to build MIQOS Admin Tauri manifest");
}
