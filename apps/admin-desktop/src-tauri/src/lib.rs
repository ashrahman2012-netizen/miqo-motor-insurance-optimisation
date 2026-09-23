use log::{error, info, LevelFilter};
use reqwest::blocking::Client;
use reqwest::redirect::Policy;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::Path,
    time::{Duration as StdDuration, SystemTime},
};
use tauri::Manager;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

const DEPLOYMENT_PROFILE_JSON: &str = include_str!("../resources/deployment-profile.test.json");
const DEPLOYMENT_PROFILE_SCHEMA: &str = "miqos-desktop-config-v1";
const TEST_PROFILE_ID: &str = "test-synthetic";
const TEST_DEPLOYMENT_STAGE: &str = "TEST";
const TEST_APPLICATION_ENVIRONMENT: &str = "SYNTHETIC";
const TEST_API_BASE_URL: &str = "http://127.0.0.1:4000";
const TEST_API_SERVICE: &str = "127.0.0.1:4000";
const TEST_API_AUDIENCE: &str = "miqos-api-test";
const TEST_OIDC_ISSUER: &str = "https://identity.test.invalid";
const TEST_OIDC_CLIENT_ID: &str = "miqos-admin-test-public";
const MAX_RESPONSE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_LOG_FILES: usize = 5;
const MAX_LOG_AGE: StdDuration = StdDuration::from_secs(7 * 24 * 60 * 60);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeploymentProfile {
    schema_version: String,
    profile_id: String,
    deployment_stage: String,
    application_environment: String,
    api: ApiProfile,
    oidc: OidcProfile,
    features: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiProfile {
    base_url: String,
    audience: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OidcProfile {
    issuer: String,
    client_id: String,
    scopes: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeProfile {
    schema_version: String,
    profile_id: String,
    deployment_stage: String,
    application_environment: String,
    api_service: String,
    api_audience: String,
    authentication_mode: String,
    build_version: String,
    build_id: String,
    source_commit: String,
    deployment_profile_sha256: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Health {
    status: String,
    data_classification: String,
    live_providers_enabled: bool,
}

#[derive(Debug, Deserialize)]
struct ItemsEnvelope {
    items: Vec<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminProfileAuditEvidence {
    audit_events: Vec<Value>,
    discrepancies: Vec<Value>,
}

#[derive(Debug)]
enum ApiReadOperation<'a> {
    Health,
    AdminProfile { profile_id: &'a str },
    AdminProfileVersion { version_id: &'a str },
    AdminAudit { profile_id: &'a str },
    Discrepancies { profile_id: &'a str },
}

impl<'a> ApiReadOperation<'a> {
    fn admin_profile(profile_id: &'a str) -> Result<Self, String> {
        validate_profile_id(profile_id)?;
        Ok(Self::AdminProfile { profile_id })
    }

    fn admin_profile_version(version_id: &'a str) -> Result<Self, String> {
        validate_version_id(version_id)?;
        Ok(Self::AdminProfileVersion { version_id })
    }

    fn admin_audit(profile_id: &'a str) -> Result<Self, String> {
        validate_profile_id(profile_id)?;
        Ok(Self::AdminAudit { profile_id })
    }

    fn discrepancies(profile_id: &'a str) -> Result<Self, String> {
        validate_profile_id(profile_id)?;
        Ok(Self::Discrepancies { profile_id })
    }

    fn path(&self) -> String {
        match self {
            Self::Health => "/health".to_string(),
            Self::AdminProfile { profile_id } => format!("/admin/profiles/{profile_id}"),
            Self::AdminProfileVersion { version_id } => {
                format!("/admin/profile-versions/{version_id}")
            }
            Self::AdminAudit { profile_id } => {
                format!("/admin/audit?profileId={profile_id}")
            }
            Self::Discrepancies { profile_id } => {
                format!("/profiles/{profile_id}/discrepancies")
            }
        }
    }
}

fn timestamp_utc() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn emit_info(code: &str, operation: &str, outcome: &str, reason: Option<&str>) {
    info!(
        "{}",
        json!({
            "timestampUtc": timestamp_utc(),
            "level": "INFO",
            "component": "desktop.native",
            "eventCode": code,
            "operation": operation,
            "outcome": outcome,
            "reasonCode": reason,
            "appVersion": env!("CARGO_PKG_VERSION"),
            "buildId": option_env!("MIQO_BUILD_ID").unwrap_or("local"),
            "sourceCommit": option_env!("MIQO_SOURCE_COMMIT").unwrap_or("local"),
            "deploymentStage": TEST_DEPLOYMENT_STAGE,
            "applicationEnvironment": TEST_APPLICATION_ENVIRONMENT
        })
    );
}

fn emit_error(code: &str, operation: &str, reason: &str) {
    error!(
        "{}",
        json!({
            "timestampUtc": timestamp_utc(),
            "level": "ERROR",
            "component": "desktop.native",
            "eventCode": code,
            "operation": operation,
            "outcome": "ERROR",
            "reasonCode": reason,
            "appVersion": env!("CARGO_PKG_VERSION"),
            "buildId": option_env!("MIQO_BUILD_ID").unwrap_or("local"),
            "sourceCommit": option_env!("MIQO_SOURCE_COMMIT").unwrap_or("local"),
            "deploymentStage": TEST_DEPLOYMENT_STAGE,
            "applicationEnvironment": TEST_APPLICATION_ENVIRONMENT
        })
    );
}

fn validate_deployment_profile(profile: &DeploymentProfile) -> Result<(), String> {
    if profile.schema_version != DEPLOYMENT_PROFILE_SCHEMA {
        return Err("DESKTOP_CONFIG_SCHEMA_NOT_AUTHORISED".to_string());
    }

    if profile.profile_id != TEST_PROFILE_ID
        || profile.deployment_stage != TEST_DEPLOYMENT_STAGE
        || profile.application_environment != TEST_APPLICATION_ENVIRONMENT
    {
        return Err("DESKTOP_CONFIG_ENVIRONMENT_NOT_AUTHORISED".to_string());
    }

    if profile.api.base_url != TEST_API_BASE_URL || profile.api.audience != TEST_API_AUDIENCE {
        return Err("DESKTOP_CONFIG_API_NOT_AUTHORISED".to_string());
    }

    if profile.oidc.issuer != TEST_OIDC_ISSUER
        || profile.oidc.client_id != TEST_OIDC_CLIENT_ID
        || profile.oidc.scopes != ["openid".to_string(), "profile".to_string()]
    {
        return Err("DESKTOP_CONFIG_IDENTITY_NOT_AUTHORISED".to_string());
    }

    let features = profile
        .features
        .as_object()
        .ok_or_else(|| "DESKTOP_CONFIG_FEATURES_INVALID".to_string())?;
    if !features.is_empty() {
        return Err("DESKTOP_CONFIG_UNKNOWN_FEATURE_FLAG".to_string());
    }

    Ok(())
}

fn deployment_profile() -> Result<DeploymentProfile, String> {
    let profile: DeploymentProfile = serde_json::from_str(DEPLOYMENT_PROFILE_JSON)
        .map_err(|_| "DESKTOP_CONFIG_INVALID".to_string())?;
    validate_deployment_profile(&profile)?;
    Ok(profile)
}

fn runtime_profile() -> Result<RuntimeProfile, String> {
    let profile = deployment_profile()?;
    let profile_hash = format!("{:x}", Sha256::digest(DEPLOYMENT_PROFILE_JSON.as_bytes()));

    Ok(RuntimeProfile {
        schema_version: profile.schema_version,
        profile_id: profile.profile_id,
        deployment_stage: profile.deployment_stage,
        application_environment: profile.application_environment,
        api_service: TEST_API_SERVICE.to_string(),
        api_audience: profile.api.audience,
        authentication_mode: "NON_PRODUCTION_STUB".to_string(),
        build_version: env!("CARGO_PKG_VERSION").to_string(),
        build_id: option_env!("MIQO_BUILD_ID").unwrap_or("local").to_string(),
        source_commit: option_env!("MIQO_SOURCE_COMMIT")
            .unwrap_or("local")
            .to_string(),
        deployment_profile_sha256: profile_hash,
    })
}

fn valid_resource_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 100
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_')
}

fn validate_profile_id(profile_id: &str) -> Result<(), String> {
    if valid_resource_id(profile_id) {
        Ok(())
    } else {
        Err("DESKTOP_INVALID_PROFILE_ID".to_string())
    }
}

fn validate_version_id(version_id: &str) -> Result<(), String> {
    if valid_resource_id(version_id) {
        Ok(())
    } else {
        Err("DESKTOP_INVALID_PROFILE_VERSION_ID".to_string())
    }
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(StdDuration::from_secs(5))
        .redirect(Policy::none())
        .build()
        .map_err(|_| "DESKTOP_HTTP_CLIENT_ERROR".to_string())
}

fn get_json<T: DeserializeOwned>(operation: ApiReadOperation<'_>) -> Result<T, String> {
    let profile = deployment_profile()?;
    let path = operation.path();

    let response = client()?
        .get(format!("{}{}", profile.api.base_url, path))
        .send()
        .map_err(|_| "DESKTOP_API_UNAVAILABLE".to_string())?;

    if !response.status().is_success() {
        return Err(format!("DESKTOP_API_STATUS_{}", response.status().as_u16()));
    }

    if response.content_length().unwrap_or(0) > MAX_RESPONSE_BYTES {
        return Err("DESKTOP_API_RESPONSE_TOO_LARGE".to_string());
    }

    let body = response
        .bytes()
        .map_err(|_| "DESKTOP_API_RESPONSE_READ_FAILED".to_string())?;

    if body.len() as u64 > MAX_RESPONSE_BYTES {
        return Err("DESKTOP_API_RESPONSE_TOO_LARGE".to_string());
    }

    serde_json::from_slice(&body).map_err(|_| "DESKTOP_API_RESPONSE_INVALID".to_string())
}

fn attest_health() -> Result<Health, String> {
    let health: Health = get_json(ApiReadOperation::Health)?;
    if health.status != "ok"
        || health.data_classification != TEST_APPLICATION_ENVIRONMENT
        || health.live_providers_enabled
    {
        emit_error(
            "ENV_ATTEST_FAIL",
            "get_health",
            "DESKTOP_ENVIRONMENT_ATTESTATION_FAILED",
        );
        return Err("DESKTOP_ENVIRONMENT_ATTESTATION_FAILED".to_string());
    }

    emit_info("ENV_ATTEST_PASS", "get_health", "SUCCESS", None);
    Ok(health)
}

#[tauri::command]
fn get_runtime_profile() -> Result<RuntimeProfile, String> {
    let profile = runtime_profile()?;
    emit_info("CONFIG_VALID", "get_runtime_profile", "SUCCESS", None);
    Ok(profile)
}

#[tauri::command]
fn get_health() -> Result<Health, String> {
    match attest_health() {
        Ok(health) => Ok(health),
        Err(reason) => {
            if reason != "DESKTOP_ENVIRONMENT_ATTESTATION_FAILED" {
                emit_error("API_REQUEST_FAILURE", "get_health", &reason);
            }
            Err(reason)
        }
    }
}

#[tauri::command]
fn load_admin_profile(profile_id: String) -> Result<Value, String> {
    let operation = ApiReadOperation::admin_profile(&profile_id)?;
    attest_health()?;
    get_json(operation).inspect_err(|reason| {
        emit_error("API_REQUEST_FAILURE", "load_admin_profile", reason);
    })
}

#[tauri::command]
fn load_admin_profile_version(version_id: String) -> Result<Value, String> {
    let operation = ApiReadOperation::admin_profile_version(&version_id)?;
    attest_health()?;
    get_json(operation).inspect_err(|reason| {
        emit_error("API_REQUEST_FAILURE", "load_admin_profile_version", reason);
    })
}

#[tauri::command]
fn load_admin_profile_audit(profile_id: String) -> Result<AdminProfileAuditEvidence, String> {
    let audit_operation = ApiReadOperation::admin_audit(&profile_id)?;
    let discrepancy_operation = ApiReadOperation::discrepancies(&profile_id)?;
    attest_health()?;

    let audit: ItemsEnvelope = get_json(audit_operation).inspect_err(|reason| {
        emit_error("API_REQUEST_FAILURE", "load_admin_profile_audit", reason);
    })?;
    let discrepancies: ItemsEnvelope = get_json(discrepancy_operation).inspect_err(|reason| {
        emit_error("API_REQUEST_FAILURE", "load_admin_profile_audit", reason);
    })?;

    emit_info(
        "API_REQUEST_COMPLETE",
        "load_admin_profile_audit",
        "SUCCESS",
        None,
    );

    Ok(AdminProfileAuditEvidence {
        audit_events: audit.items,
        discrepancies: discrepancies.items,
    })
}

fn prune_logs(log_dir: &Path) {
    let now = SystemTime::now();
    let mut entries = match fs::read_dir(log_dir) {
        Ok(values) => values
            .filter_map(Result::ok)
            .filter_map(|entry| {
                let metadata = entry.metadata().ok()?;
                if !metadata.is_file() {
                    return None;
                }
                let modified = metadata.modified().ok()?;
                Some((entry.path(), modified))
            })
            .collect::<Vec<_>>(),
        Err(_) => return,
    };

    entries.sort_by_key(|a| std::cmp::Reverse(a.1));

    for (index, (path, modified)) in entries.into_iter().enumerate() {
        let expired = now
            .duration_since(modified)
            .map(|age| age > MAX_LOG_AGE)
            .unwrap_or(false);
        if expired || index >= MAX_LOG_FILES {
            let _ = fs::remove_file(path);
        }
    }
}

pub fn run() {
    let log_plugin = tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                file_name: Some("miqos-admin".to_string()),
            }),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
        ])
        .level(LevelFilter::Info)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .format(|out, message, _record| out.finish(format_args!("{message}")))
        .build();

    tauri::Builder::default()
        .plugin(log_plugin)
        .invoke_handler(tauri::generate_handler![
            get_runtime_profile,
            get_health,
            load_admin_profile,
            load_admin_profile_version,
            load_admin_profile_audit
        ])
        .setup(|app| {
            if let Ok(log_dir) = app.path().app_log_dir() {
                let _ = fs::create_dir_all(&log_dir);
                prune_logs(&log_dir);
            }
            runtime_profile().map_err(|reason| {
                emit_error("CONFIG_INVALID", "startup", &reason);
                std::io::Error::other(reason)
            })?;
            emit_info("APP_START", "startup", "SUCCESS", None);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MIQOS Admin");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bundled_profile() -> DeploymentProfile {
        serde_json::from_str(DEPLOYMENT_PROFILE_JSON)
            .expect("bundled profile should parse in tests")
    }

    #[test]
    fn bundled_test_profile_is_the_only_authorised_current_profile() {
        let profile = bundled_profile();
        assert_eq!(validate_deployment_profile(&profile), Ok(()));
    }

    #[test]
    fn rejects_environment_or_origin_drift() {
        let mut profile = bundled_profile();
        profile.deployment_stage = "PRODUCTION".to_string();
        profile.application_environment = "PRODUCTION".to_string();
        assert_eq!(
            validate_deployment_profile(&profile),
            Err("DESKTOP_CONFIG_ENVIRONMENT_NOT_AUTHORISED".to_string())
        );

        let mut profile = bundled_profile();
        profile.api.base_url = "https://example.invalid".to_string();
        assert_eq!(
            validate_deployment_profile(&profile),
            Err("DESKTOP_CONFIG_API_NOT_AUTHORISED".to_string())
        );
    }

    #[test]
    fn rejects_unknown_feature_flags_and_identity_drift() {
        let mut profile = bundled_profile();
        profile.features = json!({"liveProviders": true});
        assert_eq!(
            validate_deployment_profile(&profile),
            Err("DESKTOP_CONFIG_UNKNOWN_FEATURE_FLAG".to_string())
        );

        let mut profile = bundled_profile();
        profile.oidc.client_id = "unexpected-client".to_string();
        assert_eq!(
            validate_deployment_profile(&profile),
            Err("DESKTOP_CONFIG_IDENTITY_NOT_AUTHORISED".to_string())
        );
    }

    #[test]
    fn profile_identifiers_cannot_escape_route_templates() {
        for invalid in [
            "",
            "PRO/SYN",
            "PRO?x=1",
            "PRO#fragment",
            "PRO SYN",
            "../PRO",
        ] {
            assert_eq!(
                validate_profile_id(invalid),
                Err("DESKTOP_INVALID_PROFILE_ID".to_string())
            );
        }
        assert_eq!(validate_profile_id("PRO-SYN_001"), Ok(()));
    }

    #[test]
    fn native_read_operations_build_only_approved_current_routes() {
        assert_eq!(ApiReadOperation::Health.path(), "/health");
        assert_eq!(
            ApiReadOperation::admin_profile("PRO-SYN-001")
                .expect("valid profile")
                .path(),
            "/admin/profiles/PRO-SYN-001"
        );
        assert_eq!(
            ApiReadOperation::admin_profile_version("RPV-SYN-001-V1")
                .expect("valid version")
                .path(),
            "/admin/profile-versions/RPV-SYN-001-V1"
        );
        assert_eq!(
            ApiReadOperation::admin_audit("PRO-SYN-001")
                .expect("valid profile")
                .path(),
            "/admin/audit?profileId=PRO-SYN-001"
        );
        assert_eq!(
            ApiReadOperation::discrepancies("PRO-SYN-001")
                .expect("valid profile")
                .path(),
            "/profiles/PRO-SYN-001/discrepancies"
        );
    }

    #[test]
    fn profile_version_identifiers_cannot_escape_route_templates() {
        for invalid in ["", "RPV/SYN", "RPV?x=1", "RPV#fragment", "RPV SYN", "../RPV"] {
            assert_eq!(
                validate_version_id(invalid),
                Err("DESKTOP_INVALID_PROFILE_VERSION_ID".to_string())
            );
        }
        assert_eq!(validate_version_id("RPV-SYN_001-V1"), Ok(()));
    }
}
