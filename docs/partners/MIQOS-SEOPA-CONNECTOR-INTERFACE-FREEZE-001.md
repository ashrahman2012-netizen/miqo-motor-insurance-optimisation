# MIQOS–SEOPA Connector Interface Freeze — MIQOS-SIF-001 v1.0

**Date:** 10 October 2026. **Status:** MIQOS-side synthetic contract candidate — not a SEOPA-endorsed or production API specification.

## Frozen MIQOS-facing interface

**Module:** `contracts/seopa-connector/miqos-interface.mjs`, version `MIQOS-SEOPA-CONNECTOR-IF-001-v1.0`. Its exported request validator, deterministic state transition function, mock response simulation and certification receipt are pure, non-routable, without network calls or persistence. The integration branch changes no customer API routes, customer web UI, migrations or optimisation objective activation.

**Request structure:** `interfaceVersion`, `environment`, `requestId`, `idempotencyKey`, `createdAt`, `expiresAt`, locked synthetic `profile` (ID, version, facts hash, opaque synthetic reference), explicitly confirmed `intent` (revision, cover, payment modes, optional maximum total excess, telematics acceptance), `providerSlot=SEOPA_UNMAPPED`. The contract does not expose real personal information or real insurer fields.

**Mock response:** `requestId`, validated facts-fingerprint equality, `UNMAPPED_SYNTHETIC_V1`, payload fingerprint, quote stubs, `UNVERIFIED` status and mandatory block codes. Quote stubs cannot be ranked or purchased. **No interpretation of actual SEOPA response fields is assumed.**

## Lifecycle and failures

`CREATED → VALIDATED → SUBMITTED → RESPONDED → NORMALISED` (modelled as state transitions, not actual network submission). Explicit terminal states are `REJECTED`, `EXPIRED` and `CANCELLED`; disallowed transitions fail with `IF_INVALID_TRANSITION`. Contract, profile, intent, validity, permissions, authentication, coverage, finance, mapping and response-verification errors are assigned stable `IF_*` codes.

## Missing SEOPA-only information (hard external dependencies)

1. Written headless/API-versus-hosted/affiliate model, authorisation, sandbox and production account availability.
2. Actual versioned request/response payloads, quote reference, insurer identity, mandatory motor risk questions, referral and renewal flows.
3. Confirmed full premium/IPT/fee/finance structure, policy limitations/benefits/excess semantics, policy expiry and cover parity.
4. Quote-display, ranking, reshuffling, retention, affiliate attribution and insurer permissions.
5. FCA distribution and Consumer Duty allocation, complaints/support responsibility, data-controller and processing role, signed agreement.
6. Network protocol, authentication and token lifecycle, rate limits, error semantics, API certification and operating SLA.

## Next engineering mapping gateway

When documented partner schemas arrive, add a separately reviewed **SEOPA-specific transport + mapper** that translates each documented provider field into the frozen MIQOS-facing contract, with source fingerprints, prohibited-unknown-field rejection, contract tests, sandbox authorisation and release gates. Do not modify locked facts to obtain a price. SEOPA input or output fields remain unspecified until verified.

## Acceptance criteria

- 23 current connector contract/lifecycle/adversarial tests pass alongside the 108 BV3/BV4/BV5 tests.
- Applicable four-job baseline repository CI GREEN on the exact immutable final branch HEAD.
- Customer API routes, database objective, `main` and live provider flags unchanged.
- The Partner Decision Series may describe an **MIQOS-side interface freeze and synthetic adapter readiness**, but must not assert that connecting an API key is sufficient for live customer quotations.

**No SEOPA-issued technical specification or agreement is represented by this document.** See issues #40 (BV5 integration), #41 (regulatory) and #42 (partner certification).
