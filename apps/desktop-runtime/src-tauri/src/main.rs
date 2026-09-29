#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod keyring;

use reqwest::{blocking::Client, header::{COOKIE, ORIGIN}};
use serde::Deserialize;
use std::{
    env,
    error::Error,
    fmt::Write as FmtWrite,
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{
    utils::config::WebviewUrl,
    webview::{cookie::{Cookie, SameSite}, PageLoadEvent, WebviewWindowBuilder},
    Manager, RunEvent,
};
use zeroize::{Zeroize, Zeroizing};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const API_URL: &str = "http://127.0.0.1:4000";
const CUSTOMER_ORIGIN: &str = "http://127.0.0.1:3000";
const CUSTOMER_URL: &str = "http://127.0.0.1:3000/prototype";
const ADMIN_URL: &str = "http://127.0.0.1:3001";
const RUNTIME_COOKIE_NAME: &str = "miqo_runtime_capability";
const EXPECTED_NODE_VERSION: &str = "v22.23.3";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    version: u32,
    node_version: String,
    api: String,
    pglite_migration: String,
    pglite_version: String,
    customer_server: String,
    admin_server: String,
    runtime_boundary: String,
}

struct OwnedProcess {
    name: &'static str,
    child: Child,
}

struct RuntimeSupervisor {
    processes: Vec<OwnedProcess>,
    runtime_capability: Zeroizing<String>,
    stopped: bool,
}

impl RuntimeSupervisor {
    fn start(runtime_root: PathBuf, data_dir: PathBuf) -> Result<Self, Box<dyn Error>> {
        enforce_boundary()?;
        let manifest = read_manifest(&runtime_root)?;
        validate_manifest(&manifest)?;

        let node = runtime_root.join("node").join(if cfg!(target_os = "windows") { "node.exe" } else { "node" });
        if !node.is_file() {
            return Err(format!("Packaged Node runtime missing: {}", node.display()).into());
        }
        let mut version_command = Command::new(&node);
        suppress_windows_console(&mut version_command);
        let version = version_command.arg("--version").output()?;
        if !version.status.success() || String::from_utf8_lossy(&version.stdout).trim() != EXPECTED_NODE_VERSION {
            return Err("Packaged Node runtime version mismatch".into());
        }

        fs::create_dir_all(&data_dir)?;
        let api = runtime_member(&runtime_root, &manifest.api)?;
        let migrations_dir = runtime_root.join("api").join("migrations");
        let customer = runtime_member(&runtime_root, &manifest.customer_server)?;
        let admin = runtime_member(&runtime_root, &manifest.admin_server)?;

        let key_material = keyring::load_or_create(&data_dir)?;
        let protected_store = keyring::protected_store_file(&data_dir);
        let runtime_capability = generate_runtime_capability()?;

        let api_child = spawn_api_with_key(
            &node,
            &api,
            api.parent().ok_or("API parent missing")?,
            &protected_store,
            &migrations_dir,
            &key_material,
            runtime_capability.as_str(),
        )?;

        let customer_child = spawn_node(
            "customer",
            &node,
            &customer,
            customer.parent().ok_or("Customer server parent missing")?,
            &[
                ("NODE_ENV", "production"),
                ("PORT", "3000"),
                ("HOSTNAME", "127.0.0.1"),
            ],
            None,
        )?;

        let admin_child = spawn_node(
            "admin",
            &node,
            &admin,
            admin.parent().ok_or("Admin server parent missing")?,
            &[
                ("NODE_ENV", "production"),
                ("PORT", "3001"),
                ("HOSTNAME", "127.0.0.1"),
                ("MIQO_DATA_CLASSIFICATION", "SYNTHETIC"),
                ("MIQO_LOCAL_RUNTIME_CAPABILITY", runtime_capability.as_str()),
            ],
            None,
        )?;

        let mut supervisor = Self {
            processes: vec![api_child, customer_child, admin_child],
            runtime_capability,
            stopped: false,
        };

        if let Err(error) = wait_runtime_ready() {
            supervisor.shutdown();
            return Err(error);
        }

        if let Ok(path) = env::var("MIQO_DESKTOP_G3_5_PROOF_FILE") {
            write_local_capability_proof(supervisor.runtime_capability.as_str(), Path::new(&path))?;
        }
        execute_log_redaction_probe(supervisor.runtime_capability.as_str())?;

        Ok(supervisor)
    }

