# MIQO-SP6-ACCEPT-001 — Sprint 6 Frozen Acceptance Matrix v1.0

**Document ID:** MIQO-SP6-ACCEPT-001  
**Version:** 1.0  
**Status:** FROZEN  
**Date:** 20 September 2026  
**Parent:** MIQO-SP6-PREP-001 v1.0

## 1. Acceptance rule

A Sprint 6 gate passes only with executable or inspectable evidence meeting its minimum evidence requirement. Provider-neutral engineering evidence cannot substitute for provider-specific contractual, credential, regulatory or production-activation evidence.

Each gate state is one of: `PASS`, `FAIL`, or `BLOCKED`.

## 2. Frozen gates

| Gate | Requirement | Minimum evidence |
|---|---|---|
| **S6-G0** | Sprint 5 closure and all inherited invariants remain intact | Sprint 5 closure reference + baseline CI/invariant regression |
| **S6-G1** | Inherited external dependencies remain fail closed | tests/control records proving unresolved G20/G21 cannot activate downstream capabilities |
| **S6-G2** | Provider-neutral Sprint 6 control model is versioned and capability activation remains independent | architecture/config tests + activation-register regression |
| **S6-G3** | A named provider candidate exists before provider-specific certification execution | approved ProviderCandidateRecord |
| **S6-G4** | ProviderAdapter and mapping specification are versioned and canonical-model preserving | contract tests + field provenance + negative invented-fact tests |
| **S6-G5** | Provider request/response schemas and unsupported-field semantics are explicit | versioned schemas + compatibility/negative tests |
| **S6-G6** | Provider response evidence remains immutable and exactly correlated through normalisation/recommendation lineage | DB/API restart reconstruction + evidence fingerprints |
| **S6-G7** | Certification and production endpoints/credentials are strictly separated | environment/config tests + endpoint/credential policy evidence |
| **S6-G8** | Production credentials are externalised, scoped, rotatable and non-loggable | secret scan + credential-reference/scope tests + rotation/revocation exercise |
| **S6-G9** | Provider-specific timeout/retry/rate-limit/circuit/idempotency policy is bounded and certified | provider-specific fault-injection/replay tests |
| **S6-G10** | Provider certification route executes successfully without activating unauthorised production capabilities | provider certification harness + clean certification run |
| **S6-G11** | Provider interaction reconciliation detects missing/duplicate/stale/mismatched evidence without historical mutation | reconciliation tests + restart/replay evidence |
| **S6-G12** | LIVE route remains fail closed unless regulatory, contractual, certification, credential and operational dependencies are all satisfied | negative activation tests + dependency records |
| **S6-G13** | REAL_DATA, LIVE_PROVIDER and DISTRIBUTION activation decisions remain explicit and independent | capability-specific signed/approved gate records + executable independence tests |
| **S6-G14** | Any pilot is explicitly bounded by route, population/traffic, time/stop conditions, data class and distribution scope | approved pilot control record + deployment guard tests |
| **S6-G15** | Route kill switch and rollback are independently executable and preserve historical evidence | simulated disable/rollback exercise + lineage verification |
| **S6-G16** | Pilot observability, incident/support escalation and reconciliation evidence are complete | controlled pilot/simulation evidence + incident/reconciliation report |
| **S6-G17** | Pilot exit decision is explicit and cannot be inferred from technical success | signed/approved CONTINUE, HOLD or ROLLBACK decision record |

## 3. Global invariants

Every gate is subordinate to:

```text
Change choices — not facts.
F facts cannot be price-optimised.
Locked factual correction creates a new version.
Provider translation cannot invent customer facts.
Raw evidence is immutable.
Recommendation lineage is reconstructable.
Commercial value is not a ranking input.
Capability does not equal activation.
Certification does not equal LIVE authority.
LIVE provider authority does not equal REAL_DATA or DISTRIBUTION authority.
Pilot success does not equal general production approval.
```

## 4. External-evidence gates

The following cannot be satisfied by unit tests alone:

- **S6-G3:** requires a real named provider candidate record;
- **S6-G8:** production credential evidence requires actual approved secret/credential provisioning before production use;
- **S6-G10:** provider-specific certification requires access to the relevant provider certification environment/materials;
- **S6-G12:** LIVE activation dependencies include inherited legal/regulatory and provider-contract authority;
- **S6-G13:** positive production activation requires explicit governance decisions;
- **S6-G14:** actual pilot execution requires an approved pilot record;
- **S6-G16:** actual pilot operational evidence requires the pilot/simulation defined by the approved control record;
- **S6-G17:** requires an explicit human/governance exit decision.

Provider-neutral implementations may prepare these controls but cannot infer PASS for unavailable external evidence.

## 5. Dependency ordering

```text
S6-G0 → G1 → G2
             ↓
           S6-G3
             ↓
        G4 → G5 → G6
             ↓
        G7 → G8 → G9
             ↓
            G10
             ↓
            G11
             ↓
            G12
             ↓
            G13
             ↓
            G14
             ↓
            G15
             ↓
            G16
             ↓
            G17
```

Downstream gates may be implemented in advance, but cannot be certified PASS where an earlier required dependency is BLOCKED.

## 6. Activation interpretation

A PASS at S6-G10 means a provider certification route is technically certified. It does not make the route LIVE.

A PASS at S6-G12 means all dependencies for a specific LIVE-route activation have been evidenced and the fail-closed gate can permit that route. It does not independently authorise real customer data or customer distribution.

A PASS at S6-G13 means the required capability decisions exist and are independent. The actual decision may be `NOT_AUTHORISED`; positive activation must be supported by its own evidence.

## 7. Freeze rule

Gate meaning, deletion or weakening requires a new acceptance-matrix version and explicit gateway review. Additional stricter evidence may be added during execution without weakening this matrix.

**End of MIQO-SP6-ACCEPT-001 v1.0**
