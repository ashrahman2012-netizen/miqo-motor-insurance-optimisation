# DB-G6 Runtime Observability & Support Contract

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G6 — Observability, Diagnostics & Supportability  
**Status:** IMPLEMENTATION CANDIDATE — PROOF PENDING

## Correlation
Desktop native transport generates a standards-shaped W3C `traceparent` for every logical API read. The Fastify boundary validates caller trace context separately from its own request ID, creates a server trace when incoming context is invalid/missing, logs both identifiers and returns safe correlation headers.

## Safe API identity
Every API response exposes only safe operational headers: request ID, trace ID, API semantic version, CI/build ID and source commit. Business response payloads are unchanged.

## Local operational state
Desktop retains only current-session correlation/build/health metadata in memory. Structured local logs use stable event/reason codes and do not record tokens, credentials, raw provider bodies or profile/customer payloads.

## Diagnostics
The System route may display application/build/profile identity, package architecture, API health/build identity, session/trace/request references and bounded log-directory statistics. Diagnostics do not self-certify business integrity, provider connectivity or production readiness.

## Support evidence
The operator may explicitly generate a redacted support snapshot containing diagnostic metadata only plus a SHA-256 checksum. DB-G6 does not auto-upload, email or persist that snapshot, and does not package raw log/business payload content. An operator-selected ZIP bundle remains a later hardening enhancement; no broad filesystem/dialog capability is introduced at DB-G6.

## Authority
DB-G6 creates operational/support evidence only. It does not modify domain/audit evidence, execute mutations, rank/compare/recommend, activate providers, or enable production identity/environments.
