# DESKTOP-G3 / G3.1 — Windows Secret & Key Hierarchy Architecture

**Gateway:** DESKTOP-G3  
**Sub-gate:** G3.1  
**Branch:** `miqo/desktop-g3`  
**Inherited certified baseline:** `e42cfb1dd9d57195606352973b125d210263f509`  
**G3.0 evidence head:** `751d6e5662b7c531b75421055d5dc521bb8f3ea2`  
**Tracker:** issue #13  
**Status:** CONTROLLED ARCHITECTURE DECISION — PENDING GREEN CI ON THIS RECORD

## 1. Decision

DESKTOP-G3 adopts a Windows-native, user-and-machine-bound key hierarchy for the local MIQO data-protection root.

The architecture uses **two independent random shares** and Windows DPAPI protection:

1. a **current-user share** protected with `CryptProtectData` without `CRYPTPROTECT_LOCAL_MACHINE`; and
2. a **machine share** protected with `CryptProtectData` using `CRYPTPROTECT_LOCAL_MACHINE`.

Neither share is itself the MIQO master key. Both shares are required to derive the master key.

This is deliberately stronger than relying on a single user-scoped DPAPI blob because Windows user credentials can roam in some enterprise configurations. The second machine-bound share prevents a copied keyring from silently becoming usable on another machine, while the user-scoped share prevents another local user from deriving the MIQO master key on the original machine.

The machine-scoped share is therefore **complementary binding only**. It is never accepted as a substitute for per-user protection.

## 2. Security objective

The design must satisfy all of the following simultaneously:

- same Windows user + same machine can reopen retained MIQO protected data;
- different Windows user on same machine cannot derive the MIQO master key;
- same user on a different machine cannot derive the MIQO master key from a copied keyring;
- copied application data + copied keyring are insufficient outside the original user/machine context;
- no plaintext master key is persisted;
- no key material is supplied through command-line arguments, configuration files or durable environment variables;
- missing/corrupt protection material fails closed;
- uninstall/reinstall retains protected data without silently creating a replacement key;
- rotation is explicit, versioned and recoverable until commit;
- G3 security architecture remains `SYNTHETIC_ONLY`.

## 3. Root key construction

### 3.1 Share generation

On first protected-store initialisation, Tauri generates:

~~~text
U = 32 random bytes   // user-bound share
M = 32 random bytes   // machine-bound share
~~~

Randomness must come from the Windows operating-system CSPRNG (direct Windows CNG RNG or a maintained Rust abstraction that resolves to the OS CSPRNG). No PRNG seeded by application state, timestamps, UUIDs or JavaScript randomness is permitted.

### 3.2 DPAPI wrapping

`U` is wrapped under current-user DPAPI:

~~~text
CryptProtectData(
  plaintext = U,
  scope = CURRENT_USER,
  UI = FORBIDDEN
)
~~~

`M` is wrapped under machine DPAPI:

~~~text
CryptProtectData(
  plaintext = M,
  scope = LOCAL_MACHINE,
  UI = FORBIDDEN
)
~~~

No interactive DPAPI prompt is part of the G3 design.

Optional DPAPI entropy is **not treated as a secret**. G3.1 does not rely on a compiled constant as entropy because that would not add a meaningful secret boundary. If a future implementation uses optional entropy for context binding, it must be documented as non-secret context only.

### 3.3 Master-key derivation

The MIQO master secret `MSK` is derived only after both DPAPI unwrap operations succeed:

~~~text
MSK = HKDF-SHA-256(
  IKM  = U || M,
  salt = canonical key-id bytes,
  info = "MIQO/DESKTOP/G3/MSK/V1",
  L    = 32 bytes
)
~~~

`MSK` is never persisted.

`U`, `M` and `MSK` must be zeroised from Rust-owned memory after the required derived key material has been produced, subject to the limits of the selected runtime/library implementation.

## 4. Domain-separated derived keys

The root master secret must not be used directly as a data-encryption key.

G3 reserves the following derivation namespace:

~~~text
K_AT_REST = HKDF(MSK, info="MIQO/DESKTOP/G3/AT-REST/V1")
~~~

`K_AT_REST` is the only key exported from the root hierarchy for G3.2 persistence feasibility work.

