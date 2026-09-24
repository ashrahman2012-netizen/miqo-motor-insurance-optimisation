#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::blocking::Client;
use std::{
    env,
    error::Error,
    fs,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{
    utils::config::WebviewUrl,
    webview::{PageLoadEvent, WebviewWindowBuilder},
    RunEvent,
};

const API_URL: &str = "http://127.0.0.1:4000";
const CUSTOMER_URL: &str = "http://127.0.0.1:3000/prototype";
const ADMIN_URL: &str = "http://127.0.0.1:3001";
const ADMIN_KEY: &str = "DB-G10-SYNTHETIC-ADMIN";

struct OwnedProcess {
    name: &'static str,
    child: Child,
}

struct RuntimeSupervisor {
    repo_root: PathBuf,
    processes: Vec<OwnedProcess>,
    started_postgres: bool,
    stopped: bool,
}

impl RuntimeSupervisor {
    fn start() -> Result<Self, Box<dyn Error>> {
        enforce_boundary()?;
        let repo_root = env::var("MIQO_DESKTOP_REPO_ROOT")
            .map(PathBuf::from)
            .unwrap_or(env::current_dir()?);
        if !repo_root.join("package.json").is_file() {
            return Err(format!("MIQO desktop repo root is invalid: {}", repo_root.display()).into());
        }

        let manage_postgres = env_bool("MIQO_DESKTOP_MANAGE_POSTGRES", false);
        let already_running = postgres_running(&repo_root);
        let mut started_postgres = false;
        if manage_postgres && !already_running {
            checked(
                Command::new("docker")
                    .args(["compose", "up", "-d", "postgres"])
                    .current_dir(&repo_root),
                "start PostgreSQL",
            )?;
            started_postgres = true;
        }
        wait_for_postgres(&repo_root)?;

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://miqo:miqo@127.0.0.1:5432/miqo".to_string());

        checked(
            Command::new("node")
                .args(["--experimental-strip-types", "scripts/migrate-postgres.ts"])
                .env("DATABASE_URL", &database_url)
                .current_dir(&repo_root),
            "run database migrations",
        )?;

        let mut processes = Vec::new();
        processes.push(OwnedProcess {
            name: "api",
            child: spawn_node(
                &repo_root,
                &repo_root,
                &["--experimental-strip-types", "apps/api/src/server.ts"],
                &[
                    ("PORT", "4000"),
                    ("DATABASE_URL", &database_url),
                    ("MIQO_DATA_CLASSIFICATION", "SYNTHETIC"),
                    ("MIQO_LIVE_PROVIDERS_ENABLED", "false"),
                    ("CUSTOMER_WEB_URL", "http://127.0.0.1:3000"),
                    ("ADMIN_WEB_URL", "http://127.0.0.1:3001"),
                    ("MIQO_SYNTHETIC_ADMIN_KEY", ADMIN_KEY),
                ],
            )?,
        });

        let next_bin = repo_root.join("node_modules/next/dist/bin/next");
        let next = next_bin.to_string_lossy().to_string();

        processes.push(OwnedProcess {
            name: "customer",
            child: spawn_node(
                &repo_root,
                &repo_root.join("apps/customer-web"),
                &[&next, "dev", "-p", "3000", "-H", "127.0.0.1"],
                &[
                    ("NEXT_PUBLIC_API_URL", API_URL),
                    ("NEXT_PUBLIC_ADMIN_WEB_URL", ADMIN_URL),
                    ("NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_GATE", ADMIN_KEY),
                ],
            )?,
        });

        processes.push(OwnedProcess {
            name: "admin",
            child: spawn_node(
                &repo_root,
                &repo_root.join("apps/admin-web"),
                &[&next, "dev", "-p", "3001", "-H", "127.0.0.1"],
                &[
                    ("MIQO_DATA_CLASSIFICATION", "SYNTHETIC"),
                    ("MIQO_SYNTHETIC_ADMIN_GATE", ADMIN_KEY),
                    ("NEXT_PUBLIC_MIQO_SYNTHETIC_ADMIN_KEY", ADMIN_KEY),
                    ("NEXT_PUBLIC_API_URL", API_URL),
                ],
            )?,
        });

        wait_http(API_URL.to_string() + "/health", true)?;
        wait_http(CUSTOMER_URL.to_string(), true)?;
        wait_http(ADMIN_URL.to_string(), false)?;

        Ok(Self {
            repo_root,
            processes,
            started_postgres,
            stopped: false,
        })
    }

    fn shutdown(&mut self) {
        if self.stopped {
            return;
        }
        for process in self.processes.iter_mut().rev() {
            terminate_tree(&mut process.child);
            eprintln!("desktop-g0: stopped {} process", process.name);
        }
        if self.started_postgres {
            let _ = Command::new("docker")
                .args(["compose", "stop", "postgres"])
                .current_dir(&self.repo_root)
                .status();
        }
        self.stopped = true;
        if let Ok(path) = env::var("MIQO_DESKTOP_SHUTDOWN_FILE") {
            let _ = fs::write(path, r#"{\"clean\":true,\"services\":\"stopped\"}\n"#);
        }
    }
}

impl Drop for RuntimeSupervisor {
    fn drop(&mut self) {
        self.shutdown();
    }
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

fn env_bool(name: &str, default: bool) -> bool {
    env::var(name)
        .map(|value| matches!(value.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(default)
}

fn postgres_running(root: &Path) -> bool {
    Command::new("docker")
        .args(["compose", "ps", "--status", "running", "-q", "postgres"])
        .current_dir(root)
        .output()
        .map(|output| output.status.success() && !output.stdout.is_empty())
        .unwrap_or(false)
}

fn wait_for_postgres(root: &Path) -> Result<(), Box<dyn Error>> {
    let deadline = Instant::now() + Duration::from_secs(75);
    while Instant::now() < deadline {
        let status = Command::new("docker")
            .args(["compose", "exec", "-T", "postgres", "pg_isready", "-U", "miqo", "-d", "miqo"])
            .current_dir(root)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        if matches!(status, Ok(s) if s.success()) {
            return Ok(());
        }
        thread::sleep(Duration::from_secs(1));
    }
    Err("PostgreSQL did not become ready".into())
}

fn checked(command: &mut Command, label: &str) -> Result<(), Box<dyn Error>> {
    let status = command.status()?;
    if !status.success() {
        return Err(format!("Failed to {}: {}", label, status).into());
    }
    Ok(())
}

fn spawn_node(
    root: &Path,
    cwd: &Path,
    args: &[&str],
    envs: &[(&str, &str)],
) -> Result<Child, Box<dyn Error>> {
    let mut command = Command::new("node");
    command
        .args(args)
        .current_dir(cwd)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env("MIQO_DESKTOP_REPO_ROOT", root);
    for (key, value) in envs {
        command.env(key, value);
    }
    Ok(command.spawn()?)
}

fn wait_http(url: String, require_success: bool) -> Result<(), Box<dyn Error>> {
    let client = Client::builder().timeout(Duration::from_secs(2)).build()?;
    let deadline = Instant::now() + Duration::from_secs(90);
    while Instant::now() < deadline {
        if let Ok(response) = client.get(&url).send() {
            if !require_success || response.status().is_success() {
                return Ok(());
            }
        }
        thread::sleep(Duration::from_millis(500));
    }
    Err(format!("Service did not become ready: {url}").into())
}

fn loopback_navigation(url: &tauri::Url) -> bool {
    if url.scheme() != "http" {
        return false;
    }
    let host_ok = matches!(url.host_str(), Some("127.0.0.1") | Some("localhost"));
    let port_ok = matches!(url.port_or_known_default(), Some(3000) | Some(3001));
    host_ok && port_ok
}

fn terminate_tree(child: &mut Child) {
    let pid = child.id().to_string();
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill").args(["/PID", &pid, "/T", "/F"]).status();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("pkill").args(["-TERM", "-P", &pid]).status();
        thread::sleep(Duration::from_millis(250));
        let _ = Command::new("pkill").args(["-KILL", "-P", &pid]).status();
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn main() {
    if let Err(error) = run() {
        eprintln!("MIQO desktop startup failed: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let supervisor: Arc<Mutex<Option<RuntimeSupervisor>>> = Arc::new(Mutex::new(None));
    let setup_supervisor = Arc::clone(&supervisor);

    let app = tauri::Builder::default()
        .setup(move |app| {
            let runtime = RuntimeSupervisor::start()?;
            *setup_supervisor.lock().expect("supervisor lock poisoned") = Some(runtime);

            let ready_file = env::var("MIQO_DESKTOP_READY_FILE").ok();
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(CUSTOMER_URL.parse()?),
            )
            .title("MIQO Desktop — SYNTHETIC")
            .inner_size(1280.0, 800.0)
            .min_inner_size(960.0, 640.0)
            .resizable(true)
            .devtools(false)
            .on_navigation(loopback_navigation)
            .on_page_load(move |_window, payload| {
                if matches!(payload.event(), PageLoadEvent::Finished)
                    && loopback_navigation(payload.url())
                {
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
