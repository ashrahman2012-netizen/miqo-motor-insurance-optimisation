# DESKTOP-G3 / G3.2 — Encrypted PGlite Persistence Feasibility & Parity Decision

**Gateway:** DESKTOP-G3  
**Sub-gate:** G3.2  
**Branch:** `miqo/desktop-g3`  
**Certified G2 baseline:** `e42cfb1dd9d57195606352973b125d210263f509`  
**G3.1 architecture head:** `06dff7e327d4ab1c7e5cc719af8a5695b31e0673`  
**Executable feasibility head:** `61753fae3d1bb469df507885ae3411465618390f`  
**Tracker:** issue #13  
**Decision:** GO TO G3.3 — encrypted in-memory PGlite snapshot architecture, subject to durability/performance integration proof

## 1. Question

Can MIQO preserve PGlite/PostgreSQL schema semantics while ensuring that the authoritative persistent local representation is authenticated ciphertext rather than a plaintext PGlite data directory?

## 2. Feasibility result

Yes, at feasibility level.

The selected G3.2 path does **not** encrypt an ordinary NodeFS PGlite directory in place. Instead:

~~~text
encrypted MIQO snapshot on disk
        ↓ decrypt in memory
PGlite MemoryFS
        ↓ run exact MIQO migrations/domain operations
        ↓ dumpDataDir() in memory
authenticated encryption
        ↓ atomic durable replace
encrypted MIQO snapshot on disk
~~~

This satisfies the G3 no-security-theatre rule because the proof does not persist a plaintext PGDATA directory as the authoritative store.

## 3. Executable proof

Dedicated workflow:

~~~text
desktop-g3 #1
run id: 36167819294
head: 61753fae3d1bb469df507885ae3411465618390f
job: pglite-encryption-feasibility
result: SUCCESS
~~~

Proof summary:

~~~json
{
  "gate": "G3.2",
  "result": "PASS",
  "proofClass": "FEASIBILITY_SPIKE",
  "pgliteVersion": "0.5.8",
  "storageMode": "MEMORY_PGLITE_PLUS_AUTHENTICATED_ENCRYPTED_SNAPSHOT",
  "encryption": "AES-256-GCM",
  "keySource": "EPHEMERAL_TEST_ONLY",
  "persistentPlaintextPgdata": false,
  "migrationCount": 13,
  "lockedProfileRestartParity": "PASS",
  "secondCheckpointRestart": "PASS",
  "wrongKeyFailClosed": "PASS",
  "tamperAuthentication": "PASS",
  "plaintextMarkerPersistentScan": "PASS",
  "atomicReplaceTempCleanup": "PASS",
  "boundary": "SYNTHETIC_ONLY",
  "decision": "GO_TO_G3.3_WITH_DURABILITY_INTEGRATION_REQUIRED"
}
~~~

Encrypted store SHA-256 from the proof:

~~~text
7939672eb25a1a4974c0cb55a329f36d9be2410c594ed07b7e26867140afcb42
~~~

Encrypted store size in this uncompressed feasibility proof:

~~~text
42,395,173 bytes
~~~

## 4. Exact migration/schema parity proved

The spike applied the exact MIQO PGlite migration set `0001` through `0013` in memory, including the existing risk-profile, optimisation, scenario, provider-evidence, normalisation, integrity, recommendation and explainability schema.

The proof then created a synthetic profile, wrote protected factual data, locked the profile, persisted an encrypted snapshot, destroyed the first PGlite instance, decrypted and reopened the snapshot in a new PGlite instance, and re-read the locked profile/value.

A second mutation/checkpoint/restart cycle also passed.

G3.2 therefore has evidence that encrypted snapshot round-tripping does not inherently break the existing PostgreSQL-oriented PGlite schema or locked-profile persistence semantics.

## 5. Authentication/fail-closed evidence

The feasibility proof established:

- wrong encryption key → authentication failure;
- modified ciphertext → authentication failure;
- plaintext sensitive marker exists in the in-memory control dump but is absent from the persisted encrypted envelope;
- temporary checkpoint file is removed after atomic replacement;
- no plaintext PGDATA directory is created by the feasibility architecture;
- restart requires decrypting the authenticated envelope before PGlite starts.

These results are feasibility evidence only; G3.3 must integrate the mechanism with the actual packaged runtime and G3.4 must bind it to the Windows key hierarchy.

## 6. Why ordinary NodeFS is not the selected G3 path

PGlite's normal Node persistence writes the database directly to the host filesystem. That is the behaviour certified in G1/G2, but it does not provide MIQO-controlled at-rest encryption.

PGlite exposes a filesystem abstraction and supports custom filesystems, so a low-level encrypted VFS is technically conceivable. However, a production custom VFS would need to correctly implement PostgreSQL/PGlite synchronous filesystem semantics including random reads/writes, truncation, mmap/msync behaviour, rename/unlink, durability and crash recovery.

For G3 this would materially enlarge the trusted security/storage codebase and create a new database-filesystem correctness problem.

Therefore G3.2 does **not** select a custom encrypted VFS.

## 7. Selected G3.3 architecture

### 7.1 Runtime model

~~~text
Tauri
  ↓ obtains K_AT_REST through G3.1 hierarchy
