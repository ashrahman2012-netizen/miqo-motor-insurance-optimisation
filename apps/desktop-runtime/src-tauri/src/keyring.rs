use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use hkdf::Hkdf;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    error::Error,
    ffi::OsStr,
    fmt,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    os::windows::ffi::OsStrExt,
    path::{Path, PathBuf},
    process::Command,
    ptr::{null, null_mut},
    slice,
};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use windows_sys::Win32::{
    Foundation::{GetLastError, LocalFree},
    Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_LOCAL_MACHINE,
        CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    },
    Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH},
};
use zeroize::Zeroize;

const FORMAT_VERSION: u32 = 1;
const PROTECTION: &str = "DPAPI_USER_PLUS_MACHINE_2_OF_2";
const KDF: &str = "HKDF-SHA-256";
const MSK_INFO: &[u8] = b"MIQO/DESKTOP/G3/MSK/V1";
const AT_REST_INFO: &[u8] = b"MIQO/DESKTOP/G3/AT-REST/V1";
const KEYRING_FILE: &str = "keyring-v1.json";
const NEXT_KEYRING_FILE: &str = "keyring-v1.next.json";
const ROTATION_JOURNAL_FILE: &str = "rotation-v1.json";
const PROTECTED_STORE_NAME: &str = "protected-store-v1.enc";
const STORE_MAGIC: &[u8; 8] = b"MIQOG3E2";
const STORE_FORMAT_VERSION: u8 = 1;

#[derive(Debug)]
pub struct KeyringError {
    pub code: &'static str,
    detail: String,
}

impl KeyringError {
    fn new(code: &'static str, detail: impl Into<String>) -> Self {
        Self { code, detail: detail.into() }
    }
}

impl fmt::Display for KeyringError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.detail.is_empty() {
            write!(f, "{}", self.code)
        } else {
            write!(f, "{}: {}", self.code, self.detail)
        }
    }
}

impl Error for KeyringError {}

#[derive(Debug)]
pub struct KeyMaterial {
    pub key_id: String,
    pub key_version: u32,
    pub at_rest_key: [u8; 32],
}

impl KeyMaterial {
    pub fn fingerprint(&self) -> String {
        let digest = Sha256::digest(self.at_rest_key);
        digest[..8].iter().map(|b| format!("{b:02x}")).collect()
    }
}

impl Drop for KeyMaterial {
    fn drop(&mut self) {
        self.at_rest_key.zeroize();
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KeyringRecord {
    format_version: u32,
    key_id: String,
    key_version: u32,
    state: String,
    protection: String,
    kdf: String,
    created_at: String,
    machine_binding_sha256: String,
    user_wrapped_share: String,
    machine_wrapped_share: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RotationJournal {
    format_version: u32,
    state: String,
    from_key_id: String,
    from_key_version: u32,
    to_key_id: String,
    to_key_version: u32,
    created_at: String,
}

pub struct RotationPlan {
    pub old: KeyMaterial,
    pub new: KeyMaterial,
    security_dir: PathBuf,
    store_path: PathBuf,
}

fn now_utc() -> Result<String, KeyringError> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|e| KeyringError::new("G3_KEYRING_TIME_FORMAT_FAILED", e.to_string()))
}

fn current_machine_binding_sha256() -> Result<String, KeyringError> {
    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Cryptography",
            "/v",
            "MachineGuid",
        ])
        .output()
        .map_err(|e| KeyringError::new("G3_MACHINE_CONTEXT_READ_FAILED", e.to_string()))?;

    if !output.status.success() {
        return Err(KeyringError::new(
            "G3_MACHINE_CONTEXT_READ_FAILED",
            format!("reg exit={}", output.status),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let machine_guid = stdout
        .lines()
        .find_map(|line| {
            let trimmed = line.trim();
            if !trimmed.to_ascii_lowercase().starts_with("machineguid") {
                return None;
            }
            trimmed.split_whitespace().last().map(str::to_owned)
        })
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| KeyringError::new("G3_MACHINE_CONTEXT_READ_FAILED", "MachineGuid missing"))?;

    let normalized = machine_guid.trim().to_ascii_lowercase();
    Ok(format!("{:x}", Sha256::digest(normalized.as_bytes())))
}

fn verify_machine_binding(record: &KeyringRecord) -> Result<(), KeyringError> {
    let current = current_machine_binding_sha256()?;
    if record.machine_binding_sha256 != current {
        return Err(KeyringError::new("G3_MACHINE_CONTEXT_MISMATCH", ""));
    }
    Ok(())
}

fn fill_random(bytes: &mut [u8]) -> Result<(), KeyringError> {
    getrandom::fill(bytes)
        .map_err(|e| KeyringError::new("G3_OS_CSPRNG_FAILED", e.to_string()))
}

fn uuid_v4() -> Result<(String, [u8; 16]), KeyringError> {
    let mut bytes = [0u8; 16];
    fill_random(&mut bytes)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let text = format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5], bytes[6], bytes[7],
        bytes[8], bytes[9], bytes[10], bytes[11],
        bytes[12], bytes[13], bytes[14], bytes[15]
    );
    Ok((text, bytes))
}

