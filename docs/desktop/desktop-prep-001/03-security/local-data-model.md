# MIQOS Desktop Local Data Model v1.0

**Gateway:** G3  
**Status:** FROZEN AT G3

## 1. Principle

Authoritative MIQOS business data is server-side.

Desktop local persistence is minimised and must not become an offline shadow database.

## 2. Persisted locally — permitted classes

| Data class | Default |
|---|---|
| refresh credential | only if IdP/policy issues and permits it; Windows secure credential store |
| non-secret application settings | permitted if required and scoped per user |
| UI preferences | permitted if non-sensitive |
| application version/install metadata | permitted |
| diagnostics/log metadata | permitted subject to G6 redaction/retention |

## 3. Not persisted by default

- access token;
- ID token;
- raw provider payloads;
- profile factual records;
- recommendation sets;
- audit timelines;
- discrepancy contents;
- integrity evidence;
- full API response cache;
- customer personal data.

These may exist transiently in process memory while displayed.

## 4. Cache policy

The initial Desktop architecture has no persistent authoritative-data cache.

If a future cache is proposed, it requires:

- data classification;
- encryption-at-rest design;
- retention/expiry;
- user/profile isolation;
- stale-state UX;
- purge/logout behaviour;
- threat review;
- explicit approval.

## 5. Export/download

Raw evidence or report export is **not** an implicit Desktop privilege.

Any future export must define:

- permission;
- exact data scope;
- destination-selection control;
- file protection/marking;
- audit event;
- retention/user guidance.

## 6. Clipboard

Copying opaque IDs/fingerprints may be permitted.

Copying raw sensitive payloads, tokens, credentials or unrestricted customer data is not authorised by G3 and requires explicit UX/security design.

## 7. Logout/purge

On logout:

- native credential entry is removed;
- sensitive in-memory data is cleared;
- any authorised ephemeral cache is purged;
- WebView state is cleared as required by implementation;
- application logs remain only under G6-controlled redaction/retention rules.

## 8. Multi-user Windows devices

Credential and local-state storage is user-scoped.

No MIQOS user credential is stored using a machine-wide shared secret model.

The Desktop application must not assume that installation identity equals signed-in MIQOS user identity.
