# MIQOS Application Build Deferred Items & Risk Register

**Gate:** APP-G15  
**Status:** CONTROLLED / NON-BLOCKING FOR BUILD START

| ID | Type | Item | Build treatment |
|---|---|---|---|
| BR-01 | Deployment/security | Production authentication/RBAC not defined in current APP-PREP | Do not invent; build against current authorised boundary and require separate production security decision |
| BR-02 | External integration | Live provider activation remains separate provider programme | MarketRoute/provider identity stays data-driven; no live credentials |
| BR-03 | Methodology | `ADJUSTED_COMPARABLE` exists in persisted/type vocabulary but is dormant | No active ranking UI |
| BR-04 | Supporting service | Documents backend not present | Shell/informational state or defer |
| BR-05 | Supporting service | Settings backend/account contract not present | Shell/informational state or defer |
| BR-06 | Supporting content | Support service may be content-only | Do not fabricate case-management actions |
| BR-07 | Tooling | Component explorer not selected | Not a blocker; use tests/docs first |
| BR-08 | Accessibility | Full WCAG conformance cannot be proven before implementation | BUILD-001I/J evidence required |
| BR-09 | Responsive | Visual reference assets are desktop-oriented | Frozen P2 behaviour controls implementation |
| BR-10 | Route migration | Existing prototype routes differ from canonical IA | Migrate incrementally after replacement proof |
| BR-11 | API aggregation | No single dashboard aggregate endpoint | Compose existing endpoints first; add API only if evidence justifies |
| BR-12 | Copy/regulatory | Customer result language must stay informational/objective-specific | APP-G11 copy governance enforced |

None of BR-01–BR-12 changes the APP-G15 conclusion for **build readiness**. Several remain blockers to claims of production deployment/readiness until separately resolved.