fn parse_uuid_bytes(value: &str) -> Result<[u8; 16], KeyringError> {
    let hex: String = value.chars().filter(|c| *c != '-').collect();
    if hex.len() != 32 || !hex.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(KeyringError::new("G3_KEYRING_CORRUPT", "invalid keyId"));
    }
    let mut out = [0u8; 16];
    for (i, byte) in out.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16)
            .map_err(|_| KeyringError::new("G3_KEYRING_CORRUPT", "invalid keyId"))?;
    }
    Ok(out)
}

fn derive_at_rest_key(
    mut user_share: [u8; 32],
    mut machine_share: [u8; 32],
    key_id_bytes: &[u8; 16],
) -> Result<[u8; 32], KeyringError> {
    let mut ikm = [0u8; 64];
    ikm[..32].copy_from_slice(&user_share);
    ikm[32..].copy_from_slice(&machine_share);

    let hk = Hkdf::<Sha256>::new(Some(key_id_bytes), &ikm);
    let mut msk = [0u8; 32];
    hk.expand(MSK_INFO, &mut msk)
        .map_err(|_| KeyringError::new("G3_KEY_DERIVATION_FAILED", "MSK expansion"))?;

    let hk2 = Hkdf::<Sha256>::from_prk(&msk)
        .map_err(|_| KeyringError::new("G3_KEY_DERIVATION_FAILED", "MSK PRK"))?;
    let mut at_rest = [0u8; 32];
    hk2.expand(AT_REST_INFO, &mut at_rest)
        .map_err(|_| KeyringError::new("G3_KEY_DERIVATION_FAILED", "at-rest expansion"))?;

    user_share.zeroize();
    machine_share.zeroize();
    ikm.zeroize();
    msk.zeroize();
    Ok(at_rest)
}

fn dpapi_protect(input: &[u8], machine_scope: bool) -> Result<Vec<u8>, KeyringError> {
    let mut input_blob = CRYPT_INTEGER_BLOB {
        cbData: input.len() as u32,
        pbData: input.as_ptr() as *mut u8,
    };
    let mut output_blob = CRYPT_INTEGER_BLOB { cbData: 0, pbData: null_mut() };
    let flags = CRYPTPROTECT_UI_FORBIDDEN
        | if machine_scope { CRYPTPROTECT_LOCAL_MACHINE } else { 0 };

    let ok = unsafe {
        CryptProtectData(
            &mut input_blob,
            null(),
            null_mut(),
            null_mut(),
            null_mut(),
            flags,
            &mut output_blob,
        )
    };
    if ok == 0 {
        let code = unsafe { GetLastError() };
        return Err(KeyringError::new(
            if machine_scope { "G3_MACHINE_SHARE_PROTECT_FAILED" } else { "G3_USER_SHARE_PROTECT_FAILED" },
            format!("win32={code}"),
        ));
    }

    let result = unsafe {
        let bytes = slice::from_raw_parts(output_blob.pbData, output_blob.cbData as usize).to_vec();
        let _ = LocalFree(output_blob.pbData as _);
        bytes
    };
    Ok(result)
}

