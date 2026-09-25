# DESKTOP-G3 / G3.3 — Local Data-at-Rest Protection Implementation & Durable Checkpoint Integration

**Gateway:** DESKTOP-G3  
**Sub-gate:** G3.3  
**Branch:** `miqo/desktop-g3`  
**Certified G2 baseline:** `e42cfb1dd9d57195606352973b125d210263f509`  
**G3.2 decision head:** `13e6a06aa79eac6beac10e2fc3c8cf06f1478b38`  
**G3.3 executable evidence head:** `4723594d2454fdfcdd0d81de7db252fd6b869267`  
**Tracker:** issue #13  
**Status at creation:** implementation/evidence PASS; documentation-head CI pending.

## 1. Result

G3.3 implements the G3.2 selected protected persistence architecture in the MIQO database/API runtime.

The protected backend is:

~~~text
MIQO_DB_BACKEND=pglite-protected
        ↓
32-byte K_AT_REST received through a private inherited descriptor
        ↓
authenticated encrypted snapshot on disk
        ↓ decrypt + gunzip in memory
PGlite MemoryFS
        ↓
MIQO migrations/domain services
        ↓
successful mutation
        ↓
dump PGDATA in memory
        ↓ gzip level 1
        ↓ AES-256-GCM
        ↓ durable staging write + flush
        ↓ atomic replace
        ↓
only then response ACK
~~~

No normal plaintext PGlite NodeFS directory is authoritative in `pglite-protected` mode.

## 2. Code implemented

- `packages/db/src/protected-pglite.ts` — protected PGlite runtime, authenticated envelope, durable checkpointing, migration bootstrap, metrics and fault state.
- `packages/db/src/client.ts` — new `pglite-protected` backend and durability runtime contract.
- `apps/api/src/server.ts` — serialised mutation gate, checkpoint-before-ACK hook, durability fault handling and read ordering behind pending durable mutations.
- `scripts/desktop-g3-protected-runtime-proof.mjs` — real API/runtime restart and persistence proof with one-shot synthetic key handoff.
- `.github/workflows/desktop-g3.yml` — dedicated Windows G3.2/G3.3 evidence jobs.

## 3. Protected envelope

G3.3 uses maintained Node cryptographic primitives:

~~~text
AES-256-GCM
unique 96-bit random nonce per checkpoint
authenticated fixed MIQO G3 AAD
explicit envelope magic
format version
key version
authentication tag
ciphertext
~~~

The PGDATA tar representation is gzip-compressed in memory before encryption. Compression is a storage/performance optimisation only; authenticated encryption remains the protection boundary.

## 4. Key boundary

G3.3 deliberately does **not** claim that the Windows DPAPI lifecycle is implemented.

The executable proof generates a 32-byte synthetic key in the parent proof process and passes it exactly once to the API through an inherited private file descriptor/pipe. The key is not passed in command-line arguments, ordinary environment variables, query strings, logs or plaintext files.

Production key generation, user/machine wrapping, reinstall recovery, rotation, wrong-user/wrong-machine behaviour and corruption recovery remain G3.4 responsibilities.

## 5. Migration/startup contract

`pglite-protected` startup now:

1. obtains the 32-byte in-memory key through the private descriptor;
2. authenticates/decrypts the encrypted store when present;
3. loads the recovered PGDATA into PGlite MemoryFS;
4. runs the exact MIQO migration set with migration-hash validation;
5. checkpoints the resulting state durably before API readiness;
6. fails closed on unknown envelope/key version or authentication failure.

First-run protected operation starts an in-memory PGlite instance, applies migrations and creates the encrypted durable store before reporting readiness.

## 6. Mutation durability contract

For the protected backend, successful mutation requests are serialised. A successful mutating handler is not acknowledged until `runtime.checkpoint()` has completed.

Checkpoint sequence:

~~~text
PGlite dumpDataDir()
→ gzip in memory
→ AES-256-GCM
→ write <active>.tmp
→ flush file
→ atomic rename/replace active encrypted store
→ release mutation gate
→ ACK response
~~~

The API emits `x-miqo-durability: checkpointed-before-ack` only after the durable checkpoint succeeds.

Non-mutating reads are ordered behind pending protected mutations, preventing a concurrent read from observing a mutation while its durable checkpoint is still pending.

If checkpointing fails, the protected runtime enters a durability-fault state. Further non-health activity fails closed rather than continuing writes against a non-durable in-memory state.

## 7. Exact executable evidence

Dedicated workflow:

