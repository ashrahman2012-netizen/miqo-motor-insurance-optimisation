# DB-G5 acceptance — Deep Audit, Trace & Decision-Evidence Surfaces

**Programme:** MIQOS-DESKTOP-BUILD-001  
**Gateway:** DB-G5 — Deep Audit, Trace & Decision-Evidence Surfaces  
**Result:** PASS  
**Date:** 2026-09-23  
**Entry SHA:** `4194504c0c007bae86612a5c11f9a1ea750129f0`  
**Accepted executable source:** `1be0f6480d9a516daf0df93effcf4a66997bb67c`

## Accepted scope

DB-G5 activates read-only, selection-linked decision evidence without moving decision authority into Desktop.

Accepted implementation includes:

- exact Selection ID entry from Audit & Trace and the decision-evidence top-level routes;
- authoritative SP4 selection trace retrieval via the existing `GET /admin/selections/:selectionId/sp4-trace` resource;
- trace-linked append-only audit and discrepancy evidence for the trace profile;
- trace-linked raw-provider response retrieval for the surfaced quote request only;
- scenario exploration evidence including generation version, fingerprints and persisted O-class deltas;
- market-route evidence including route/provider/channel/adaptor/mapping identity;
- quote-request and raw-provider identifiers/fingerprints;
- normalised quotation values and persisted comparison state;
- persisted evidence status, exclusion reason and ordinal;
- recommendation-set, rule-version, fingerprint, surfaced quote and explanation evidence;
- final-integrity result and evidence;
- application-adapter composition into the existing Admin Audit/Trace ViewModel;
- raw-provider/normalised-evidence side-by-side presentation;
- lineage and append-only audit timeline presentation;
- fail-closed checks for selection mismatch, surfaced quote mismatch and raw-provider/quote-request mismatch.

## Decision-authority boundary

Desktop renders persisted/supplied evidence only. It does **not**:

- generate scenarios;
- evaluate eligibility;
- calculate route evidence status;
- calculate quote comparability;
- rank or ordinalise quotations;
- choose a surfaced quote;
- generate a recommendation;
- generate recommendation reasons;
- evaluate final integrity;
- mutate selection/recommendation/integrity state;
- execute quote requests or activate providers.

No favourable state is inferred when authoritative evidence is absent.

## Native read boundary

The DB-G4 `admin-read` capability gains exactly one new exported command:

`load_admin_selection_trace(selectionId)`

The command uses the typed native operation allow-list and may read only:

- `GET /admin/selections/:selectionId/sp4-trace`;
- existing `GET /admin/audit?profileId=...`;
- existing `GET /profiles/:profileId/discrepancies`;
- `GET /quote-requests/:quoteRequestId/raw-response` for the quote request linked to the persisted surfaced normalised quote.

Selection and quote-request identifiers are validated before path construction. The profile ID and surfaced quote request are derived from the authoritative trace, not supplied independently by the renderer.

The Tauri main-window capability exposes exactly six approved runtime/read commands and no generic HTTP/shell/filesystem permission.

## Repair history

Intermediate DB-G5 commits are retained as evidence rather than rewritten:

1. `2ee749afbe8df995b7362b9c30effe9ab65256e6` — least-privilege selection-trace transport. Repository CI passed; superseded before full Windows proof completed.
2. `672d39edf1ea34103da213269b0a51f464186030` — authoritative decision-trace composition. Repository CI passed; superseded before full Windows proof completed.
3. `435596e55481a9d9f8e73095e642a89f0d815092` — read-only deep trace surfaces. Repository CI passed; superseded before full Windows proof completed.
4. `6c28b92a64f916d931bf221b87a5bce5e280f56b` — deep trace proof/tests. Repository CI and G8 API integration passed, but G7/G8 Windows jobs failed at `cargo fmt --check` only.
5. `1be0f6480d9a516daf0df93effcf4a66997bb67c` — formatter-prescribed Rust layout repair; full validation chain passes.

