# MIQOS-APP-PREP-001 — Final Build Readiness Matrix

**Gate:** APP-G15  
**Status:** PASS — subject to final P5 head CI remaining green

| Gate | Requirement | Evidence | Status |
|---|---|---|---|
| APP-G0 | Certified repository/architecture baseline | `00-baseline/repository-baseline.md`, authority/gap registers | PASS |
| APP-G1 | UX references frozen | `00-baseline/ux-reference-register.md` | PASS |
| APP-G2 | Dark design-token system | `01-design-system/MIQOS-DS-001-v1.0.md`, token JSON | PASS |
| APP-G3 | Customer IA | `02-ia-ux/customer-information-architecture.md` | PASS |
| APP-G4 | Admin IA | `02-ia-ux/admin-information-architecture.md` | PASS |
| APP-G5 | Shared component architecture | `03-components/component-architecture.md`, catalogue | PASS |
| APP-G6 | Typed ViewModel/API mapping | `04-contracts/viewmodel-contract.md`, `@miqo/application-contracts` | PASS |
| APP-G7 | F/V/D/O/I visual semantics | `01-design-system/control-class-semantics.md` | PASS |
| APP-G8 | Environment UX | `01-design-system/environment-ux-model.md` | PASS |
| APP-G9 | Responsive behaviour | `02-ia-ux/responsive-behaviour.md` | PASS |
| APP-G10 | Accessibility baseline | `02-ia-ux/accessibility-baseline.md` | PASS |
| APP-G11 | Customer terminology | `02-ia-ux/terminology-copy-governance.md` | PASS |
| APP-G12 | UI loading/error/blocked states | `02-ia-ux/ui-state-model.md` | PASS |
| APP-G13 | State mapping + fixtures | `04-contracts/state-and-route-guards.md`, fixtures | PASS |
| APP-G14 | Controlled build plan | `05-build-readiness/build-plan.md` + acceptance/test controls | PASS |
| APP-G15 | Build-readiness certification | this matrix + evidence/closeout + green P5 CI | PASS |

## Readiness dimensions

| Dimension | Assessment |
|---|---|
| Architecture | READY |
| Design semantics | READY |
| Customer/admin IA | READY |
| Component ownership | READY |
| Typed contracts | READY |
| Responsive rules | READY |
| Accessibility target | READY FOR IMPLEMENTATION/TESTING |
| UI state coverage | READY |
| Test strategy | READY |
| Build sequencing | READY |
| Provider activation | OUTSIDE APP-BUILD AUTHORITY |
| Production authentication/RBAC | SEPARATE DEPLOYMENT/SECURITY DECISION |
| Production launch | NOT CERTIFIED BY APP-PREP |

## APP-G15 interpretation

APP-G15 certifies that the application has enough frozen architecture, semantics, contracts, controls and test planning to begin controlled implementation.

It does **not** certify that an application has already been implemented, that it is accessible in production, that providers are live, or that the service is ready for production launch.

## Decision

Provided the final P5 commit passes the existing repository CI controls:

```text
APP-G15 = PASS
MIQOS-APP-PREP-001 = COMPLETE
MIQOS-APP-BUILD-001 = AUTHORISED TO START
```
