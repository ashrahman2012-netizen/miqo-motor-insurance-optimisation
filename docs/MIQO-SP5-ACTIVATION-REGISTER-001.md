# MIQO-SP5-ACTIVATION-REGISTER-001 — Independent Production Capability Decisions

**Status:** FROZEN CURRENT-STATE REGISTER  
**Date:** 20 September 2026  
**Policy version:** `sp5-activation-policy-v1`  
**Governance authority:** `MIQO-SP5-PREP-001-GATE-REVIEW-001`

## 1. Rule

Capability does not equal activation. Each production capability has its own decision record. No capability inherits authorisation from another capability, from Sprint 5 engineering certification, or from a general deployment approval.

## 2. Current decisions

| Decision record | Capability | Current decision | Dependencies before any future AUTHORISED decision |
|---|---|---|---|
| MIQO-SP5-ACT-REAL-DATA-001 | REAL_DATA | **NOT_AUTHORISED** | S5-G20; approved processing-purpose/lawful-basis/data-role records; retention/deletion schedule; DPIA where required; production security/incident approval |
| MIQO-SP5-ACT-LIVE-PROVIDER-001 | LIVE_PROVIDER | **NOT_AUTHORISED** | S5-G20; S5-G21; production credentials/secrets; provider route approval; operational readiness |
| MIQO-SP5-ACT-DISTRIBUTION-001 | DISTRIBUTION | **NOT_AUTHORISED** | S5-G20; approved customer disclosures/terms; complaints/support/redress model; final regulated operating model |
| MIQO-SP5-ACT-BIND-PAY-001 | BIND_PAY | **NOT_AUTHORISED — OUT OF SPRINT 5 SCOPE** | Separate future programme/gateway required; current frozen model is external handoff only |

## 3. Interpretation

These are explicit independent non-activation decisions, not missing decisions. They preserve the frozen Sprint 5 boundary while external evidence is incomplete.

A future change from **NOT_AUTHORISED** to **AUTHORISED** requires:
1. a capability-specific decision record;
2. all named dependencies evidenced;
3. no inference from another capability's status;
4. a versioned update to this register or its successor;
5. relevant CI/E2E re-certification where the change affects executable controls.

## 4. External dependency status

- **S5-G20:** BLOCKED pending signed specialist legal/regulatory operating-model determination and associated approvals.
- **S5-G21:** BLOCKED pending provider/intermediary contractual authority for any route proposed to become LIVE.
- No current MarketRoute is authorised to become LIVE.
- No real-customer-data processing, regulated production distribution, MIQOS policy binding, insurer-premium collection or policy issuance is authorised by this register.

## 5. G23 evidence statement

This register is the inspectable governance evidence for independent activation decisions. All four capabilities are presently and independently **NOT_AUTHORISED**. Engineering tests must additionally prove missing/negative gate records fail closed and one capability cannot activate another.

**End of MIQO-SP5-ACTIVATION-REGISTER-001**