private one-shot IPC
  ↓
Packaged API process
  ↓
decrypt authenticated snapshot into memory
  ↓
PGlite MemoryFS
~~~

No normal PGlite NodeFS data directory is authoritative in the protected mode.

### 7.2 Durable mutation contract

G3.3 must not rely on shutdown-only encryption.

Every externally acknowledged mutation must follow:

~~~text
serialize mutation
  ↓
execute MIQO mutation in PGlite
  ↓
dump current PGDATA in memory
  ↓
encrypt authenticated snapshot
  ↓
write temporary ciphertext file
  ↓
flush/fsync
  ↓
atomic replace of active ciphertext
  ↓
only then acknowledge request success
~~~

If durable checkpointing fails after the in-memory database mutation, the API must enter a fail-closed write-fault state. It may not continue serving additional mutations against state that was not durably committed. The controlled recovery is process restart from the last authenticated durable snapshot.

### 7.3 Migration/startup contract

Startup must:

1. validate keyring/security state;
2. obtain `K_AT_REST` through private IPC;
3. authenticate/decrypt the active snapshot when present;
4. load it into PGlite MemoryFS;
5. run required migrations in memory;
6. checkpoint the migrated state durably before declaring the API ready;
7. fail closed if any protected-store authentication or migration checkpoint fails.

First-run initialisation may create a new encrypted store only when no protected data/key conflict exists under the G3.1 state machine.

## 8. Encryption envelope requirements

G3.3 must retain authenticated encryption and explicit versioning.

Minimum envelope metadata:

~~~text
magic
formatVersion
keyVersion/keyId reference
algorithm identifier
nonce
authentication tag
ciphertext
~~~

Algorithm for the current proof is AES-256-GCM with a unique 96-bit random nonce per checkpoint. G3.3 may retain this algorithm if the implementation uses maintained platform/runtime cryptographic primitives and preserves nonce uniqueness.

Encryption keys are never persisted in the envelope.

## 9. Atomicity and rollback rule

The active encrypted store must never be replaced by a partially written checkpoint.

Required model:

~~~text
active.enc
   ↑ atomic replace only after successful write + flush
staging.tmp
~~~

A failed checkpoint leaves the previous authenticated `active.enc` authoritative.

G3.3 must prove recovery from an interrupted/incomplete staging file.

## 10. Performance risk

The uncompressed feasibility snapshot is approximately 42.4 MB even with a small synthetic dataset.

This makes full-database snapshotting on every mutation potentially expensive.

G3.3 therefore has an explicit performance acceptance requirement. It must record at minimum:

- encrypted checkpoint duration;
- dump duration;
- encryption duration;
- durable write/flush duration;
- startup decrypt/load duration;
- representative consecutive mutation latency;
- peak memory implications.

Compression-before-encryption may be assessed as a performance/storage optimisation, but it is not pre-authorised as a substitute for durability or security evidence.

If checkpoint latency/IO is operationally unacceptable, G3.3 must STOP and reopen the persistence architecture rather than silently weakening durability.

## 11. Crash consistency risk

The G3.2 spike proves authenticated snapshot/restart semantics under orderly execution. It does not yet prove process/power interruption during:

- database mutation;
- dump generation;
- encryption;
- temporary-file write;
- flush;
- atomic replacement.

Those are mandatory G3.3/G3.8 negative tests.

## 12. Scope of the GO decision

GO means:

- PGlite remains the selected database semantics;
- MemoryFS + encrypted durable snapshots is authorised for G3.3 implementation/proof;
- G3.1 key material may be connected only through the private IPC boundary;
- no plaintext persistent PGDATA directory is permitted in protected mode.

GO does **not** mean:

- production-ready encryption is already certified;
- G3.1 DPAPI key wrapping has been implemented;
- performance is accepted;
- crash durability is accepted;
- local API/session hardening is complete;
- real customer/provider data is authorised.

## 13. Fallback trigger

G3.3 must stop and reopen the persistence decision if any of the following cannot be proven:

- durable checkpoint-before-acknowledgement;
- authenticated restart after repeated mutations;
- acceptable checkpoint performance;
- no persistent plaintext database artefacts;
- safe migration under encryption;
- clean G2 domain/integrity/recommendation regressions;
- deterministic fail-closed recovery from corruption/interruption.

Only after such a STOP may a separately controlled SQLite/SQLCipher or custom-VFS fallback be evaluated.

## 14. External architecture basis

PGlite officially supports an in-memory filesystem, `loadDataDir` for loading a data-directory tarball, `dumpDataDir` for exporting the database, and an explicit `fs` abstraction. Its filesystem documentation also notes that the VFS layer is under active development.

These capabilities support the G3.2 feasibility architecture, but the PASS decision is based on MIQO's executable proof on PGlite 0.5.8, not documentation alone.

## 15. G3.2 acceptance state

~~~text
G3.0                       PASS
G3.1                       PASS
G3.2 feasibility execution PASS
dedicated desktop-g3 CI    PASS on executable evidence head
inherited repository CI    pending on decision-record head
G3.3                       NOT STARTED
~~~

G3.2 becomes formally complete only after both inherited `ci` and dedicated `desktop-g3` are GREEN on the exact decision-record head.