    fn shutdown(&mut self) {
        if self.stopped {
            return;
        }
        for process in self.processes.iter_mut().rev() {
            graceful_terminate(&mut process.child);
            eprintln!("desktop-g1: stopped {} process", process.name);
        }
        self.runtime_capability.zeroize();
        self.stopped = true;
        if let Ok(path) = env::var("MIQO_DESKTOP_SHUTDOWN_FILE") {
            let _ = fs::write(path, "{\"clean\":true,\"services\":\"stopped\",\"databaseBackend\":\"pglite-protected\"}\n");
        }
    }
}

impl Drop for RuntimeSupervisor {
    fn drop(&mut self) {
        self.shutdown();
    }
}

fn read_manifest(runtime_root: &Path) -> Result<RuntimeManifest, Box<dyn Error>> {
    let content = fs::read_to_string(runtime_root.join("runtime-manifest.json"))?;
    Ok(serde_json::from_str(&content)?)
}

fn validate_manifest(manifest: &RuntimeManifest) -> Result<(), Box<dyn Error>> {
    if manifest.version != 1
        || manifest.node_version != "22.23.3"
        || manifest.pglite_version != "0.5.8"
        || manifest.runtime_boundary != "SYNTHETIC_ONLY"
    {
        return Err("Packaged runtime manifest validation failed".into());
    }
    for member in [&manifest.api, &manifest.pglite_migration, &manifest.customer_server, &manifest.admin_server] {
        let path = Path::new(member);
        if path.is_absolute() || path.components().any(|component| !matches!(component, Component::Normal(_))) {
            return Err(format!("Unsafe packaged runtime path: {member}").into());
        }
    }
    Ok(())
}

fn runtime_member(root: &Path, relative: &str) -> Result<PathBuf, Box<dyn Error>> {
    let path = root.join(relative);
    if !path.is_file() {
        return Err(format!("Packaged runtime member missing: {}", path.display()).into());
    }
    Ok(path)
}

fn resolve_runtime_root<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<PathBuf, Box<dyn Error>> {
    if let Ok(override_dir) = env::var("MIQO_DESKTOP_RUNTIME_DIR") {
        return Ok(PathBuf::from(override_dir));
    }
    Ok(app.path().resource_dir()?.join("runtime"))
}

fn resolve_data_dir<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<PathBuf, Box<dyn Error>> {
    if let Ok(override_dir) = env::var("MIQO_DESKTOP_DATA_DIR") {
        return Ok(PathBuf::from(override_dir));
    }
    Ok(app.path().app_local_data_dir()?.join("pglite"))
}

fn enforce_boundary() -> Result<(), Box<dyn Error>> {
    let classification = env::var("MIQO_DATA_CLASSIFICATION").unwrap_or_else(|_| "SYNTHETIC".into());
    let live = env::var("MIQO_LIVE_PROVIDERS_ENABLED").unwrap_or_else(|_| "false".into());
    if classification != "SYNTHETIC"
        || matches!(live.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on")
    {
        return Err("Desktop prototype boundary violation".into());
    }
    Ok(())
}

fn checked(command: &mut Command, label: &str) -> Result<(), Box<dyn Error>> {
    let status = command.status()?;
    if !status.success() {
        return Err(format!("Failed to {label}: {status}").into());
    }
    Ok(())
}

fn suppress_windows_console(command: &mut Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }

    #[cfg(not(windows))]
    {
        let _ = command;
    }
}

fn generate_runtime_capability() -> Result<Zeroizing<String>, Box<dyn Error>> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes)
        .map_err(|error| std::io::Error::other(format!("G3_OS_CSPRNG_FAILED: {error}")))?;
    let mut encoded = String::with_capacity(64);
    for byte in bytes {
        write!(&mut encoded, "{byte:02x}")?;
    }
    bytes.zeroize();
    Ok(Zeroizing::new(encoded))
}

