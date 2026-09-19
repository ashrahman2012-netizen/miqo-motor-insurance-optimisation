# MIQO-SP5-ACCEPT-001 — Sprint 5 Frozen Acceptance Matrix v1.0

**Document ID:** MIQO-SP5-ACCEPT-001  
**Version:** 1.0  
**Status:** FROZEN  
**Date:** 20 September 2026  
**Parent:** MIQO-SP5-PREP-001 v1.0

## 1. Acceptance rule
A gate passes only with executable or inspectable evidence. Architecture prose alone is insufficient where a control can be tested. Failure of an earlier dependency blocks downstream certification.

## 2. Frozen gates
| Gate | Requirement | Minimum evidence |
|---|---|---|
| **S5-G0** | Certified Sprint 4 invariants remain intact | baseline CI + invariant regression |
| **S5-G1** | Production environment classes fail closed | config tests proving synthetic/certification/live separation |
| **S5-G2** | ProviderAdapter contract is versioned and canonical-model preserving | contract tests + mapping provenance |
| **S5-G3** | No live route executes without explicit route activation | negative integration tests |
| **S5-G4** | Secrets are externalised, least-privilege and non-loggable | secret scan + runtime/redaction tests |
| **S5-G5** | Timeout/rate-limit/retry policy is bounded and versioned | deterministic fault-injection tests |
| **S5-G6** | Idempotency/duplicate suppression protects repeated requests/actions | replay/concurrency tests |
| **S5-G7** | Raw provider responses remain immutable and correlated to exact request/adapter versions | DB constraints + restart tests |
| **S5-G8** | Provider outage/circuit state cannot corrupt recommendation integrity | outage/fallback tests |
| **S5-G9** | Real-data mode is disabled unless data-governance activation passes | startup/deployment guard tests |
| **S5-G10** | Purpose/lawful-basis/controller-role metadata exists for production flows | approved control records + schema tests |
| **S5-G11** | Retention/deletion/legal-hold mechanics are defined and testable | lifecycle tests + approved schedule prerequisite |
| **S5-G12** | DSAR/correction/restriction pathways preserve lineage and immutable historical evidence appropriately | rights-workflow tests |
| **S5-G13** | DPIA gate fails closed where DPIA is required but unapproved | policy tests + approved DPIA before activation |
| **S5-G14** | ADM/profiling classification and meaningful human/challenge controls are represented | control record + journey tests |
| **S5-G15** | Demands/needs and eligibility controls exist where approved operating model requires them | versioned rules + customer-journey tests |
| **S5-G16** | Commercial remuneration cannot influence scenarios, eligibility, comparison or ranking | perturbation/invariance tests |
| **S5-G17** | Customer-facing material quote/recommendation provenance remains explainable | browser + API + DB reconstruction |
| **S5-G18** | Observability is redacted, correlated and separated from decision evidence | log/metric tests + PII/secret scan |
| **S5-G19** | Incident/recovery/replay runbooks and evidence exist | simulated provider/data incident exercise |
| **S5-G20** | Production legal/regulatory operating-model decisions are approved | signed governance record; no inferred PASS |
| **S5-G21** | Provider contractual authority exists before any provider route becomes LIVE | contract/route approval reference |
| **S5-G22** | End-to-end production-readiness journey passes without activating unauthorised capabilities | clean CI/E2E certification run |
| **S5-G23** | Independent activation decisions exist for real data, live provider, distribution and bind/pay | explicit gate records for each capability |

## 3. Global invariants
Every gate is subordinate to:

```text
F facts cannot be price-optimised.
Locked factual correction creates a new version.
Provider translation cannot invent customer facts.
Raw evidence is immutable.
Recommendation lineage is reconstructable.
Commercial value is not a ranking input.
Capability does not equal activation.
```

## 4. Certification states
Each gate may be `PASS`, `FAIL`, or `BLOCKED`. `CONDITIONAL PASS` is permitted only at the PREP gateway, never as final production activation evidence.

## 5. Production activation rule
Sprint 5 code certification and production activation are separate decisions. S5-G20, G21 and G23 cannot be satisfied by unit tests and require governance/contractual evidence.

## 6. Freeze rule
Changes to gate meaning, deletion of gates or weakening of evidence require a version increment and explicit gateway review. Implementation may add stricter evidence without reopening the matrix.

**End of MIQO-SP5-ACCEPT-001 v1.0**