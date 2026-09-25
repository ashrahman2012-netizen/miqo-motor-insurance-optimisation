#[path = "../keyring.rs"]
mod keyring;

use reqwest::blocking::Client;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    env,
    error::Error,
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    thread,
    time::{Duration, Instant},
};

const ADMIN_KEY: &str = "DB-G10-SYNTHETIC-ADMIN";
const MARKER: &str = "G3-DPAPI-PROTECTED-MARKER-71C4A9";
const PORT: u16 = 4410;

struct ChildGuard(Option<Child>);

impl ChildGuard {
    fn stop(&mut self) {
        if let Some(mut child) = self.0.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for ChildGuard {
    fn drop(&mut self) {
        self.stop();
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes).iter().map(|b| format!("{b:02x}")).collect()
}

fn spawn_api(
    repo_root: &Path,
    data_dir: &Path,
    material: &keyring::KeyMaterial,
) -> Result<ChildGuard, Box<dyn Error>> {
    let store = keyring::protected_store_file(data_dir);
    let migrations = repo_root.join("packages").join("db").join("migrations");
    let api = repo_root.join("apps").join("api").join("src").join("server.ts");

    let mut command = Command::new("node");
    command
        .arg("--experimental-strip-types")
        .arg(api)
        .current_dir(repo_root)
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env("PORT", PORT.to_string())
        .env("MIQO_DB_BACKEND", "pglite-protected")
        .env("MIQO_PGLITE_PROTECTED_STORE", &store)
        .env("MIQO_MIGRATIONS_DIR", &migrations)
        .env("MIQO_PGLITE_KEY_FD", "0")
        .env("MIQO_PGLITE_KEY_VERSION", material.key_version.to_string())
        .env("MIQO_DATA_CLASSIFICATION", "SYNTHETIC")
        .env("MIQO_LIVE_PROVIDERS_ENABLED", "false")
        .env("MIQO_SYNTHETIC_ADMIN_KEY", ADMIN_KEY)
        .env("CUSTOMER_WEB_URL", "http://127.0.0.1:3000")
        .env("ADMIN_WEB_URL", "http://127.0.0.1:3001");

    let mut child = command.spawn()?;
    let mut stdin = child.stdin.take().ok_or("G3_PROOF_PRIVATE_PIPE_MISSING")?;
    stdin.write_all(&material.at_rest_key)?;
    stdin.flush()?;
    drop(stdin);

    let client = Client::builder().timeout(Duration::from_secs(3)).build()?;
    let deadline = Instant::now() + Duration::from_secs(120);
    while Instant::now() < deadline {
        if let Ok(response) = client.get(format!("http://127.0.0.1:{PORT}/health")).send() {
            if response.status().is_success() {
                let body: Value = response.json()?;
                if body.get("databaseBackend").and_then(Value::as_str) == Some("pglite-protected")
                    && body.get("durabilityMode").and_then(Value::as_str) == Some("CHECKPOINT_BEFORE_ACK")
                    && body.get("durabilityFaulted").and_then(Value::as_bool) == Some(false)
                {
                    return Ok(ChildGuard(Some(child)));
                }
            }
        }
        thread::sleep(Duration::from_millis(250));
    }
    let _ = child.kill();
    let _ = child.wait();
    Err("G3_PROTECTED_API_NOT_READY".into())
}

fn mutation(client: &Client, method: &str, url: String, body: Option<Value>) -> Result<Value, Box<dyn Error>> {
    let mut req = match method {
        "POST" => client.post(url),
        "PUT" => client.put(url),
        _ => return Err("unsupported proof mutation".into()),
    };
    if let Some(value) = body {
        req = req.json(&value);
    }
    let response = req.send()?;
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        return Err(format!("G3_PROOF_MUTATION_FAILED {status} {text}").into());
    }
    if response.headers().get("x-miqo-durability").and_then(|v| v.to_str().ok())
        != Some("checkpointed-before-ack")
    {
        return Err("G3_PROOF_CHECKPOINT_BEFORE_ACK_MISSING".into());
    }
    Ok(response.json().unwrap_or(Value::Null))
}

fn seed_locked_profile(data_dir: &Path, repo_root: &Path, material: &keyring::KeyMaterial) -> Result<String, Box<dyn Error>> {
    let mut api = spawn_api(repo_root, data_dir, material)?;
    let client = Client::builder().timeout(Duration::from_secs(10)).build()?;
    let base = format!("http://127.0.0.1:{PORT}");

    let profile = mutation(&client, "POST", format!("{base}/profiles"), None)?;
    let profile_id = profile.get("profileId").and_then(Value::as_str).ok_or("profileId missing")?.to_string();
    let version_id = profile.get("versionId").and_then(Value::as_str).ok_or("versionId missing")?.to_string();

    mutation(
        &client,
        "PUT",
        format!("{base}/profile-versions/{version_id}/facts/main_driver_id"),
        Some(json!({"value":MARKER})),
    )?;
    mutation(
        &client,
        "PUT",
        format!("{base}/profile-versions/{version_id}/facts/annual_mileage"),
        Some(json!({"value":8000})),
    )?;
    mutation(
        &client,
        "PUT",
        format!("{base}/profile-versions/{version_id}/facts/licence_held_since"),
        Some(json!({"value":"2018-04-16"})),
    )?;
    mutation(&client, "POST", format!("{base}/profiles/{profile_id}/validate"), None)?;
    mutation(&client, "POST", format!("{base}/profiles/{profile_id}/lock"), None)?;

    api.stop();
    Ok(profile_id)
}

fn verify_profile(data_dir: &Path, repo_root: &Path, material: &keyring::KeyMaterial, profile_id: &str) -> Result<(), Box<dyn Error>> {
    let mut api = spawn_api(repo_root, data_dir, material)?;
    let client = Client::builder().timeout(Duration::from_secs(10)).build()?;
    let response = client
        .get(format!("http://127.0.0.1:{PORT}/admin/profiles/{profile_id}"))
        .header("x-miqo-synthetic-admin", ADMIN_KEY)
        .send()?;
    if !response.status().is_success() {
        return Err(format!("G3_PROFILE_REOPEN_FAILED {}", response.status()).into());
    }
    let text = response.text()?;
    if !text.contains(MARKER) || !text.contains("LOCKED") {
        return Err("G3_PROFILE_REOPEN_PARITY_FAILED".into());
    }
    api.stop();
    Ok(())
}

fn rekey_store(
    repo_root: &Path,
    data_dir: &Path,
    plan: &keyring::RotationPlan,
) -> Result<(), Box<dyn Error>> {
    let script = repo_root.join("scripts").join("desktop-g3-rekey-protected-store.ts");
    let store = keyring::protected_store_file(data_dir);
    let mut child = Command::new("node")
        .arg("--experimental-strip-types")
        .arg(script)
        .current_dir(repo_root)
        .stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env("MIQO_G3_PROTECTED_STORE", &store)
        .env("MIQO_G3_OLD_KEY_VERSION", plan.old.key_version.to_string())
        .env("MIQO_G3_NEW_KEY_VERSION", plan.new.key_version.to_string())
        .env("MIQO_G3_REKEY_FD", "0")
        .spawn()?;

    let mut stdin = child.stdin.take().ok_or("G3_REKEY_PRIVATE_PIPE_MISSING")?;
    stdin.write_all(&plan.old.at_rest_key)?;
    stdin.write_all(&plan.new.at_rest_key)?;
    stdin.flush()?;
    drop(stdin);

    let status = child.wait()?;
    if !status.success() {
        return Err(format!("G3_PROTECTED_STORE_REKEY_FAILED {status}").into());
    }
    Ok(())
}

fn corrupt_keyring_copy(source: &Path, target: &Path) -> Result<(), Box<dyn Error>> {
    let bytes = fs::read(source)?;
    let mut json: Value = serde_json::from_slice(&bytes)?;
    json["userWrappedShare"] = Value::String("not-valid-base64-%%%".to_string());
    fs::write(target, serde_json::to_vec_pretty(&json)?)?;
    Ok(())
}

fn lifecycle(data_dir: &Path, repo_root: &Path, evidence_dir: &Path) -> Result<(), Box<dyn Error>> {
    if data_dir.exists() {
        fs::remove_dir_all(data_dir)?;
    }
    if evidence_dir.exists() {
        fs::remove_dir_all(evidence_dir)?;
    }
    fs::create_dir_all(evidence_dir)?;

    let material_v1 = keyring::load_or_create(data_dir)?;
    if material_v1.key_version != 1 {
        return Err("G3_FIRST_RUN_KEY_VERSION_INVALID".into());
    }
    let first_fingerprint = material_v1.fingerprint();

    let keyring_path = keyring::keyring_file(data_dir);
    let keyring_bytes = fs::read(&keyring_path)?;
    let raw_key_b64 = base64::engine::general_purpose::STANDARD.encode(material_v1.at_rest_key);
    if String::from_utf8_lossy(&keyring_bytes).contains(&raw_key_b64) {
        return Err("G3_PLAINTEXT_AT_REST_KEY_FOUND_IN_KEYRING".into());
    }

    let profile_id = seed_locked_profile(data_dir, repo_root, &material_v1)?;
    drop(material_v1);

    let reopened_v1 = keyring::open_existing(data_dir)?;
    if reopened_v1.fingerprint() != first_fingerprint {
        return Err("G3_REINSTALL_REOPEN_KEY_MISMATCH".into());
    }
    verify_profile(data_dir, repo_root, &reopened_v1, &profile_id)?;
    drop(reopened_v1);

    // Aborted rotation must leave v1 authoritative when the store was not rekeyed.
    let abort_plan = keyring::begin_rotation(data_dir)?;
    if abort_plan.old.key_version != 1 || abort_plan.new.key_version != 2 {
        return Err("G3_ABORT_ROTATION_VERSION_INVALID".into());
    }
    keyring::abort_rotation(&abort_plan)?;
    drop(abort_plan);
    let after_abort = keyring::open_existing(data_dir)?;
    if after_abort.key_version != 1 || after_abort.fingerprint() != first_fingerprint {
        return Err("G3_ABORT_ROTATION_CHANGED_ACTIVE_KEY".into());
    }
    drop(after_abort);

    // Normal v1 -> v2 rekey and commit.
    let plan_v2 = keyring::begin_rotation(data_dir)?;
    let v2_fingerprint = plan_v2.new.fingerprint();
    rekey_store(repo_root, data_dir, &plan_v2)?;
    keyring::commit_rotation(&plan_v2)?;
    drop(plan_v2);

    let material_v2 = keyring::open_existing(data_dir)?;
    if material_v2.key_version != 2 || material_v2.fingerprint() != v2_fingerprint || v2_fingerprint == first_fingerprint {
        return Err("G3_ROTATION_COMMIT_KEY_MISMATCH".into());
    }
    verify_profile(data_dir, repo_root, &material_v2, &profile_id)?;
    drop(material_v2);

    // Simulate crash after protected-store rekey but before keyring promotion.
    let plan_v3 = keyring::begin_rotation(data_dir)?;
    let v3_fingerprint = plan_v3.new.fingerprint();
    rekey_store(repo_root, data_dir, &plan_v3)?;
    drop(plan_v3);
    let recovered_v3 = keyring::open_existing(data_dir)?;
    if recovered_v3.key_version != 3 || recovered_v3.fingerprint() != v3_fingerprint {
        return Err("G3_ROTATION_RECOVERY_FAILED".into());
    }
    verify_profile(data_dir, repo_root, &recovered_v3, &profile_id)?;
    drop(recovered_v3);

    // Corrupt keyring must fail closed.
    let corrupt_dir = evidence_dir.join("corrupt-copy");
    fs::create_dir_all(corrupt_dir.join("security"))?;
    fs::copy(keyring::protected_store_file(data_dir), keyring::protected_store_file(&corrupt_dir))?;
    corrupt_keyring_copy(&keyring::keyring_file(data_dir), &keyring::keyring_file(&corrupt_dir))?;
    match keyring::open_existing(&corrupt_dir) {
        Err(error) if error.code == "G3_KEYRING_CORRUPT" || error.code == "G3_USER_SHARE_UNPROTECT_FAILED" => {}
        Ok(_) => return Err("G3_CORRUPT_KEYRING_OPENED".into()),
        Err(error) => return Err(format!("G3_CORRUPT_KEYRING_UNEXPECTED_ERROR {}", error.code).into()),
    }

    // Protected data without keyring must never auto-generate a replacement key.
    let missing_dir = evidence_dir.join("missing-keyring-copy");
    fs::create_dir_all(&missing_dir)?;
    fs::copy(keyring::protected_store_file(data_dir), keyring::protected_store_file(&missing_dir))?;
    match keyring::load_or_create(&missing_dir) {
        Err(error) if error.code == "G3_KEYRING_MISSING_WITH_PROTECTED_DATA" => {}
        Ok(_) => return Err("G3_MISSING_KEYRING_AUTO_REGENERATED".into()),
        Err(error) => return Err(format!("G3_MISSING_KEYRING_UNEXPECTED_ERROR {}", error.code).into()),
    }

    // Current-context probes must work before wrong-context jobs use the copied wrapped blobs.
    keyring::probe_user_share_file(&keyring::keyring_file(data_dir))?;
    keyring::probe_machine_share_file(&keyring::keyring_file(data_dir))?;

    let public_keyring = evidence_dir.join("wrapped-keyring-for-context-probes.json");
    fs::copy(keyring::keyring_file(data_dir), &public_keyring)?;

    let store_bytes = fs::read(keyring::protected_store_file(data_dir))?;
    if store_bytes.windows(MARKER.len()).any(|window| window == MARKER.as_bytes()) {
        return Err("G3_PROTECTED_STORE_PLAINTEXT_MARKER_FOUND".into());
    }

    let proof = json!({
        "gate":"G3.4",
        "result":"PRIMARY_CONTEXT_PASS",
        "proofClass":"WINDOWS_DPAPI_KEY_LIFECYCLE",
        "keyHierarchy":"DPAPI_USER_PLUS_MACHINE_2_OF_2",
        "kdf":"HKDF-SHA-256",
        "firstRun":"PASS",
        "sameContextReopen":"PASS",
        "reinstallSemantics":"PASS",
        "abortedRotationPreservesOldKey":"PASS",
        "rotationV1ToV2":"PASS",
        "rotationRecoveryAfterStoreSwitch":"PASS",
        "finalKeyVersion":3,
        "corruptKeyringFailClosed":"PASS",
        "missingKeyringFailClosed":"PASS",
        "sameContextUserShareProbe":"PASS",
        "sameMachineShareProbe":"PASS",
        "protectedStorePlaintextScan":"PASS",
        "finalProtectedStoreSha256":sha256_hex(&store_bytes),
        "wrappedKeyringSha256":sha256_hex(&fs::read(&public_keyring)?),
        "boundary":"SYNTHETIC_ONLY"
    });
    fs::write(
        evidence_dir.join("g3.4-key-lifecycle-primary.json"),
        serde_json::to_vec_pretty(&proof)?,
    )?;
    println!("{}", serde_json::to_string(&proof)?);
    Ok(())
}

fn usage() -> &'static str {
    "usage: g3-keyring-proof lifecycle <data-dir> <repo-root> <evidence-dir> | probe-user <keyring-file> | probe-machine <keyring-file> | open <data-dir>"
}

fn main() {
    if let Err(error) = real_main() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn real_main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("lifecycle") if args.len() == 5 => lifecycle(
            Path::new(&args[2]),
            Path::new(&args[3]),
            Path::new(&args[4]),
        ),
        Some("probe-user") if args.len() == 3 => {
            keyring::probe_user_share_file(Path::new(&args[2]))?;
            println!("{\"probe\":\"user\",\"result\":\"UNWRAP_SUCCEEDED\"}");
            Ok(())
        }
        Some("probe-machine") if args.len() == 3 => {
            keyring::probe_machine_share_file(Path::new(&args[2]))?;
            println!("{\"probe\":\"machine\",\"result\":\"UNWRAP_SUCCEEDED\"}");
            Ok(())
        }
        Some("open") if args.len() == 3 => {
            let material = keyring::open_existing(Path::new(&args[2]))?;
            println!(
                "{{\"result\":\"OPEN\",\"keyVersion\":{},\"fingerprint\":\"{}\"}}",
                material.key_version,
                material.fingerprint()
            );
            Ok(())
        }
        _ => Err(usage().into()),
    }
}
