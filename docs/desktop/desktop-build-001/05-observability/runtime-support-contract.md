# DB-G6 Runtime Observability & Support Contract

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G6 — Observability, Diagnostics & Supportability  
**Status:** FROZEN AT DB-G6

## Correlation

Desktop native transport generates a standards-shaped W3C `traceparent` for every logical API read. Fastify validates caller trace context separately from its own request ID, creates a server trace when incoming context is invalid/missing, logs both identifiers and returns safe correlation headers.

Desktop rejects a response that supplies a contradictory `x-miqo-trace-id`.

## Safe API identity

Every API response exposes only safe operational headers: request ID, trace ID, API semantic version, CI/build ID and source commit. Business response payloads are unchanged.

## Local operational state

Desktop retains only current-session correlation/build/health metadata in memory. Structured local logs use stable event/reason codes and correlation identifiers. They do not record tokens, credentials, raw provider bodies or profile/customer payloads.

Log retention remains bounded to five files and seven days.

## Diagnostics

The System route may display application/build/profile identity, package architecture, API health/build identity, session/trace/request references and bounded log-directory statistics. Diagnostics do not self-certify business integrity, provider connectivity or production readiness.

## Support evidence

The operator may explicitly generate a redacted in-memory support snapshot containing diagnostic metadata only plus a SHA-256 checksum.

The snapshot excludes tokens/credentials, raw provider payloads, profile/customer payloads, database/private-key material and memory dumps.

DB-G6 does not auto-upload, email or persist that snapshot and introduces no broad filesystem/dialog capability. An operator-selected exported bundle remains a later hardening enhancement if separately authorised.

## Authority

DB-G6 creates operational/support evidence only. It does not modify domain/audit evidence, execute mutations, rank/compare/recommend, activate providers, or enable production identity/environments.

`CC-G6-001` is closed for the current TEST/SYNTHETIC stack by DB-G6.
