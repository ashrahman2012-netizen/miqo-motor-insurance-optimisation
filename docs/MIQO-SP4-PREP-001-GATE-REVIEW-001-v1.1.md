# MIQO-SP4-PREP-001 — Formal Provisioning Gate Review v1.1

**Review ID:** MIQO-SP4-PREP-001-GATE-REVIEW-001  
**Version:** 1.1  
**Controlling artefact:** MIQO-SP4-PREP-001 v1.0  
**Overall status:** PARTIAL PASS — EXECUTION HOLD

---

## 1. Gateway summary

```text
P4-G0 → P4-G12

PASS: 12
OPEN: 1

OPEN:
P4-G0
```

All thirteen gates must be PASS before `SP4-EXEC-001` begins.

---

## 2. PASS / OPEN matrix

| Gate | Status | Determination |
|---|---|---|
| **P4-G0 — Sprint 3 certified baseline remains untouched** | **OPEN** | Sprint 3 has been merged to `main` at `623dabd9ce74e0f6ce8a1840ef7fac6bef23a832`. The remaining control is creation/verification of the immutable certification tag `miqo-sprint3-complete-v1.0` pointing to that merge commit. `miqo/sprint4` must not be created until this closes. |
| **P4-G1 — Framework mapped into F/V/D/I/O taxonomy** | **PASS** | The inherited F/V/D/I/O model and WRITE: O-only invariant remain explicit. |
| **P4-G2 — Optimisation Catalogue v2 approved** | **PASS** | Allowed O controls, immutable factual variables and versioned catalogue metadata are defined. |
| **P4-G3 — Provider/channel orchestration model approved** | **PASS** | MarketRoute separates provider/channel from customer facts and ScenarioDelta. |
| **P4-G4 — Customer Objective Model v1 approved** | **PASS** | Explicit objectives are defined; BALANCED_COST_AND_EXPOSURE remains non-executable pending separate methodology approval. |
| **P4-G5 — Premium/excess methodology boundary documented** | **PASS** | Premium and excess remain separate economic dimensions; no universal premium-plus-excess score. |
| **P4-G6 — ADJUSTED_COMPARABLE dormant** | **PASS** | ADJUSTED_COMPARABLE remains unavailable to Sprint 4 recommendation ranking. |
| **P4-G7 — Occupation taxonomy mapping separated from factual occupation** | **PASS** | Canonical factual occupation cannot be optimised; provider taxonomy mapping is versioned translation only. |
| **P4-G8 — PRE_PURCHASE vehicle semantics approved** | **PASS** | Candidate vehicles remain separate from current factual vehicle. |
| **P4-G9 — Explainability contract approved** | **PASS** | Persisted explanation requirements are defined. |
| **P4-G10 — Recommendation provenance/audit approved** | **PASS** | Recommendation lineage, eligible/excluded evidence and audit requirements are defined. |
| **P4-G11 — Regulatory/data-provenance controls mapped** | **PASS** | Closed by `MIQO-SP4-REG-001 v1.0`, which maps motor-insurance boundary, truthful representations, FCA/customer-interest concerns, UK GDPR principles, PECR, automated-decision transparency/challenge, equality/proxy risk, integrity-signal semantics, external-data quality, commercial independence and comparison methodology into Sprint 4 controls. |
| **P4-G12 — Sprint 4 scope and acceptance gates frozen** | **PASS** | Closed by `MIQO-SP4-ACCEPT-001 v1.0`. S4-G0 → S4-G16 are declared FROZEN v1.0, including tightened G9, G10, G14 and G15 wording. |

---

## 3. New controlling closure artefacts

### MIQO-SP4-REG-001 v1.0

Establishes the Regulatory & Data-Provenance Control Map and closes P4-G11.

Key controls:
- synthetic/non-production Sprint 4 boundary;
- CIDRA-aligned truthful declaration architecture;
- data minimisation / purpose / accuracy / provenance;
- automated-decision explanation/challenge boundary;
- PECR/tracking separation;
- equality/proxy-risk review;
- external-data freshness/discrepancy controls;
- no commercial remuneration in ranking;
- no universal premium-plus-excess scoring.

### MIQO-SP4-ACCEPT-001 v1.0

Freezes S4-G0 → S4-G16 and closes P4-G12.

The tightened mandatory gates include:

```text
S4-G9:
Objective-specific analysis and RecommendationSet are
persisted, deterministic and versioned; eligible and excluded
quote sets and exclusion reasons are reproducible.

S4-G10:
Universal premium-plus-excess scoring remains impossible
AND ADJUSTED_COMPARABLE cannot participate in Sprint 4
recommendation ranking.

S4-G14:
Customer browser journey:
objective
→ multi-scenario exploration
→ recommendations
→ customer selection
→ final integrity

S4-G15:
Admin trace reconstructs:
objective
→ scenarios
→ MarketRoutes
→ QuoteRequests
→ raw responses
→ normalised quotes
→ recommendation
→ selection
→ final integrity
```

---

## 4. Repository-control hold

The repository must remain on provisioning hold until P4-G0 closes.

Required final action:

```text
Create annotated tag:
miqo-sprint3-complete-v1.0
        ↓
target:
623dabd9ce74e0f6ce8a1840ef7fac6bef23a832
        ↓
verify tag resolves to exact merge commit
        ↓
P4-G0 PASS
```

Only then:

```text
P4-G0 → P4-G12 = ALL PASS
        ↓
MIQO-SP4-PREP-001 = COMPLETE
        ↓
create miqo/sprint4 from certified Sprint 3 tag
        ↓
SP4-EXEC-001 authorised
```

---

## 5. Current formal decision

> **MIQO-SP4-PREP-001 — PARTIAL PASS (12/13); EXECUTION HOLD**

No Sprint 4 feature implementation is authorised while P4-G0 remains OPEN.

**End of Gate Review v1.1**