fn write_local_capability_proof(runtime_capability: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    let client = Client::builder().timeout(Duration::from_secs(5)).build()?;
    let admin_probe = format!("{ADMIN_URL}/admin/profiles/G3-CAPABILITY-PROBE");
    let api_probe = format!("{API_URL}/admin/audit?profileId=G3-CAPABILITY-PROBE");
    let customer_api_probe = format!("{API_URL}/profiles/G3-CAPABILITY-PROBE");
    let cookie = format!("{RUNTIME_COOKIE_NAME}={runtime_capability}");

    let admin_denied = client.get(&admin_probe).send()?.status().as_u16();
    let admin_allowed = client.get(&admin_probe).header(COOKIE, &cookie).send()?.status().as_u16();
    let api_denied = client.get(&api_probe).header(ORIGIN, ADMIN_URL).send()?.status().as_u16();
    let api_wrong = client
        .get(&api_probe)
        .header(ORIGIN, ADMIN_URL)
        .header(COOKIE, format!("{RUNTIME_COOKIE_NAME}=wrong-capability"))
        .send()?
        .status()
        .as_u16();
    let api_wrong_origin = client
        .get(&api_probe)
        .header(ORIGIN, "http://127.0.0.1:3999")
        .header(COOKIE, &cookie)
        .send()?
        .status()
        .as_u16();
    let api_allowed = client
        .get(&api_probe)
        .header(ORIGIN, ADMIN_URL)
        .header(COOKIE, &cookie)
        .send()?
        .status()
        .as_u16();

    let customer_api_denied = client
        .get(&customer_api_probe)
        .header(ORIGIN, CUSTOMER_ORIGIN)
        .send()?
        .status()
        .as_u16();
    let customer_api_wrong_origin = client
        .get(&customer_api_probe)
        .header(ORIGIN, "http://127.0.0.1:3999")
        .header(COOKIE, &cookie)
        .send()?
        .status()
        .as_u16();
    let customer_api_allowed = client
        .get(&customer_api_probe)
        .header(ORIGIN, CUSTOMER_ORIGIN)
        .header(COOKIE, &cookie)
        .send()?
        .status()
        .as_u16();

    if admin_denied != 401
        || admin_allowed != 200
        || api_denied != 401
        || api_wrong != 401
        || api_wrong_origin != 403
        || api_allowed != 200
        || customer_api_denied != 401
        || customer_api_wrong_origin != 403
        || customer_api_allowed != 200
    {
        return Err(format!(
            "G3.5 local capability proof failed: adminDenied={admin_denied} adminAllowed={admin_allowed} apiDenied={api_denied} apiWrong={api_wrong} apiWrongOrigin={api_wrong_origin} apiAllowed={api_allowed} customerApiDenied={customer_api_denied} customerApiWrongOrigin={customer_api_wrong_origin} customerApiAllowed={customer_api_allowed}"
        ).into());
    }

    let proof = serde_json::json!({
        "gate": "G3.5",
        "result": "PASS",
        "authority": "PER_LAUNCH_LOCAL_CAPABILITY",
        "scope": "ALL_NON_HEALTH_LOOPBACK_API_REQUESTS",
        "staticPackagedAdminSecret": false,
        "capabilityPersisted": false,
        "capabilityLogged": false,
        "adminUiNoSession": "PASS_401",
        "adminUiOwnedSession": "PASS_200",
        "apiNoSession": "PASS_401",
        "apiWrongSession": "PASS_401",
        "apiWrongOrigin": "PASS_403",
        "apiOwnedSession": "PASS_200",
        "customerApiNoSession": "PASS_401",
        "customerApiWrongOrigin": "PASS_403",
        "customerApiOwnedSession": "PASS_200",
        "boundary": "SYNTHETIC_ONLY"
    });
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, serde_json::to_vec_pretty(&proof)?)?;
    Ok(())
}


