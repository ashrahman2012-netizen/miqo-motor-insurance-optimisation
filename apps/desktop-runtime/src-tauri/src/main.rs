#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::blocking::Client;
use serde::Deserialize;
use std::{
    env,
    error::Error,
    fs,
    path::{Component, Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{
    utils::config::WebviewUrl,
    webview::{PageLoadEvent, WebviewWindowBuilder},
    Manager, RunEvent,
};

const API_URL: &str = "http://127.0.0.1:4000";
const CUSTOMER_URL: &str = "http://127.0.0.1:3000/prototype";
const ADMIN_URL: &str = "http://127.0.0.1:3001";
const ADMIN_KEY: &str = "DB-G10-SYNTHETIC-ADMIN";
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
        let version = Command::new(&node).arg("--version").output()?;
        if !version.status.success() || String::from_utf8_lossy(&version.stdout).trim() != EXPECTED_NODE_VERSION {
            return Err("Packaged Node runtime version mismatch".into());
        }

        fs::create_dir_all(&data_dir)?;
        let api = runtime_member(&runtime_root, &manifest.api)?;
        let migration = runtime_member(&runtime_root, &manifest.pglite_migration)?;
        let migrations_dir = runtime_root.join("api").join("migrations");
        let customer = runtime_member(&runtime_root, &manifest.customer_server)?;
        let admin = runtime_member(&runtime_root, &manifest.admin_server)?;

        let mut migrate = Command::new(&node);
        migrate
            .arg(&migration)
            .current_dir(migration.parent().ok_or("PGlite migration parent missing")?)
            .env("MIQO_PGLITE_DATA_DIR", &data_dir)
            .env("MIQO_MIGRATIONS_DIR", &migrations_dir)
            .env("MIQO_DATA_CLASSIFICATION", "SYNTHETIC")
            .env("MIQO_LIVE_PROVIDERS_ENABLED", "false");
        checked(&mut migrate, "apply embedded PGlite migrations")?;

        let api_child = spawn_node(
            "api",
            &node,
            &api,
            api.parent().ok_or("API parent missing")?,
            &[
                ("PORT", "4000"),
                ("MIQO_DB_BACKEND", "pglite"),
                ("MIQO_DATA_CLASSIFICATION", "SYNTHETIC"),
                ("MIQO_LIVE_PROVIDERS_ENABLED", "false"),
                ("MIQO_SYNTHETIC_ADMIN_KEY", ADMIN_KEY),
                ("CUSTOMER_WEB_URL", "http://127.0.0.1:3000"),
                ("ADMIN_WEB_URL", "http://127.0.0.1:3001"),
            ],
            Some(("MIQO_PGLITE_DATA_DIR", &data_dir)),
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
                ("MIQO_SYNTHETIC_ADMIN_GATE", ADMIN_KEY),
            ],
            None,
        )?;

        let mut supervisor = Self {
            processes: vec![api_child, customer_child, admin_child],
            stopped: false,
        };

        if let Err(error) = wait_runtime_ready() {
            supervisor.shutdown();
            return Err(error);
        }

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
        self.stopped = true;
        if let Ok(path) = env::var("MIQO_DESKTOP_SHUTDOWN_FILE") {
            let _ = fs::write(path, "{\"clean\":true,\"services\":\"stopped\",\"databaseBackend\":\"pglite\"}\n");
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

fn spawn_node(
    name: &'static str,
    node: &Path,
    script: &Path,
    cwd: &Path,
    envs: &[(&str, &str)],
    path_env: Option<(&str, &Path)>,
) -> Result<OwnedProcess, Box<dyn Error>> {
    let mut command = Command::new(node);
    command
        .arg(script)
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
    let host_ok = matches!(url.host_str(), Some("127.0.0.1") | Some("localhost"));
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
            *setup_supervisor.lock().expect("supervisor lock poisoned") = Some(runtime);

            let ready_file = env::var("MIQO_DESKTOP_READY_FILE").ok();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(CUSTOMER_URL.parse()?))
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