The formatter repair changes layout only and does not alter authority or behaviour.

## Exact executable delta

`4194504c0c007bae86612a5c11f9a1ea750129f0` → `1be0f6480d9a516daf0df93effcf4a66997bb67c` is five commits ahead / zero behind.

Executable changes are confined to:

```text
apps/admin-desktop/src-tauri/build.rs
apps/admin-desktop/src-tauri/capabilities/admin-read.json
apps/admin-desktop/src-tauri/src/lib.rs
apps/admin-desktop/src/app/DesktopApp.tsx
apps/admin-desktop/src/app/navigation.ts
apps/admin-desktop/src/routes/AuditRoute.tsx
apps/admin-desktop/src/routes/DecisionEvidenceEntryRoute.tsx
apps/admin-desktop/src/routes/DecisionTraceRoute.tsx
apps/admin-desktop/src/services/admin-decision-trace.ts
apps/admin-desktop/src/services/contracts.ts
apps/admin-desktop/src/services/tauri-transport.ts
apps/admin-desktop/src/styles.css
apps/admin-desktop/test/admin-audit.test.ts
apps/admin-desktop/test/api-integration.test.ts
apps/admin-desktop/test/core-evidence.test.ts
apps/admin-desktop/test/decision-trace.test.ts
scripts/desktop-g8-proof.ps1
```

No Fastify API implementation, domain logic, database migration, shared package implementation, dependency version, lockfile or workflow file changes.

## Exact-source proof

Accepted executable source `1be0f6480d9a516daf0df93effcf4a66997bb67c` is green under:

- push `ci` #703 / run `35864041573` — SUCCESS
  - target-stack-sprint1 `107191033691`
  - locked-dependencies `107191033864`
  - postgres-contract `107191034313`
- PR `ci` #704 / run `35864048673` — SUCCESS
  - target-stack-sprint1 `107191055693`
  - postgres-contract `107191056079`
  - locked-dependencies `107191056171`
- Desktop G7 #227 / run `35864048707` — SUCCESS
  - Windows Desktop preflight/full `107191064072`
  - artifact `10752302962`
  - digest `sha256:289922f11bc1eb6331e3ddeb997018ba91564e0bd0f0b665fe79b18945997422`
- Desktop G8 #47 / run `35864048690` — SUCCESS
  - Windows installed Desktop skeleton proof `107191055973`
  - Desktop service / certified API integration `107191056534`
  - Windows artifact `10752512798`, digest `sha256:488c3ad1d208d2928aa5dc68e9ef60ae38880d6d8e7008431150d05c82b87ea4`
  - API artifact `10752050389`, digest `sha256:4c3d9e863eacbc8ec395921dbc558dee990f052c79f5938ec1ab0bcfcc9987c9`

The Windows PR proof uses synthetic merge SHA `96146cb13599757ce68f8bcf2f9ef04c9c47a6c3` paired with exact branch head `1be0f6480d9a516daf0df93effcf4a66997bb67c`.

## Boundary review

| Question | Result |
|---|---|
| Desktop ranking introduced? | No |
| Desktop comparability calculation introduced? | No |
| Desktop recommendation generation introduced? | No |
| Desktop integrity evaluation introduced? | No |
| Quote/provider execution introduced? | No |
| Admin mutation introduced? | No |
| Direct DB access introduced? | No |
| New Fastify endpoint introduced? | No |
| Generic native HTTP introduced? | No |
| Raw response detached from authoritative quote request? | No; correlation is fail-closed |
| Environment/identity authority changed? | No |
| Dependency/workflow authority changed? | No |

## Exit

**DB-G5 = PASS.**

DB-G6 — Observability, Diagnostics & Supportability remains **NOT STARTED** and requires a separate controlled execution step.

DB-G5 does not certify production identity/RBAC, non-synthetic environments, provider activation, signing, production release or go-live.