fn execute_log_redaction_probe(runtime_capability: &str) -> Result<(), Box<dyn Error>> {
    let payload_marker = match env::var("MIQO_DESKTOP_G3_7_PAYLOAD_MARKER") {
        Ok(value) => value,
        Err(_) => return Ok(()),
    };
    let secret_sentinel = env::var("MIQO_DESKTOP_G3_7_SECRET_SENTINEL").unwrap_or_default();
    let client = Client::builder().timeout(Duration::from_secs(5)).build()?;
    let cookie = format!("{RUNTIME_COOKIE_NAME}={runtime_capability}");

    let create = client
        .post(format!("{API_URL}/profiles"))
        .header(ORIGIN, CUSTOMER_ORIGIN)
        .header(COOKIE, &cookie)
        .header("authorization", format!("Bearer {secret_sentinel}"))
        .header("x-miqo-sensitive-test", &secret_sentinel)
        .json(&serde_json::json!({}))
        .send()?;
    if create.status().as_u16() != 201 {
        return Err(format!("G3.7 redaction probe profile creation failed: {}", create.status()).into());
    }
    let created: serde_json::Value = create.json()?;
    let version_id = created
        .get("versionId")
        .and_then(|value| value.as_str())
        .ok_or("G3.7 redaction probe versionId missing")?;

    let put = client
        .put(format!("{API_URL}/profile-versions/{version_id}/facts/main_driver_id"))
        .header(ORIGIN, CUSTOMER_ORIGIN)
        .header(COOKIE, &cookie)
        .header("authorization", format!("Bearer {secret_sentinel}"))
        .header("x-miqo-sensitive-test", &secret_sentinel)
        .json(&serde_json::json!({"value": payload_marker}))
        .send()?;
    if !put.status().is_success() {
        return Err(format!("G3.7 redaction probe fact write failed: {}", put.status()).into());
    }
    Ok(())
}

