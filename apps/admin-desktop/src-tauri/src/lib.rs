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
            "deploymentStage": "TEST",
            "applicationEnvironment": "SYNTHETIC"
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
            "deploymentStage": "TEST",
            "applicationEnvironment": "SYNTHETIC"
        })
    );
}

fn deployment_profile() -> Result<DeploymentProfile, String> {
    let profile: DeploymentProfile = serde_json::from_str(DEPLOYMENT_PROFILE_JSON)
        .map_err(|_| "DESKTOP_CONFIG_INVALID".to_string())?;

    let coherent = profile.schema_version == "miqos-desktop-config-v1"
        && profile.profile_id == "test-synthetic"
        && profile.deployment_stage == "TEST"
        && profile.application_environment == "SYNTHETIC"
        && profile.api.base_url == "http://127.0.0.1:4000"
        && profile.api.audience == "miqos-api-test"
        && profile.oidc.issuer == "https://identity.test.invalid"
        && profile.oidc.client_id == "miqos-admin-test-public"
        && profile.oidc.scopes == vec!["openid".to_string(), "profile".to_string()]
        && profile.features.as_object().is_some();

    if !coherent {
        return Err("DESKTOP_CONFIG_INCOHERENT".to_string());
    }

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
        api_service: "127.0.0.1:4000".to_string(),
        api_audience: profile.api.audience,
        authentication_mode: "NON_PRODUCTION_STUB".to_string(),
        build_version: env!("CARGO_PKG_VERSION").to_string(),
        build_id: option_env!("MIQO_BUILD_ID").unwrap_or("local").to_string(),
        source_commit: option_env!("MIQO_SOURCE_COMMIT").unwrap_or("local").to_string(),
        deployment_profile_sha256: profile_hash,
    })
}

fn validate_profile_id(profile_id: &str) -> Result<(), String> {
    let valid = !profile_id.is_empty()
        && profile_id.len() <= 100
        && profile_id
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || value == '-' || value == '_');

    if valid {
        Ok(())
    } else {
        Err("DESKTOP_INVALID_PROFILE_ID".to_string())
    }
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(StdDuration::from_secs(5))
        .redirect(Policy::none())
        .build()
        .map_err(|_| "DESKTOP_HTTP_CLIENT_ERROR".to_string())
}

fn get_json<T: DeserializeOwned>(path: &str) -> Result<T, String> {
    let profile = deployment_profile()?;
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
    let health: Health = get_json("/health")?;
    if health.status != "ok"
        || health.data_classification != "SYNTHETIC"
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
    attest_health()
}

#[tauri::command]
fn load_admin_profile_audit(profile_id: String) -> Result<AdminProfileAuditEvidence, String> {
    validate_profile_id(&profile_id)?;
    attest_health()?;

    let audit_path = format!("/admin/audit?profileId={profile_id}");
    let discrepancy_path = format!("/profiles/{profile_id}/discrepancies");

    let audit: ItemsEnvelope = get_json(&audit_path).map_err(|reason| {
        emit_error("API_REQUEST_FAILURE", "load_admin_profile_audit", &reason);
        reason
    })?;
    let discrepancies: ItemsEnvelope = get_json(&discrepancy_path).map_err(|reason| {
        emit_error("API_REQUEST_FAILURE", "load_admin_profile_audit", &reason);
        reason
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

    entries.sort_by(|a, b| b.1.cmp(&a.1));

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