~~~text
desktop-g3 #11
run id: 36186296201
head: 4723594d2454fdfcdd0d81de7db252fd6b869267
conclusion: SUCCESS
~~~

Jobs:

- `pglite-encryption-feasibility` — PASS
- `protected-runtime-integration` — PASS

G3.3 proof summary:

~~~json
{
  "gate": "G3.3",
  "result": "PASS",
  "proofClass": "PROTECTED_API_RUNTIME_INTEGRATION",
  "backend": "pglite-protected",
  "durabilityMode": "CHECKPOINT_BEFORE_ACK",
  "encryption": "AES-256-GCM",
  "compression": "gzip-level-1",
  "persistentPlaintextPgdata": false,
  "checkpointCount": 10,
  "checkpointMaxMs": 390.61,
  "checkpointP95Ms": 390.61,
  "restartLockedProfile": "PASS",
  "secondRestart": "PASS",
  "lockedMutationRejectedWithoutCheckpoint": "PASS",
  "plaintextMarkerPersistentScan": "PASS",
  "protectedStoreBytes": 5878232,
  "keySource": "ONE_SHOT_PRIVATE_FD_SYNTHETIC_PROOF",
  "boundary": "SYNTHETIC_ONLY"
}
~~~

The measured latency is CI/synthetic evidence, not a production user-facing latency SLO.

## 8. Artifact evidence

Primary G3.3 artifact:

~~~text
name: desktop-g3-g3.3-protected-runtime-4723594d2454fdfcdd0d81de7db252fd6b869267
id: 10886019921
digest: sha256:346ad6469a3fb17573d018c9f0715aa10a405d3be7fcc70c10993e89500b4f00
~~~

The artifact contains the protected encrypted store, checkpoint metrics and proof evidence.

## 9. Inherited regression evidence

On the same executable evidence head:

~~~text
ci #921
run id: 36186296086
conclusion: SUCCESS
~~~

Jobs:

- `locked-dependencies` — PASS
- `postgres-contract` — PASS
- `target-stack-sprint1` — PASS
- `db-g10-hardening` — PASS

This establishes that the protected persistence implementation did not weaken the inherited PostgreSQL reference contract, target-stack behaviour or DB-G10 hardening evidence.

## 10. Domain/integrity observations

The G3.3 runtime proof specifically confirms:

- exact migrations are applied under protected startup;
- factual values survive authenticated encrypted restart;
- a locked risk-profile version survives restart;
- a post-lock factual mutation is rejected with the durable store unchanged;
- a correction workflow can checkpoint and survive a second restart;
- the protected store does not expose the known sensitive marker in plaintext.

Full recommendation/browser/installer regressions remain inherited GREEN and will be repeated under later integrated security certification gates as appropriate.

## 11. Performance/storage observation

The G3.2 uncompressed feasibility store was approximately 42.4 MB. G3.3's gzip-before-encryption implementation reduced the representative protected store to approximately 5.88 MB.

Ten checkpoints completed in the Windows CI proof with a recorded maximum/P95 of approximately 390.61 ms for this synthetic workload.

This supports continued implementation. It does not establish a production workload SLO; larger realistic datasets remain a downstream performance concern.

## 12. Residual risks carried to G3.4+

1. DPAPI user/machine key wrapping is not yet implemented.
2. Key rotation/recovery/corruption state machines are not yet executable.
3. Wrong-user and wrong-machine fail-closed behaviour is not yet proved.
4. Installer/Tauri ownership of the protected key lifecycle is not yet proved.
5. Static synthetic admin-gate authority still exists and remains assigned to G3.5.
6. Tauri CSP remains assigned to G3.6.
7. Log/support-evidence redaction remains assigned to G3.7.
8. Crash-cut, tamper, plaintext/secret scans and broader negative security testing remain assigned to G3.8.
9. Signing, real identity, real provider credentials/data and production activation remain prohibited.

## 13. Gate determination

Executable evidence supports:

~~~text
G3.0  PASS
G3.1  PASS
G3.2  PASS
G3.3  IMPLEMENTATION + EXECUTABLE PROOF PASS
G3.4  NOT STARTED
~~~

Because this record changes the branch head, G3.3 should be marked formally complete only after both inherited `ci` and dedicated `desktop-g3` are GREEN on this documentation-only head.

## 14. Next controlled gate

After exact-head GREEN certification, proceed to:

**G3.4 — Windows Protected Key Lifecycle, Rotation, Corruption & Wrong-Context Fail-Closed Proof**

G3.4 will connect the protected persistence machinery to the G3.1 Windows user+machine key hierarchy without changing the G3.3 encrypted-store semantics.