fn dpapi_unprotect(input: &[u8], machine_scope: bool) -> Result<[u8; 32], KeyringError> {
    let mut input_blob = CRYPT_INTEGER_BLOB {
        cbData: input.len() as u32,
        pbData: input.as_ptr() as *mut u8,
    };
    let mut output_blob = CRYPT_INTEGER_BLOB { cbData: 0, pbData: null_mut() };

    let ok = unsafe {
        CryptUnprotectData(
            &mut input_blob,
            null_mut(),
            null_mut(),
            null_mut(),
            null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output_blob,
        )
    };
    if ok == 0 {
        let code = unsafe { GetLastError() };
        return Err(KeyringError::new(
            if machine_scope { "G3_MACHINE_SHARE_UNPROTECT_FAILED" } else { "G3_USER_SHARE_UNPROTECT_FAILED" },
            format!("win32={code}"),
        ));
    }

    let mut out = [0u8; 32];
    let out_len = out.len();
    let valid = output_blob.cbData as usize == out_len;
    unsafe {
        if valid {
            out.copy_from_slice(slice::from_raw_parts(output_blob.pbData, out_len));
        }
        if !output_blob.pbData.is_null() {
            slice::from_raw_parts_mut(output_blob.pbData, output_blob.cbData as usize).zeroize();
            let _ = LocalFree(output_blob.pbData as _);
        }
    }
    if !valid {
        out.zeroize();
        return Err(KeyringError::new(
            if machine_scope { "G3_MACHINE_SHARE_UNPROTECT_FAILED" } else { "G3_USER_SHARE_UNPROTECT_FAILED" },
            "unexpected share length",
        ));
    }
    Ok(out)
}

fn keyring_paths(security_dir: &Path) -> (PathBuf, PathBuf, PathBuf) {
    (
        security_dir.join(KEYRING_FILE),
        security_dir.join(NEXT_KEYRING_FILE),
        security_dir.join(ROTATION_JOURNAL_FILE),
    )
}