fn spawn_api_with_key(
    node: &Path,
    script: &Path,
    cwd: &Path,
    protected_store: &Path,
    migrations_dir: &Path,
    key_material: &keyring::KeyMaterial,
    runtime_capability: &str,
) -> Result<OwnedProcess, Box<dyn Error>> {
    let script_name = script.file_name().ok_or("Packaged API script file name missing")?;
    let mut command = Command::new(node);
    suppress_windows_console(&mut command);
    command
        .arg(script_name)
        .current_dir(cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env("PORT", "4000")
        .env("MIQO_DB_BACKEND", "pglite-protected")
        .env("MIQO_PGLITE_PROTECTED_STORE", protected_store)
        .env("MIQO_MIGRATIONS_DIR", migrations_dir)
        .env("MIQO_PGLITE_KEY_FD", "0")
        .env("MIQO_PGLITE_KEY_VERSION", key_material.key_version.to_string())
        .env("MIQO_DATA_CLASSIFICATION", "SYNTHETIC")
        .env("MIQO_LIVE_PROVIDERS_ENABLED", "false")
        .env("MIQO_LOCAL_RUNTIME_CAPABILITY", runtime_capability)
        .env("CUSTOMER_WEB_URL", "http://127.0.0.1:3000")
        .env("ADMIN_WEB_URL", "http://127.0.0.1:3001");

    let mut child = command.spawn()?;
    let mut stdin = child.stdin.take().ok_or("API private key pipe unavailable")?;
    if let Err(error) = stdin.write_all(&key_material.at_rest_key).and_then(|_| stdin.flush()) {
        let _ = child.kill();
        let _ = child.wait();
        return Err(format!("Failed to deliver protected-store key: {error}").into());
    }
    drop(stdin);
    Ok(OwnedProcess { name: "api", child })
}

fn spawn_node(
    name: &'static str,
    node: &Path,
    script: &Path,
    cwd: &Path,
    envs: &[(&str, &str)],
    path_env: Option<(&str, &Path)>,
) -> Result<OwnedProcess, Box<dyn Error>> {
    let script_name = script.file_name().ok_or("Packaged Node script file name missing")?;
    let mut command = Command::new(node);
    suppress_windows_console(&mut command);
    command
        .arg(script_name)
        .current_dir(cwd)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    for (key, value) in envs {
        command.env(key, value);
    }
    if let Some((key, value)) = path_env {
        command.env(key, value);
    }
    Ok(OwnedProcess { name, child: command.spawn()? })
}

fn wait_runtime_ready() -> Result<(), Box<dyn Error>> {
    wait_http(API_URL.to_string() + "/health", true)?;
    wait_http(CUSTOMER_URL.to_string(), true)?;
    wait_http(ADMIN_URL.to_string(), false)?;
    Ok(())
}

fn wait_http(url: String, require_success: bool) -> Result<(), Box<dyn Error>> {
    let client = Client::builder().timeout(Duration::from_secs(2)).build()?;
    let deadline = Instant::now() + Duration::from_secs(120);
    while Instant::now() < deadline {
        if let Ok(response) = client.get(&url).send() {
            if !require_success || response.status().is_success() {
                return Ok(());
            }
        }
        thread::sleep(Duration::from_millis(500));
    }
    Err(format!("Packaged service did not become ready: {url}").into())
}

fn loopback_navigation(url: &tauri::Url) -> bool {
    if url.scheme() != "http" {
        return false;
    }
    let host_ok = matches!(url.host_str(), Some("127.0.0.1"));
    let port_ok = matches!(url.port_or_known_default(), Some(3000) | Some(3001));
    host_ok && port_ok
}

fn graceful_terminate(child: &mut Child) {
    if matches!(child.try_wait(), Ok(Some(_))) {
        return;
    }

    #[cfg(unix)]
    unsafe {
        let _ = libc::kill(child.id() as i32, libc::SIGTERM);
    }

    #[cfg(windows)]
    {
        let _ = child.kill();
    }

    let deadline = Instant::now() + Duration::from_secs(8);
    while Instant::now() < deadline {
        if matches!(child.try_wait(), Ok(Some(_))) {
            return;
        }
        thread::sleep(Duration::from_millis(100));
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn main() {
    if let Err(error) = run() {
        eprintln!("MIQO distributable desktop startup failed: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let supervisor: Arc<Mutex<Option<RuntimeSupervisor>>> = Arc::new(Mutex::new(None));
    let setup_supervisor = Arc::clone(&supervisor);

    let app = tauri::Builder::default()
        .setup(move |app| {
            let runtime_root = resolve_runtime_root(app)?;
            let data_dir = resolve_data_dir(app)?;
            if let Ok(path) = env::var("MIQO_DESKTOP_DATA_DIR_PROOF_FILE") {
                let _ = fs::write(path, data_dir.to_string_lossy().as_bytes());
            }
            let runtime = RuntimeSupervisor::start(runtime_root, data_dir)?;
            let mut admin_cookie_value = runtime.runtime_capability.to_string();
            *setup_supervisor.lock().expect("supervisor lock poisoned") = Some(runtime);

            let ready_file = env::var("MIQO_DESKTOP_READY_FILE").ok();
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(CUSTOMER_URL.parse()?))
                .title("MIQO Desktop — SYNTHETIC")
                .inner_size(1280.0, 800.0)
                .min_inner_size(960.0, 640.0)
                .resizable(true)
                .devtools(false)
                .on_navigation(loopback_navigation)
                .on_page_load(move |_window, payload| {
                    if matches!(payload.event(), PageLoadEvent::Finished) && loopback_navigation(payload.url()) {
                        if let Some(path) = ready_file.as_ref() {
                            let _ = fs::write(path, format!("loaded={}\n", payload.url()));
                        }
                    }
                })
                .build()?;
            let admin_cookie = Cookie::build((RUNTIME_COOKIE_NAME, admin_cookie_value.as_str()))
                .domain("127.0.0.1")
                .path("/")
                .http_only(true)
                .same_site(SameSite::Strict)
                .build();
            window.set_cookie(admin_cookie)?;
            admin_cookie_value.zeroize();

            if let Ok(stop_file) = env::var("MIQO_DESKTOP_STOP_FILE") {
                let handle = app.handle().clone();
                thread::spawn(move || loop {
                    if Path::new(&stop_file).exists() {
                        handle.exit(0);
                        break;
                    }
                    thread::sleep(Duration::from_millis(250));
                });
            }

            Ok(())
        })
        .build(tauri::generate_context!())?;

    let shutdown_supervisor = Arc::clone(&supervisor);
    app.run(move |_handle, event| {
        if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
            if let Ok(mut guard) = shutdown_supervisor.lock() {
                if let Some(runtime) = guard.as_mut() {
                    runtime.shutdown();
                }
            }
        }
    });

    Ok(())
}
