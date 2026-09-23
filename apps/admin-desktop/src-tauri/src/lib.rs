use log::{error, info, LevelFilter};
use reqwest::blocking::Client;
use reqwest::redirect::Policy;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::Path,
    process,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
    time::{Duration as StdDuration, SystemTime, UNIX_EPOCH},
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

#[derive(Debug, Clone)]
struct ObservabilityState {
    session_correlation_id: String,
    last_trace_id: Option<String>,
    last_server_request_id: Option<String>,
    last_operation: Option<String>,
    last_reason_code: Option<String>,
    api_service_version: Option<String>,
    api_build_id: Option<String>,
    api_source_commit: Option<String>,
    api_health_status: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopDiagnostics {
    product_name: String,
    app_version: String,
    build_id: String,
    source_commit: String,
    package_architecture: String,
    deployment_stage: String,
    application_environment: String,
    deployment_profile_id: String,
    deployment_profile_sha256: String,
    api_service: String,
    api_health_status: String,
    api_service_version: Option<String>,
    api_build_id: Option<String>,
    api_source_commit: Option<String>,
    session_correlation_id: String,
    last_trace_id: Option<String>,
    last_server_request_id: Option<String>,
    last_operation: Option<String>,
    last_reason_code: Option<String>,
    log_directory_status: String,
    log_file_count: usize,
    log_total_bytes: u64,
    log_retention_max_files: usize,
    log_retention_max_age_days: u64,
    support_snapshot_available: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SupportSnapshot {
    schema_version: String,
    created_at_utc: String,
    support_reference: String,
    evidence_scope: String,
    diagnostics: DesktopDiagnostics,
    excluded_categories: Vec<String>,
    sha256: String,
}

struct TraceContext {
    trace_id: String,
    traceparent: String,
}

static OBSERVABILITY_STATE: OnceLock<Mutex<ObservabilityState>> = OnceLock::new();
static TRACE_COUNTER: AtomicU64 = AtomicU64::new(1);

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminSelectionTraceEvidence {
    trace: Value,
    audit_events: Vec<Value>,
    discrepancies: Vec<Value>,
    raw_provider_response: Option<Value>,
}

#[derive(Debug)]
enum ApiReadOperation<'a> {
    Health,
    AdminProfile { profile_id: &'a str },
    AdminProfileVersion { version_id: &'a str },
    AdminAudit { profile_id: &'a str },
    AdminSelectionSp4Trace { selection_id: &'a str },
    Discrepancies { profile_id: &'a str },
    RawProviderResponse { quote_request_id: &'a str },
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

    fn admin_selection_sp4_trace(selection_id: &'a str) -> Result<Self, String> {
        validate_selection_id(selection_id)?;
        Ok(Self::AdminSelectionSp4Trace { selection_id })
    }

    fn discrepancies(profile_id: &'a str) -> Result<Self, String> {
        validate_profile_id(profile_id)?;
        Ok(Self::Discrepancies { profile_id })
    }

    fn raw_provider_response(quote_request_id: &'a str) -> Result<Self, String> {
        validate_quote_request_id(quote_request_id)?;
        Ok(Self::RawProviderResponse { quote_request_id })
    }

    fn name(&self) -> &'static str {
        match self {
            Self::Health => "health",
            Self::AdminProfile { .. } => "admin_profile",
            Self::AdminProfileVersion { .. } => "admin_profile_version",
            Self::AdminAudit { .. } => "admin_audit",
            Self::AdminSelectionSp4Trace { .. } => "admin_selection_sp4_trace",
            Self::Discrepancies { .. } => "discrepancies",
            Self::RawProviderResponse { .. } => "raw_provider_response",
        }
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
            Self::AdminSelectionSp4Trace { selection_id } => {
                format!("/admin/selections/{selection_id}/sp4-trace")
            }
            Self::Discrepancies { profile_id } => {
                format!("/profiles/{profile_id}/discrepancies")
            }
            Self::RawProviderResponse { quote_request_id } => {
                format!("/quote-requests/{quote_request_id}/raw-response")
            }
        }
    }
}

fn timestamp_utc() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn digest_hex(seed: &str) -> String {
    format!("{:x}", Sha256::digest(seed.as_bytes()))
}

fn correlation_seed(label: &str) -> String {
    let epoch_nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let counter = TRACE_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{label}:{epoch_nanos}:{}:{counter}", process::id())
}

fn session_correlation_id() -> String {
    digest_hex(&correlation_seed("session"))[..16].to_string()
}

fn observability_state() -> &'static Mutex<ObservabilityState> {
    OBSERVABILITY_STATE.get_or_init(|| {
        Mutex::new(ObservabilityState {
            session_correlation_id: session_correlation_id(),
            last_trace_id: None,
            last_server_request_id: None,
            last_operation: None,
            last_reason_code: None,
            api_service_version: None,
            api_build_id: None,
            api_source_commit: None,
            api_health_status: "UNKNOWN".to_string(),
        })
    })
}

fn state_snapshot() -> ObservabilityState {
    observability_state()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

fn new_trace_context() -> TraceContext {
    let digest = digest_hex(&correlation_seed("trace"));
    let trace_id = digest[..32].to_string();
    let span_id = digest[32..48].to_string();
    TraceContext {
        trace_id: trace_id.clone(),
        traceparent: format!("00-{trace_id}-{span_id}-01"),
    }
}

fn header_value(response: &reqwest::blocking::Response, name: &str) -> Option<String> {
    response
        .headers()
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
}

fn emit_info(code: &str, operation: &str, outcome: &str, reason: Option<&str>) {
    let correlation = state_snapshot();
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
            "applicationEnvironment": TEST_APPLICATION_ENVIRONMENT,
            "sessionCorrelationId": correlation.session_correlation_id,
            "traceId": correlation.last_trace_id,
            "serverRequestId": correlation.last_server_request_id
        })
    );
}

fn emit_error(code: &str, operation: &str, reason: &str) {
    {
        let mut state = observability_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.last_reason_code = Some(reason.to_string());
    }
    let correlation = state_snapshot();
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
            "applicationEnvironment": TEST_APPLICATION_ENVIRONMENT,
            "sessionCorrelationId": correlation.session_correlation_id,
            "traceId": correlation.last_trace_id,
            "serverRequestId": correlation.last_server_request_id
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
        && value.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
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

fn validate_selection_id(selection_id: &str) -> Result<(), String> {
    if valid_resource_id(selection_id) {
        Ok(())
    } else {
        Err("DESKTOP_INVALID_SELECTION_ID".to_string())
    }
}

fn validate_quote_request_id(quote_request_id: &str) -> Result<(), String> {
    if valid_resource_id(quote_request_id) {
        Ok(())
    } else {
        Err("DESKTOP_INVALID_QUOTE_REQUEST_ID".to_string())
    }
}

fn trace_profile_id(trace: &Value) -> Result<String, String> {
    let profile_id = trace
        .pointer("/profile/profileId")
        .and_then(Value::as_str)
        .ok_or_else(|| "DESKTOP_TRACE_PROFILE_ID_MISSING".to_string())?;
    validate_profile_id(profile_id)?;
    Ok(profile_id.to_string())
}

fn surfaced_quote_request_id(trace: &Value) -> Result<Option<String>, String> {
    let surfaced = match trace
        .pointer("/recommendation/surfacedNormalisedQuoteId")
        .and_then(Value::as_str)
    {
        Some(value) => value,
        None => return Ok(None),
    };

    let quotes = trace
        .pointer("/marketRouteQuotes")
        .and_then(Value::as_array)
        .ok_or_else(|| "DESKTOP_TRACE_ROUTE_QUOTES_MISSING".to_string())?;

    for item in quotes {
        let normalised_quote_id = item
            .pointer("/normalisedQuote/normalisedQuoteId")
            .and_then(Value::as_str);
        if normalised_quote_id == Some(surfaced) {
            let quote_request_id = item
                .pointer("/quoteRequest/quoteRequestId")
                .and_then(Value::as_str)
                .ok_or_else(|| "DESKTOP_TRACE_QUOTE_REQUEST_ID_MISSING".to_string())?;
            validate_quote_request_id(quote_request_id)?;
            return Ok(Some(quote_request_id.to_string()));
        }
    }

    Err("DESKTOP_TRACE_SURFACED_QUOTE_NOT_FOUND".to_string())
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
    let operation_name = operation.name();
    let path = operation.path();
    let trace = new_trace_context();

    {
        let mut state = observability_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.last_trace_id = Some(trace.trace_id.clone());
        state.last_server_request_id = None;
        state.last_operation = Some(operation_name.to_string());
        state.last_reason_code = None;
    }

    let response = client()?
        .get(format!("{}{}", profile.api.base_url, path))
        .header("traceparent", &trace.traceparent)
        .send()
        .map_err(|_| {
            emit_error("API_REQUEST_FAILURE", operation_name, "DESKTOP_API_UNAVAILABLE");
            "DESKTOP_API_UNAVAILABLE".to_string()
        })?;

    let server_request_id = header_value(&response, "x-miqo-request-id");
    let returned_trace_id = header_value(&response, "x-miqo-trace-id");
    if let Some(returned_trace_id) = returned_trace_id.as_deref() {
        if returned_trace_id != trace.trace_id {
            emit_error(
                "API_TRACE_MISMATCH",
                operation_name,
                "DESKTOP_TRACE_RESPONSE_MISMATCH",
            );
            return Err("DESKTOP_TRACE_RESPONSE_MISMATCH".to_string());
        }
    }

    {
        let mut state = observability_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.last_server_request_id = server_request_id;
        state.api_service_version = header_value(&response, "x-miqo-api-version");
        state.api_build_id = header_value(&response, "x-miqo-api-build-id");
        state.api_source_commit = header_value(&response, "x-miqo-api-source-commit");
    }

    if !response.status().is_success() {
        let reason = format!("DESKTOP_API_STATUS_{}", response.status().as_u16());
        emit_error("API_REQUEST_FAILURE", operation_name, &reason);
        return Err(reason);
    }

    if response.content_length().unwrap_or(0) > MAX_RESPONSE_BYTES {
        emit_error(
            "API_REQUEST_FAILURE",
            operation_name,
            "DESKTOP_API_RESPONSE_TOO_LARGE",
        );
        return Err("DESKTOP_API_RESPONSE_TOO_LARGE".to_string());
    }

    let body = response.bytes().map_err(|_| {
        emit_error(
            "API_REQUEST_FAILURE",
            operation_name,
            "DESKTOP_API_RESPONSE_READ_FAILED",
        );
        "DESKTOP_API_RESPONSE_READ_FAILED".to_string()
    })?;

    if body.len() as u64 > MAX_RESPONSE_BYTES {
        emit_error(
            "API_REQUEST_FAILURE",
            operation_name,
            "DESKTOP_API_RESPONSE_TOO_LARGE",
        );
        return Err("DESKTOP_API_RESPONSE_TOO_LARGE".to_string());
    }

    let value = serde_json::from_slice(&body).map_err(|_| {
        emit_error(
            "API_REQUEST_FAILURE",
            operation_name,
            "DESKTOP_API_RESPONSE_INVALID",
        );
        "DESKTOP_API_RESPONSE_INVALID".to_string()
    })?;
    emit_info("API_REQUEST_COMPLETE", operation_name, "SUCCESS", None);
    Ok(value)
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

    {
        let mut state = observability_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.api_health_status = "ATTESTED".to_string();
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
fn load_admin_selection_trace(selection_id: String) -> Result<AdminSelectionTraceEvidence, String> {
    let trace_operation = ApiReadOperation::admin_selection_sp4_trace(&selection_id)?;
    attest_health()?;

    let trace: Value = get_json(trace_operation).inspect_err(|reason| {
        emit_error("API_REQUEST_FAILURE", "load_admin_selection_trace", reason);
    })?;
    let profile_id = trace_profile_id(&trace)?;
    let quote_request_id = surfaced_quote_request_id(&trace)?;

    let audit: ItemsEnvelope =
        get_json(ApiReadOperation::admin_audit(&profile_id)?).inspect_err(|reason| {
            emit_error("API_REQUEST_FAILURE", "load_admin_selection_trace", reason);
        })?;
    let discrepancies: ItemsEnvelope = get_json(ApiReadOperation::discrepancies(&profile_id)?)
        .inspect_err(|reason| {
            emit_error("API_REQUEST_FAILURE", "load_admin_selection_trace", reason);
        })?;
    let raw_provider_response = match quote_request_id {
        Some(ref value) => Some(
            get_json(ApiReadOperation::raw_provider_response(value)?).inspect_err(|reason| {
                emit_error("API_REQUEST_FAILURE", "load_admin_selection_trace", reason);
            })?,
        ),
        None => None,
    };

    emit_info(
        "API_REQUEST_COMPLETE",
        "load_admin_selection_trace",
        "SUCCESS",
        None,
    );

    Ok(AdminSelectionTraceEvidence {
        trace,
        audit_events: audit.items,
        discrepancies: discrepancies.items,
        raw_provider_response,
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

fn log_directory_stats(app: &tauri::AppHandle) -> (String, usize, u64) {
    let log_dir = match app.path().app_log_dir() {
        Ok(path) => path,
        Err(_) => return ("UNAVAILABLE".to_string(), 0, 0),
    };
    if fs::create_dir_all(&log_dir).is_err() {
        return ("UNAVAILABLE".to_string(), 0, 0);
    }
    let mut count = 0usize;
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries.filter_map(Result::ok) {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    count += 1;
                    total = total.saturating_add(metadata.len());
                }
            }
        }
    }
    ("AVAILABLE".to_string(), count, total)
}

#[tauri::command]
fn get_diagnostics(app: tauri::AppHandle) -> Result<DesktopDiagnostics, String> {
    let runtime = runtime_profile()?;
    if let Err(reason) = attest_health() {
        let mut state = observability_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if state.api_health_status != "FAILED_ATTESTATION" {
            state.api_health_status = "UNAVAILABLE".to_string();
        }
        state.last_reason_code = Some(reason);
    }
    let state = state_snapshot();
    let (log_directory_status, log_file_count, log_total_bytes) = log_directory_stats(&app);

    Ok(DesktopDiagnostics {
        product_name: "MIQOS Admin".to_string(),
        app_version: runtime.build_version,
        build_id: runtime.build_id,
        source_commit: runtime.source_commit,
        package_architecture: std::env::consts::ARCH.to_string(),
        deployment_stage: runtime.deployment_stage,
        application_environment: runtime.application_environment,
        deployment_profile_id: runtime.profile_id,
        deployment_profile_sha256: runtime.deployment_profile_sha256,
        api_service: runtime.api_service,
        api_health_status: state.api_health_status,
        api_service_version: state.api_service_version,
        api_build_id: state.api_build_id,
        api_source_commit: state.api_source_commit,
        session_correlation_id: state.session_correlation_id,
        last_trace_id: state.last_trace_id,
        last_server_request_id: state.last_server_request_id,
        last_operation: state.last_operation,
        last_reason_code: state.last_reason_code,
        log_directory_status,
        log_file_count,
        log_total_bytes,
        log_retention_max_files: MAX_LOG_FILES,
        log_retention_max_age_days: MAX_LOG_AGE.as_secs() / (24 * 60 * 60),
        support_snapshot_available: true,
    })
}

#[tauri::command]
fn create_support_snapshot(app: tauri::AppHandle) -> Result<SupportSnapshot, String> {
    let diagnostics = get_diagnostics(app)?;
    let created_at_utc = timestamp_utc();
    let reference_seed = format!(
        "{}:{}:{}",
        diagnostics.session_correlation_id, created_at_utc, diagnostics.build_id
    );
    let support_reference = digest_hex(&reference_seed)[..12].to_string();
    let evidence_scope = "REDACTED_DIAGNOSTIC_METADATA_ONLY".to_string();
    let excluded_categories = vec![
        "TOKENS_AND_CREDENTIALS".to_string(),
        "RAW_PROVIDER_PAYLOADS".to_string(),
        "PROFILE_AND_CUSTOMER_PAYLOADS".to_string(),
        "DATABASE_AND_PRIVATE_KEYS".to_string(),
        "MEMORY_DUMPS".to_string(),
    ];
    let unsigned = json!({
        "schemaVersion": "miqos-desktop-support-snapshot-v1",
        "createdAtUtc": created_at_utc,
        "supportReference": support_reference,
        "evidenceScope": evidence_scope,
        "diagnostics": diagnostics,
        "excludedCategories": excluded_categories,
    });
    let sha256 = digest_hex(
        &serde_json::to_string(&unsigned)
            .map_err(|_| "DESKTOP_SUPPORT_SNAPSHOT_SERIALISATION_FAILED".to_string())?,
    );
    let snapshot: SupportSnapshot = serde_json::from_value(json!({
        "schemaVersion": "miqos-desktop-support-snapshot-v1",
        "createdAtUtc": unsigned["createdAtUtc"],
        "supportReference": unsigned["supportReference"],
        "evidenceScope": unsigned["evidenceScope"],
        "diagnostics": unsigned["diagnostics"],
        "excludedCategories": unsigned["excludedCategories"],
        "sha256": sha256,
    }))
    .map_err(|_| "DESKTOP_SUPPORT_SNAPSHOT_SERIALISATION_FAILED".to_string())?;
    emit_info(
        "SUPPORT_SNAPSHOT_CREATED",
        "create_support_snapshot",
        "SUCCESS",
        None,
    );
    Ok(snapshot)
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
    std::panic::set_hook(Box::new(|_| {
        emit_error("NATIVE_PANIC", "panic", "NATIVE_PANIC");
    }));
    let _ = observability_state();

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
            load_admin_profile_audit,
            load_admin_selection_trace,
            get_diagnostics,
            create_support_snapshot
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
            ApiReadOperation::admin_selection_sp4_trace("SEL-SYN-001")
                .expect("valid selection")
                .path(),
            "/admin/selections/SEL-SYN-001/sp4-trace"
        );
        assert_eq!(
            ApiReadOperation::discrepancies("PRO-SYN-001")
                .expect("valid profile")
                .path(),
            "/profiles/PRO-SYN-001/discrepancies"
        );
        assert_eq!(
            ApiReadOperation::raw_provider_response("QREQ-SYN-001")
                .expect("valid quote request")
                .path(),
            "/quote-requests/QREQ-SYN-001/raw-response"
        );
    }

    #[test]
    fn selection_trace_helpers_preserve_authoritative_links() {
        let trace = json!({
            "profile": {"profileId": "PRO-SYN-001"},
            "recommendation": {"surfacedNormalisedQuoteId": "NQ-SYN-001"},
            "marketRouteQuotes": [{
                "quoteRequest": {"quoteRequestId": "QREQ-SYN-001"},
                "normalisedQuote": {"normalisedQuoteId": "NQ-SYN-001"}
            }]
        });
        assert_eq!(trace_profile_id(&trace), Ok("PRO-SYN-001".to_string()));
        assert_eq!(
            surfaced_quote_request_id(&trace),
            Ok(Some("QREQ-SYN-001".to_string()))
        );
    }

    #[test]
    fn selection_trace_helpers_fail_closed_on_mismatched_surface() {
        let trace = json!({
            "profile": {"profileId": "PRO-SYN-001"},
            "recommendation": {"surfacedNormalisedQuoteId": "NQ-MISSING"},
            "marketRouteQuotes": []
        });
        assert_eq!(
            surfaced_quote_request_id(&trace),
            Err("DESKTOP_TRACE_SURFACED_QUOTE_NOT_FOUND".to_string())
        );
    }

    #[test]
    fn profile_version_identifiers_cannot_escape_route_templates() {
        for invalid in [
            "",
            "RPV/SYN",
            "RPV?x=1",
            "RPV#fragment",
            "RPV SYN",
            "../RPV",
        ] {
            assert_eq!(
                validate_version_id(invalid),
                Err("DESKTOP_INVALID_PROFILE_VERSION_ID".to_string())
            );
        }
        assert_eq!(validate_version_id("RPV-SYN_001-V1"), Ok(()));
    }

    #[test]
    fn deep_trace_identifiers_cannot_escape_route_templates() {
        for invalid in [
            "",
            "SEL/SYN",
            "SEL?x=1",
            "SEL#fragment",
            "SEL SYN",
            "../SEL",
        ] {
            assert_eq!(
                validate_selection_id(invalid),
                Err("DESKTOP_INVALID_SELECTION_ID".to_string())
            );
        }
        for invalid in [
            "",
            "QREQ/SYN",
            "QREQ?x=1",
            "QREQ#fragment",
            "QREQ SYN",
            "../QREQ",
        ] {
            assert_eq!(
                validate_quote_request_id(invalid),
                Err("DESKTOP_INVALID_QUOTE_REQUEST_ID".to_string())
            );
        }
        assert_eq!(validate_selection_id("SEL-SYN_001"), Ok(()));
        assert_eq!(validate_quote_request_id("QREQ-SYN_001"), Ok(()));
    }
}