fn to_wide(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(Some(0)).collect()
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), KeyringError> {
    let parent = path.parent().ok_or_else(|| KeyringError::new("G3_KEYRING_WRITE_FAILED", "parent missing"))?;
    fs::create_dir_all(parent)
        .map_err(|e| KeyringError::new("G3_KEYRING_WRITE_FAILED", e.to_string()))?;
    let tmp = path.with_extension("tmp");
    {
        let mut file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&tmp)
            .map_err(|e| KeyringError::new("G3_KEYRING_WRITE_FAILED", e.to_string()))?;
        file.write_all(bytes)
            .map_err(|e| KeyringError::new("G3_KEYRING_WRITE_FAILED", e.to_string()))?;
        file.sync_all()
            .map_err(|e| KeyringError::new("G3_KEYRING_WRITE_FAILED", e.to_string()))?;
    }

    let from = to_wide(tmp.as_os_str());
    let to = to_wide(path.as_os_str());
    let ok = unsafe {
        MoveFileExW(
            from.as_ptr(),
            to.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if ok == 0 {
        let code = unsafe { GetLastError() };
        let _ = fs::remove_file(&tmp);
        return Err(KeyringError::new("G3_KEYRING_WRITE_FAILED", format!("win32={code}")));
    }
    Ok(())
}

fn read_record(path: &Path) -> Result<KeyringRecord, KeyringError> {
    let bytes = fs::read(path)
        .map_err(|e| KeyringError::new("G3_KEYRING_CORRUPT", e.to_string()))?;
    let record: KeyringRecord = serde_json::from_slice(&bytes)
        .map_err(|_| KeyringError::new("G3_KEYRING_CORRUPT", "invalid JSON"))?;
    validate_record(&record)?;
    Ok(record)
}

fn validate_record(record: &KeyringRecord) -> Result<(), KeyringError> {
    if record.format_version != FORMAT_VERSION {
        return Err(KeyringError::new("G3_KEYRING_FORMAT_UNSUPPORTED", record.format_version.to_string()));
    }
    if record.protection != PROTECTION || record.kdf != KDF || record.key_version == 0 {
        return Err(KeyringError::new("G3_KEYRING_CORRUPT", "unsupported keyring metadata"));
    }
    if record.machine_binding_sha256.len() != 64
        || !record.machine_binding_sha256.bytes().all(|b| b.is_ascii_hexdigit())
    {
        return Err(KeyringError::new("G3_KEYRING_CORRUPT", "invalid machine binding"));
    }
    if record.state != "ACTIVE" && record.state != "ROTATING" {
        return Err(KeyringError::new("G3_KEYRING_CORRUPT", "invalid state"));
    }
    let _ = parse_uuid_bytes(&record.key_id)?;
    Ok(())
}

fn material_from_record(record: &KeyringRecord) -> Result<KeyMaterial, KeyringError> {
    verify_machine_binding(record)?;
    let user_blob = BASE64
        .decode(record.user_wrapped_share.as_bytes())
        .map_err(|_| KeyringError::new("G3_KEYRING_CORRUPT", "invalid user wrapped share"))?;
    let machine_blob = BASE64
        .decode(record.machine_wrapped_share.as_bytes())
        .map_err(|_| KeyringError::new("G3_KEYRING_CORRUPT", "invalid machine wrapped share"))?;

    let user_share = dpapi_unprotect(&user_blob, false)?;
    let machine_share = dpapi_unprotect(&machine_blob, true)?;
    let key_id_bytes = parse_uuid_bytes(&record.key_id)?;
    let at_rest_key = derive_at_rest_key(user_share, machine_share, &key_id_bytes)?;
    Ok(KeyMaterial {
        key_id: record.key_id.clone(),
        key_version: record.key_version,
        at_rest_key,
    })
}

fn create_record(key_version: u32, state: &str) -> Result<(KeyringRecord, KeyMaterial), KeyringError> {
    let mut user_share = [0u8; 32];
    let mut machine_share = [0u8; 32];
    fill_random(&mut user_share)?;
    fill_random(&mut machine_share)?;
    let (key_id, key_id_bytes) = uuid_v4()?;

    let user_wrapped = dpapi_protect(&user_share, false)?;
    let machine_wrapped = dpapi_protect(&machine_share, true)?;
    let at_rest_key = derive_at_rest_key(user_share, machine_share, &key_id_bytes)?;

    let machine_binding_sha256 = current_machine_binding_sha256()?;
    let record = KeyringRecord {
        format_version: FORMAT_VERSION,
        key_id: key_id.clone(),
        key_version,
        state: state.to_string(),
        protection: PROTECTION.to_string(),
        kdf: KDF.to_string(),
        created_at: now_utc()?,
        machine_binding_sha256,
        user_wrapped_share: BASE64.encode(user_wrapped),
        machine_wrapped_share: BASE64.encode(machine_wrapped),
    };
    Ok((
        record,
        KeyMaterial { key_id, key_version, at_rest_key },
    ))
}

fn write_record(path: &Path, record: &KeyringRecord) -> Result<(), KeyringError> {
    let bytes = serde_json::to_vec_pretty(record)
        .map_err(|e| KeyringError::new("G3_KEYRING_WRITE_FAILED", e.to_string()))?;
    atomic_write(path, &bytes)
}

fn inspect_protected_store_key_version(path: &Path) -> Result<u32, KeyringError> {
    let mut file = File::open(path)
        .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
    let mut header = [0u8; 13];
    file.read_exact(&mut header)
        .map_err(|_| KeyringError::new("G3_ROTATION_INCOMPLETE", "protected store header unavailable"))?;
    if &header[..8] != STORE_MAGIC || header[8] != STORE_FORMAT_VERSION {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "protected store header invalid"));
    }
    Ok(u32::from_be_bytes([header[9], header[10], header[11], header[12]]))
}