Future purposes must use different labels and require a controlled decision. In particular, the future loopback/local-session capability in G3.5 will be **independently generated per launch** and will not be derived from `MSK`; runtime session authority must not be coupled to long-lived data-protection material.

## 5. Keyring persistence format

The application-local security directory is frozen conceptually as:

~~~text
<app_local_data>/security/
  keyring-v1.json
~~~

The keyring contains wrapped material and non-secret metadata only.

Required metadata:

~~~json
{
  "formatVersion": 1,
  "keyId": "<UUID>",
  "keyVersion": 1,
  "state": "ACTIVE",
  "protection": "DPAPI_USER_PLUS_MACHINE_2_OF_2",
  "kdf": "HKDF-SHA-256",
  "createdAt": "<UTC timestamp>",
  "userWrappedShare": "<base64 DPAPI blob>",
  "machineWrappedShare": "<base64 DPAPI blob>"
}
~~~

The keyring must never contain plaintext `U`, `M`, `MSK`, `K_AT_REST`, provider credentials, customer data or local-session capabilities.

Keyring writes must use atomic replace semantics: write new file → flush → fsync where supported → rename/replace. Partial/truncated keyring files must fail closed.

## 6. File-system protection

The keyring and protected database remain under the current user's application-local data directory.

Windows ACLs should be restricted to the current user where practicable, but ACLs are defence in depth only. Cryptographic protection is authoritative for copied-file confidentiality.

Local administrator/SYSTEM compromise is outside the security guarantee of this gateway; G3 does not claim resistance to a fully privileged local attacker.

## 7. First-run state machine

### State A — no keyring and no protected data

Permitted action:

~~~text
generate U + M
→ DPAPI-wrap both shares
→ atomically persist keyring
→ derive MSK/K_AT_REST in memory
→ initialise protected store
~~~

### State B — valid keyring and protected data

Permitted action:

~~~text
unwrap U
→ unwrap M
→ derive same MSK/K_AT_REST
→ open protected store
~~~

### State C — protected data exists but keyring missing

Result:

~~~text
FAIL CLOSED
error = G3_KEYRING_MISSING_WITH_PROTECTED_DATA
~~~

A new keyring must **not** be generated automatically.

### State D — keyring exists but protected data does not

The existing keyring remains authoritative. The application may initialise a new protected store using that key only after explicit state validation; it must not silently rotate or replace the key.

## 8. Wrong-user / wrong-machine behaviour

Both shares are mandatory.

| Situation | User share | Machine share | Result |
|---|---|---|---|
| Same user, same machine | unwraps | unwraps | OPEN permitted |
| Different user, same machine | fails | may unwrap | FAIL CLOSED |
| Same roaming user, different machine | may unwrap | fails | FAIL CLOSED |
| Different user, different machine | fails | fails | FAIL CLOSED |

This 2-of-2 construction is specifically chosen to satisfy the G3 wrong-user and wrong-machine requirement without using machine-wide protection as the sole authority.

## 9. Key versioning

Keyring format and data-key version are independent concepts.

Required identifiers:

~~~text
formatVersion   // parser/keyring envelope format
keyId           // immutable unique key identity
keyVersion      // monotonically increasing logical data-key generation
protection      // DPAPI_USER_PLUS_MACHINE_2_OF_2
kdf             // HKDF-SHA-256
state           // ACTIVE | ROTATING | RETIRED
~~~

Unknown `formatVersion`, `protection` or `kdf` values must fail closed.

Data encrypted under G3.3 must carry or resolve an explicit key version so a future rotation can distinguish old and new ciphertext without heuristic detection.

## 10. Rotation protocol

Rotation is **not** a destructive overwrite.

Frozen state machine:

~~~text
ACTIVE(vN)
  ↓ generate fresh U/M
ROTATING(vN → vN+1)
  ↓ create wrapped vN+1 keyring material
  ↓ re-encrypt/stage protected data under vN+1
  ↓ verify complete authenticated readback/parity
  ↓ atomically switch protected-store metadata to vN+1
ACTIVE(vN+1)
  ↓ retire/remove vN wrapped material after successful commit
RETIRED(vN)
~~~

