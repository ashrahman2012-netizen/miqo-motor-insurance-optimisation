# DESKTOP-G3 / G3.0 — Frozen Security Inventory, Threat Model & Sensitive-Data Classification

**Gateway:** DESKTOP-G3  
**Sub-gate:** G3.0  
**Branch:** `miqo/desktop-g3`  
**Certified entry SHA:** `e42cfb1dd9d57195606352973b125d210263f509`  
**Tracker:** issue #13  
**Status:** READY FOR ACCEPTANCE REVIEW

## 1. Objective

Freeze the actual security posture inherited from DESKTOP-G2 before changing runtime, persistence, cryptographic or local-authentication behaviour. G3.0 is inventory/classification only and does not claim remediation.

## 2. Inherited runtime topology

~~~text
Tauri 2 native host
  +-- packaged Node 22.23.3
  +-- Fastify API          127.0.0.1:4000
  +-- customer Next app    127.0.0.1:3000
  +-- admin Next app       127.0.0.1:3001
  +-- PGlite 0.5.8        app-local filesystem persistence
~~~

DESKTOP-G2 proved that the installed runtime does not require host Node, npm, Docker or external PostgreSQL.

## 3. Local persistence inventory

Current Tauri resolution is `app.path().app_local_data_dir()?.join("pglite")`. The directory is passed to the packaged API through `MIQO_PGLITE_DATA_DIR`, and the database adapter currently executes `PGlite.create(dataDir)`.

DESKTOP-G2 intentionally certifies uninstall → preserve app-local PGlite data → reinstall → reconnect to retained data. G3 inherits that lifecycle until a security requirement changes it through a controlled decision.

## 4. Persisted sensitive-data inventory

| Table / payload | Security classification |
|---|---|
| `canonical_field_value.value_json` | protected customer factual/verified/derived value |
| `discrepancy.declared_value_json` / `verified_value_json` | protected declared/verified evidence |
| `optimisation_preference.value_json` | protected customer-selected choice |
| `scenario.preference_snapshot_json` / `scenario_delta.value_json` | protected scenario/customer-choice data |
| `raw_provider_response.payload_json` / `payload_text` | protected provider evidence |
| `integrity_signal.evidence_json` / `final_integrity_result.evidence_json` | potentially protected evidence |
| `audit_event.metadata_json` | potentially protected audit detail |
| `candidate_vehicle.vehicle_snapshot_json` | protected vehicle/customer-derived evidence |
| recommendation/explanation evidence JSON fields | protected quote/recommendation evidence where customer/provider derived |
| opaque IDs, timestamps, non-secret fingerprints, version metadata | normally technical metadata; linkability still considered |

These classifications are frozen for G3 design even though execution remains synthetic.

## 5. Current secret/authority inventory

The packaged Tauri runtime currently contains the inherited synthetic constant `DB-G10-SYNTHETIC-ADMIN` and passes it through `MIQO_SYNTHETIC_ADMIN_KEY` / `MIQO_SYNTHETIC_ADMIN_GATE`. The API compares `x-miqo-synthetic-admin` against the configured value for `/admin/*`.

Classification: TEST/SYNTHETIC GATE ONLY. It is not a production secret and is not acceptable as future production authority.

No certified production store currently exists for provider credentials, access/refresh tokens, cryptographic master keys or per-launch local capability secrets.

## 6. Current Windows key-management state

~~~text
MIQO-controlled master key          ABSENT
Windows current-user key wrapping   ABSENT
key version                         ABSENT
key rotation                        ABSENT
wrong-user proof                    ABSENT
wrong-machine proof                 ABSENT
corruption recovery                 ABSENT
~~~

G3 therefore must not claim at-rest encryption or production secret protection at entry.

## 7. Tauri/WebView inventory

Current Tauri configuration records `"security":{"csp":null}`.

Inherited runtime controls still include disabled devtools, loopback-only navigation and packaged UI ports limited to 3000/3001. G3.6 must replace the null CSP posture with an explicit packaged web security policy.

## 8. Fastify/local HTTP inventory

Existing controls include loopback binding, customer/admin origin restrictions, mutation rate limiting, body-size bounds, no-store, no-referrer, disabled camera/microphone/geolocation, frame deny, response CSP and the synthetic admin header gate.

Remaining frozen risk: `127.0.0.1` reachability is not authenticated authority. A same-user malicious process can potentially address loopback services. G3.5 owns the explicit per-launch capability/session boundary.

## 9. Logging/diagnostic inventory

Tauri currently launches packaged Node children with inherited stdout/stderr. Fastify runs with logging enabled and records unhandled errors with request IDs.

G3 has not yet proven that future keys, provider credentials, local capability tokens, protected customer payloads or raw provider payloads can never appear in logs/support evidence. G3.7 owns that proof.

## 10. Trust boundaries

Trusted for G3: certified packaged Tauri/resources, validated packaged Node, MIQO domain/service code, current Windows user context, approved app-local storage and synthetic fixtures.

Not automatically trusted: other local processes, environment variables as durable secret storage, logs, copied data directories, copied key blobs, another Windows user, another machine, loopback origin claims without capability proof, and any future real provider/customer input.

## 11. Threat actors / misuse cases

1. Local file reader obtains the preserved application data directory.
2. Different Windows user obtains copied MIQO files.
3. Different machine receives copied MIQO files.
4. Malicious local process calls the API on loopback.
5. Package analyst extracts static constants.
6. Log/support-bundle reader searches for protected values.
7. Corruption/tampering modifies protected data or key material.
8. Reinstall accidentally creates a new key and silently abandons retained protected data.
9. Downgrade attempts to bypass security format/version requirements.
10. Crash/startup failure leaves protected plaintext or secret material on disk.

## 12. Frozen fail-closed requirements

G3 must fail closed when:

- key material is missing while protected data exists;
- protected key material cannot be unwrapped;
- another Windows user/security context attempts key use;
- data authentication/integrity verification fails;
- encrypted-data format/version is unknown;
- security policy/config is unknown or below the certified minimum;
- local API capability is missing/invalid;
- a migration would require plaintext fallback.

No security failure may silently downgrade to unencrypted persistence.

## 13. G3.0 acceptance criteria

G3.0 may PASS only when the G2 baseline is frozen exactly, sensitive persisted classes are inventoried, static-secret/key gaps are explicit, local service and logging boundaries are explicit, threat actors are recorded, fail-closed rules are frozen, and no unsupported executable security claim is made.

## 14. Current determination

~~~text
ENTRY BASELINE          FROZEN
SECURITY INVENTORY      COMPLETE
THREAT MODEL            COMPLETE
DATA CLASSIFICATION     COMPLETE
FAIL-CLOSED RULES       FROZEN

G3.0                    READY FOR ACCEPTANCE
G3.1–G3.10              NOT STARTED
~~~

Acceptance of G3.0 does not authorise real data, live providers, production identity, signing or production deployment.