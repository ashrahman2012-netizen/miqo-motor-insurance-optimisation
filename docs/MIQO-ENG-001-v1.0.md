# UK Motor Insurance Quotation Optimisation System

## Repository Bootstrap & Walking Skeleton Specification v1.0

**Document ID:** MIQO-ENG-001  
**Version:** 1.0  
**Status:** Engineering Baseline — Prototype  
**Date:** 18 September 2026  
**Prototype classification:** Synthetic-data, non-production, non-customer, non-live-provider  
**Controlling architecture:** MIQO-SYS-001 v1.0  
**Prototype control:** MIQO-PROT-001 v1.0  
**Interaction baseline:** MIQO-WIRE-001 v1.0  

---

# 1. Purpose

MIQO-ENG-001 converts the approved MIQO architecture and Sprint 1–3 wireframes into an executable engineering baseline.

It fixes:

- prototype technology architecture;
- repository structure;
- domain boundaries;
- persistence boundary;
- the minimum walking-skeleton path;
- synthetic fixture contracts;
- environment controls;
- engineering acceptance gates.

It does **not** reopen product architecture or production-readiness decisions.

The first engineering objective is not feature completeness. It is a thin, deployable vertical slice proving that the MIQO domain invariants survive implementation.

---

# 2. Technology baseline

The MVP prototype shall use the following engineering baseline.

| Layer | Selection | Reason |
|---|---|---|
| Language | TypeScript | Shared domain types and compile-time contracts across UI/API/packages |
| Runtime | Node.js >= 22 | Current modern runtime baseline; active-LTS runtime should be pinned in CI |
| Monorepo | npm workspaces | Minimal bootstrap overhead and one dependency/lockfile boundary |
| Customer UI | Next.js + React + TypeScript | Responsive web implementation of customer wireframes |
| Admin UI | Next.js + React + TypeScript | Shared component/runtime model with customer UI |
| API | Node.js + Fastify + TypeScript | Explicit application/domain/service boundary with lightweight HTTP layer |
| Validation | Zod | Runtime request/schema validation at trust boundaries |
| Database | PostgreSQL 16+ | Relational integrity, versioning and traceability |
| Persistence | Drizzle ORM + explicit migrations | Typed persistence with reviewable SQL migration history |
| Unit/integration tests | Vitest plus Node invariant tests | Fast domain and service verification |
| Browser tests | Playwright | End-to-end Sprint 1–3 journey validation |
| Local infrastructure | Docker Compose | Repeatable local PostgreSQL environment |
| CI | GitHub Actions-compatible scripts | lint / typecheck / test / build / migration verification |

Exact package versions are pinned by the repository lockfile at installation time. Approved pre-existing ADRs take precedence if they conflict with a library-level implementation choice.

---

# 3. Repository architecture

The repository shall be a monorepo:

```text
miqo/
├── apps/
│   ├── customer-web/
│   ├── admin-web/
│   └── api/
├── packages/
│   ├── domain/
│   ├── canonical-model/
│   ├── questionnaire/
│   ├── validation/
│   ├── verification/
│   ├── risk-profile/
│   ├── integrity/
│   ├── optimisation/
│   ├── scenarios/
│   ├── quote-orchestration/
│   ├── mock-providers/
│   ├── normalisation/
│   ├── comparison/
│   ├── audit/
│   ├── db/
│   └── ui/
├── fixtures/
├── scripts/
├── docs/
├── .github/workflows/
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

The package structure mirrors MIQO domain boundaries rather than page routes.

Provider adapters shall depend inward on canonical/domain contracts. Core domain packages shall not depend on a provider-specific schema.

---

# 4. Core domain model

The first persisted model shall support only Sprint 1–3 requirements:

```text
Customer
Profile
RiskProfileVersion
CanonicalFieldValue
Driver
Claim
Conviction
Vehicle
VerificationResult
Discrepancy
OptimisationPreference
Scenario
ScenarioDelta
QuoteRun
QuoteRequest
RawProviderResponse
NormalisedQuote
Shortlist
Selection
IntegritySignal
AuditEvent
```

The canonical model remains independent of provider taxonomies.

---

# 5. Non-negotiable software invariant

The primary implementation invariant is:

```text
Scenario cannot WRITE to RiskProfileVersion.
```

Formally:

```text
RiskProfileVersion = immutable factual input