If rotation fails before atomic commit, vN remains authoritative and vN+1 staging must not replace it.

If rotation fails after data staging but before authority switch, the application must recover through the explicit rotation journal/state rather than guessing which key is active.

Actual persistence re-encryption mechanics are owned by G3.2/G3.3.

## 11. Recovery policy

G3.1 does not introduce escrow, cloud backup, password-derived recovery or support-operator recovery.

Therefore:

- lost DPAPI ability may make retained protected data unrecoverable;
- an administrator password reset or Windows profile/key loss may affect DPAPI recoverability;
- copied data/keyring alone is intentionally insufficient;
- the application must surface a bounded `LOCAL_PROTECTED_DATA_UNRECOVERABLE` state rather than silently creating a new key or opening plaintext;
- any future export/recovery feature requires a separate controlled security gateway.

User-directed destructive reset may be designed later, but it is **not** an automatic recovery path and is outside G3.1.

## 12. Reinstall semantics

DESKTOP-G2 retention is preserved:

~~~text
uninstall binaries
→ retain protected database
→ retain wrapped keyring
→ reinstall under same user/machine
→ unwrap shares
→ reopen data
~~~

Reinstall must never regenerate the keyring when protected data already exists.

If either wrapped share cannot be unprotected, reinstall must fail closed and preserve the existing files for explicit recovery/reset handling.

## 13. Inter-process secret handoff

The long-lived root shares and `MSK` remain Tauri-owned.

If G3.2 requires the packaged Node/PGlite process to receive `K_AT_REST`, the key must **not** be transferred through:

- command-line arguments;
- ordinary environment variables;
- a plaintext file;
- logs;
- HTTP query strings;
- reusable static configuration.

Preferred G3.2 handoff mechanism:

~~~text
Tauri derives K_AT_REST
→ creates one-shot inherited anonymous pipe / equivalent private IPC
→ spawns owned API process
→ writes fixed-length key material once
→ child reads into memory
→ pipe closes
→ no durable copy remains
~~~

The exact Windows implementation must be proven in G3.2/G3.4 before PASS.

## 14. Error taxonomy frozen for downstream implementation

At minimum:

~~~text
G3_KEYRING_MISSING_WITH_PROTECTED_DATA
G3_KEYRING_FORMAT_UNSUPPORTED
G3_USER_SHARE_UNPROTECT_FAILED
G3_MACHINE_SHARE_UNPROTECT_FAILED
G3_KEY_DERIVATION_FAILED
G3_KEYRING_CORRUPT
G3_ROTATION_INCOMPLETE
G3_PROTECTED_DATA_AUTHENTICATION_FAILED
G3_LOCAL_PROTECTED_DATA_UNRECOVERABLE
~~~

Errors may expose classification/correlation metadata, but must not include wrapped blob contents or secret material.

## 15. Non-goals

G3.1 does not authorise or implement:

- real provider credentials;
- real IdP/RBAC;
- cloud KMS/HSM integration;
- password-based key derivation;
- key escrow;
- public recovery exports;
- production activation;
- signing/notarisation;
- live provider/customer data.

## 16. Acceptance criteria

G3.1 may PASS when:

- G3.0 has GREEN inherited CI;
- the 2-of-2 current-user + machine DPAPI architecture is recorded;
- random-share/master-key/derived-key boundaries are explicit;
- no plaintext persistent master key is allowed;
- version/rotation/recovery states are frozen;
- reinstall behaviour is frozen;
- wrong-user/wrong-machine fail-closed behaviour is explicit;
- inter-process secret transfer constraints are frozen;
- inherited repository CI is GREEN on this architecture record.

## 17. Current determination

~~~text
G3.0  PASS — ci #908 GREEN
G3.1  ARCHITECTURE FROZEN — CI PENDING
G3.2+ NOT STARTED
~~~

### External technical basis

Microsoft documents that `CryptProtectData` normally binds protected data to the same user credentials and usually the same computer, while `CRYPTPROTECT_LOCAL_MACHINE` makes protected data decryptable by any user on that machine. DPAPI also includes integrity protection for the protected blob. The G3 design intentionally requires both independently protected shares so neither user-only nor machine-only scope is sufficient by itself.