fn validate_data_dir(data_dir: &Path, security_dir: &Path, store_path: &Path) -> Result<(), KeyringError> {
    if !data_dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(data_dir)
        .map_err(|e| KeyringError::new("G3_LOCAL_DATA_INVENTORY_FAILED", e.to_string()))?
    {
        let entry = entry.map_err(|e| KeyringError::new("G3_LOCAL_DATA_INVENTORY_FAILED", e.to_string()))?;
        let path = entry.path();
        if path == security_dir || path == store_path {
            continue;
        }
        return Err(KeyringError::new(
            "G3_LEGACY_PLAINTEXT_STORE_REQUIRES_CONTROLLED_MIGRATION",
            entry.file_name().to_string_lossy().into_owned(),
        ));
    }
    Ok(())
}

pub fn recover_rotation(security_dir: &Path, store_path: &Path) -> Result<(), KeyringError> {
    let (active_path, next_path, journal_path) = keyring_paths(security_dir);
    if !journal_path.exists() {
        if next_path.exists() {
            return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "orphan next keyring"));
        }
        return Ok(());
    }

    let journal_bytes = fs::read(&journal_path)
        .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
    let journal: RotationJournal = serde_json::from_slice(&journal_bytes)
        .map_err(|_| KeyringError::new("G3_ROTATION_INCOMPLETE", "invalid rotation journal"))?;
    if journal.format_version != FORMAT_VERSION || journal.state != "ROTATING" {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "invalid rotation journal metadata"));
    }
    let active = read_record(&active_path)?;
    let next = read_record(&next_path)?;
    if active.key_id != journal.from_key_id
        || active.key_version != journal.from_key_version
        || next.key_id != journal.to_key_id
        || next.key_version != journal.to_key_version
        || next.state != "ROTATING"
    {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "journal/keyring mismatch"));
    }
    if !store_path.exists() {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "protected store missing"));
    }

    match inspect_protected_store_key_version(store_path)? {
        version if version == journal.from_key_version => {
            fs::remove_file(&next_path)
                .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
            fs::remove_file(&journal_path)
                .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
        }
        version if version == journal.to_key_version => {
            let _ = material_from_record(&next)?;
            let mut promoted = next;
            promoted.state = "ACTIVE".to_string();
            write_record(&active_path, &promoted)?;
            fs::remove_file(&next_path)
                .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
            fs::remove_file(&journal_path)
                .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
        }
        _ => return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "store key version does not match rotation journal")),
    }
    Ok(())
}

pub fn load_or_create(data_dir: &Path) -> Result<KeyMaterial, KeyringError> {
    let security_dir = data_dir.join("security");
    let store_path = data_dir.join(PROTECTED_STORE_NAME);
    fs::create_dir_all(data_dir)
        .map_err(|e| KeyringError::new("G3_LOCAL_DATA_INIT_FAILED", e.to_string()))?;
    validate_data_dir(data_dir, &security_dir, &store_path)?;
    fs::create_dir_all(&security_dir)
        .map_err(|e| KeyringError::new("G3_KEYRING_WRITE_FAILED", e.to_string()))?;

    recover_rotation(&security_dir, &store_path)?;
    let (active_path, _, _) = keyring_paths(&security_dir);
    match (active_path.exists(), store_path.exists()) {
        (false, true) => Err(KeyringError::new("G3_KEYRING_MISSING_WITH_PROTECTED_DATA", "")),
        (false, false) => {
            let (record, material) = create_record(1, "ACTIVE")?;
            write_record(&active_path, &record)?;
            Ok(material)
        }
        (true, _) => {
            let record = read_record(&active_path)?;
            if record.state != "ACTIVE" {
                return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "active keyring is not ACTIVE"));
            }
            material_from_record(&record)
        }
    }
}

pub fn open_existing(data_dir: &Path) -> Result<KeyMaterial, KeyringError> {
    let security_dir = data_dir.join("security");
    let store_path = data_dir.join(PROTECTED_STORE_NAME);
    recover_rotation(&security_dir, &store_path)?;
    let (active_path, _, _) = keyring_paths(&security_dir);
    if !active_path.exists() {
        return Err(KeyringError::new("G3_KEYRING_MISSING_WITH_PROTECTED_DATA", ""));
    }
    let record = read_record(&active_path)?;
    if record.state != "ACTIVE" {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "active keyring is not ACTIVE"));
    }
    material_from_record(&record)
}