Scenario = permitted O-class delta

QuoteRequest =
    RiskProfileVersion
    +
    Scenario
```

A scenario stores references and permitted choice deltas. It must never store an editable copied factual profile as its source of truth.

The scenario service shall reject any attempted delta whose field classification is not `O`.

After a profile version reaches `LOCKED`:

- F values are immutable;
- accepted V values are immutable for that version;
- D values belong to that version's derivation context;
- O values are not written into the factual version;
- a factual correction creates a new profile version;
- historical scenarios remain linked to the version that produced them.

This makes **“change choices — not facts”** a code-level invariant.

---

# 6. Walking skeleton

The first executable customer path is:

```text
C-01  Start synthetic profile
  ↓
C-03  Enter minimum factual data
  ↓
C-05  Validate
  ↓
C-07  Lock RiskProfileVersion v1
  ↓
C-08  Set optimisation choices
  ↓
C-09  Generate Scenario with O-only delta
  ↓
Mock Provider
  ↓
Store raw synthetic response
  ↓
Normalise quote
  ↓
C-11  Compare
  ↓
C-14  Final integrity check
  ↓
C-15  Complete prototype journey
```

The simultaneous admin path is:

```text
A-01  Dashboard
  ↓
A-02  Profile / version inspection
  ↓
A-07  End-to-end quote trace
  ↓
A-08  Audit history
```

The walking skeleton is complete when the same trace can be exercised from a clean database and synthetic fixture seed.

---

# 7. First-slice data minimum

The first vertical slice does not require every canonical field.

The minimum synthetic locked profile shall contain enough fields to prove immutability and integrity:

- synthetic person identifier;
- date of birth;
- main-driver identifier;
- licence-held date;
- annual mileage;
- vehicle identifier;
- ownership;
- overnight parking;
- claims summary;
- conviction summary.

The minimum O-class set shall contain:

- policy start date;
- voluntary excess;
- payment method;
- telematics preference.

Additional fields are added incrementally from the canonical dictionary.

---

# 8. Synthetic fixture contract

Fixtures are deterministic test assets, not illustrative throwaway data.

| Fixture | Purpose | Expected outcome |
|---|---|---|
| `SYN-001` | Clean standard profile | End-to-end PASS |
| `SYN-002` | Licence-date F/V discrepancy | Pre-lock discrepancy review required |
| `SYN-003` | Claims discrepancy | Pre-lock blocking/review path |
| `SYN-004` | Named-driver optimisation | Valid O-only scenario variants |
| `SYN-005` | Provider timeout | Partial quote-run success / graceful degradation |
| `SYN-006` | Non-comparable quote | Quote retained but marked NON_COMPARABLE |
| `SYN-007` | Final integrity failure | Final selection blocked |

Each fixture shall have:

- stable fixture ID;
- explicit purpose;
- expected state transitions;
- expected integrity outcomes;
- expected quote outcome where applicable;
- no intentional representation of a real person.

Fixtures are shared by demo, integration and regression tests.

---

# 9. Environment controls

Every runtime shall expose:

```text
MIQO_ENV=local|ci|prototype
MIQO_DATA_CLASSIFICATION=SYNTHETIC
MIQO_LIVE_PROVIDERS_ENABLED=false
```

The application shall fail startup if:

- `MIQO_DATA_CLASSIFICATION` is not `SYNTHETIC`;
- `MIQO_LIVE_PROVIDERS_ENABLED` evaluates to true;
- a configured provider endpoint is not a recognised mock/local endpoint;
- required prototype database configuration is absent.

No production credential names or live provider secrets belong in the prototype repository.

---

# 10. API boundary

Initial API resources shall map to domain operations rather than UI implementation details.

Minimum endpoint groups:

```text
/profiles
/profiles/:profileId/validate
/profiles/:profileId/discrepancies
/profiles/:profileId/lock

/profile-versions/:versionId/preferences
/profile-versions/:versionId/scenarios

/quote-runs
/quote-runs/:runId
/quotes/:quoteId
/quotes/:quoteId/normalisation