pub fn begin_rotation(data_dir: &Path) -> Result<RotationPlan, KeyringError> {
    let security_dir = data_dir.join("security");
    let store_path = data_dir.join(PROTECTED_STORE_NAME);
    recover_rotation(&security_dir, &store_path)?;
    if !store_path.exists() {
        return Err(KeyringError::new("G3_ROTATION_PROTECTED_STORE_MISSING", ""));
    }
    let old = open_existing(data_dir)?;
    let (active_path, next_path, journal_path) = keyring_paths(&security_dir);
    let active = read_record(&active_path)?;
    if active.key_version != old.key_version {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "active material mismatch"));
    }

    let (next_record, new) = create_record(old.key_version + 1, "ROTATING")?;
    write_record(&next_path, &next_record)?;
    let journal = RotationJournal {
        format_version: FORMAT_VERSION,
        state: "ROTATING".to_string(),
        from_key_id: old.key_id.clone(),
        from_key_version: old.key_version,
        to_key_id: new.key_id.clone(),
        to_key_version: new.key_version,
        created_at: now_utc()?,
    };
    let journal_bytes = serde_json::to_vec_pretty(&journal)
        .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
    atomic_write(&journal_path, &journal_bytes)?;
    Ok(RotationPlan { old, new, security_dir, store_path })
}

pub fn commit_rotation(plan: &RotationPlan) -> Result<(), KeyringError> {
    if inspect_protected_store_key_version(&plan.store_path)? != plan.new.key_version {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "protected store has not switched to new key version"));
    }
    let (active_path, next_path, journal_path) = keyring_paths(&plan.security_dir);
    let mut next = read_record(&next_path)?;
    if next.key_id != plan.new.key_id || next.key_version != plan.new.key_version || next.state != "ROTATING" {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "next keyring mismatch"));
    }
    next.state = "ACTIVE".to_string();
    write_record(&active_path, &next)?;
    fs::remove_file(&next_path)
        .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
    fs::remove_file(&journal_path)
        .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
    Ok(())
}

pub fn abort_rotation(plan: &RotationPlan) -> Result<(), KeyringError> {
    if inspect_protected_store_key_version(&plan.store_path)? != plan.old.key_version {
        return Err(KeyringError::new("G3_ROTATION_INCOMPLETE", "cannot abort after protected store key switch"));
    }
    let (_, next_path, journal_path) = keyring_paths(&plan.security_dir);
    if next_path.exists() {
        fs::remove_file(next_path)
            .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
    }
    if journal_path.exists() {
        fs::remove_file(journal_path)
            .map_err(|e| KeyringError::new("G3_ROTATION_INCOMPLETE", e.to_string()))?;
    }
    Ok(())
}

pub fn probe_user_share_file(keyring_path: &Path) -> Result<(), KeyringError> {
    let record = read_record(keyring_path)?;
    let blob = BASE64.decode(record.user_wrapped_share.as_bytes())
        .map_err(|_| KeyringError::new("G3_KEYRING_CORRUPT", "invalid user wrapped share"))?;
    let mut share = dpapi_unprotect(&blob, false)?;
    share.zeroize();
    Ok(())
}

pub fn probe_machine_share_file(keyring_path: &Path) -> Result<(), KeyringError> {
    let record = read_record(keyring_path)?;
    verify_machine_binding(&record)?;
    let blob = BASE64.decode(record.machine_wrapped_share.as_bytes())
        .map_err(|_| KeyringError::new("G3_KEYRING_CORRUPT", "invalid machine wrapped share"))?;
    let mut share = dpapi_unprotect(&blob, true)?;
    share.zeroize();
    Ok(())
}

pub fn keyring_file(data_dir: &Path) -> PathBuf {
    data_dir.join("security").join(KEYRING_FILE)
}

pub fn protected_store_file(data_dir: &Path) -> PathBuf {
    data_dir.join(PROTECTED_STORE_NAME)
}