/selections
/selections/:selectionId/integrity

/admin/profiles
/admin/scenarios
/admin/integrity
/admin/audit
```

HTTP handlers validate inputs and delegate to application services. Domain rules must not live solely in route handlers or UI components.

---

# 11. Persistence controls

Database constraints shall support the domain invariant rather than rely only on application discipline.

At minimum:

- `risk_profile_version.status = LOCKED` versions are never updated in-place by scenario creation;
- `scenario.risk_profile_version_id` is a required foreign key;
- `scenario_delta.control_class` is constrained to `O`;
- raw provider responses and normalised quotes use separate records;
- quote requests record mapping/adapter/rule versions;
- audit events are append-only at application level;
- selection references the exact normalised quote and scenario used;
- integrity signals identify stage, rule and blocking status.

---

# 12. Transaction boundaries

The following operations shall be transactional:

1. Locking a profile version + emitting its audit event.
2. Creating a scenario + its O-class deltas + pre-quote integrity result.
3. Storing a raw response + quote receipt audit event.
4. Writing a normalised quote + normalisation-version reference.
5. Recording a selection + final integrity result.

External/mock provider failure must not roll back or modify the locked profile version.

---

# 13. First engineering tests

The repository bootstrap shall include executable tests proving:

1. a profile can be locked;
2. a locked profile cannot be mutated through scenario creation;
3. an O-class delta is accepted;
4. an F/V/D/I delta is rejected;
5. the mock provider produces deterministic output;
6. a provider timeout does not alter the profile;
7. raw and normalised quote records are distinct;
8. final integrity detects a factual mismatch;
9. one complete synthetic trace can be produced.

The first commit shall therefore contain at least one dependency-light invariant test that can execute before the full UI/API dependency installation is complete.

---

# 14. Engineering gates

A commit cannot be called the walking skeleton unless all of the following are true:

- repository installs from a clean checkout;
- local PostgreSQL can be started reproducibly;
- migrations can initialise an empty database;
- fixtures can seed deterministic synthetic data;
- the customer thin path can execute end-to-end;
- admin can inspect the resulting profile/quote/audit trace;
- scenario creation cannot mutate locked factual data;
- provider/mock failure is isolated;
- raw and normalised responses remain separate;
- premium, finance and excess remain separate output fields;
- final integrity reconciles selection to the locked profile;
- tests pass;
- prototype environment safeguards pass.

---

# 15. Sprint implementation order

## Sprint 1

Implement first:

- repository/runtime bootstrap;
- database/migrations;
- synthetic fixture framework;
- canonical minimum fields;
- profile creation;
- questionnaire minimum path;
- validation;
- discrepancy primitive;
- lock/version service;
- `C-01`, `C-03`, `C-05`, `C-07`;
- `A-01`, `A-02`;
- audit events for profile lifecycle.

Sprint 1 is complete only when a synthetic factual profile can be created, validated and locked, with an admin-visible immutable version.

## Sprint 2

Add O-only preferences, scenario generation, mock provider, raw response storage and normalisation.

## Sprint 3

Add comparison, shortlist/selection, final integrity, trace and audit exploration.

---

# 16. Definition of the first deployable build

The first deployable build is intentionally thin.

It is accepted when:

```text
Synthetic Profile
    → Lock v1
    → O-only Scenario
    → Deterministic Mock Quote
    → Raw Response
    → Normalised Quote
    → Comparison
    → Final Integrity PASS
    → Audit Trace
```

can be exercised in one prototype environment with no live provider connectivity.

---

# 17. Change control

The following require an explicit ADR or approved change:

- changing the canonical ownership of factual truth;
- permitting scenario writes into factual profile storage;
- introducing a live provider;
- introducing real customer data;
- changing database technology;
- changing provider adapter boundaries;
- combining raw and normalised quote persistence;
- changing comparison economics into a single fabricated universal score;
- weakening environment safeguards.

---

# 18. Engineering commencement decision

`MIQO-ENG-001 v1.0` authorises repository bootstrap and walking-skeleton implementation under the synthetic prototype boundary.

The next artefact after this document is **source code**.

No additional prerequisite conceptual specification is required for the first vertical slice.
