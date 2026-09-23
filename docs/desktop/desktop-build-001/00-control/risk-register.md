# BUILD risk register

Original PREP risks remain inherited through DB-G0 and the certified PREP register. DB-G2 does not silently close downstream identity, signing, environment, observability, dependency or provider obligations.

| ID | Risk | State | Control / target |
|---|---|---|---|
| R-DB-G0-001 | UX customer controls mistaken for Admin authority. | CONTROLLED / BASELINE CLOSED BY DB-G1 | screen/action matrix + frozen capability register |
| R-DB-G0-002 | Control scaffolding mistaken for later-gateway completion. | CONTROLLED | gateway-specific implementation/acceptance labels |
| R-DB-G0-003 | Local runtime differs from certified toolchain. | CONTROLLED | GitHub exact toolchain/Windows evidence |
| R-DB-G1-001 | Visual fidelity overrides certified authority semantics. | CONTROLLED | higher-priority PREP/BUILD controls |
| R-DB-G1-002 | Dense tables/timelines harm accessibility. | CONTROLLED / PROOF PENDING | later route implementation + DB-G10 |
| R-DB-G1-003 | Search UI implies unsupported global search. | CONTROLLED | DB-G2 implements local navigation-only command field |
| R-DB-G1-004 | Dashboard visuals cause fabricated KPIs/counts. | CONTROLLED | DB-G2 dashboard uses no fabricated aggregates |
| R-DB-G1-005 | Status colour becomes sole meaning carrier. | CONTROLLED | shared semantic text/status components |
| R-DB-G1-006 | Desktop components fragment shared design system. | CONTROLLED | DB-G2 reuses `@miqo/ui`; no shared fork |
| R-DB-G1-007 | Raw provider evidence leakage. | CONTROLLED / PROOF PENDING | DB-G5/6/7 |
| R-DB-G1-008 | Visual nuance not fully captured in text. | ACCEPTED / CONTROLLED | hashed external reference retained |
| R-DB-G1-009 | Catalogue entries mistaken for runtime components. | CONTROLLED | runtime export distinction retained |
| R-DB-G2-001 | Packaged in-app routing could escape local application navigation. | CONTROLLED / PROOF PENDING | intercept only internal absolute links; remote executable UI still prohibited; harden DB-G3/10 |
| R-DB-G2-002 | Foundation routes could be mistaken for implemented backend capability. | CONTROLLED | explicit Foundation route ready + capability state; no fake records |
| R-DB-G2-003 | Representative fixed synthetic profile could be mistaken for product case selection. | CONTROLLED | labelled inherited executable proof only; real evidence surfaces DB-G4 |
| R-DB-G2-004 | PR Windows artifact provenance records synthetic merge rather than branch source SHA. | CONTROLLED | pair merge `2884adb...` with exact head `34ab244...` and frozen base; exact branch push CI also green |
| R-DB-G2-005 | New shell could regress installed failure/retry/environment proof. | CLOSED BY DB-G2 | G8 #33 installed Windows proof SUCCESS |

## DB-G3 risks

| ID | Risk | State | Control / target |
|---|---|---|---|
| R-DB-G3-001 | Internal native transport could drift back toward arbitrary URL/path proxying as DB-G4/G5 endpoints are added. | CONTROLLED / PROOF PENDING | typed operation enum, input constructors and negative tests; future resources require explicit variants |
| R-DB-G3-002 | Package config drift could silently select a non-authorised environment/API/IdP. | CONTROLLED / PROOF PENDING | exact current-package validation and startup failure |
| R-DB-G3-003 | Unknown feature flags could become an accidental runtime authority channel. | CONTROLLED / PROOF PENDING | current profile requires empty feature object |
| R-DB-G3-004 | TEST loopback HTTP could be copied into STAGING/PRODUCTION. | CONTROLLED | current exact TEST exception only; non-synthetic profiles remain blocked by CC-G5-001 |
| R-DB-G3-005 | Renderer could communicate a trusted environment despite native profile failure. | CONTROLLED / PROOF PENDING | global provider null state plus Dashboard NOT_AUTHORISED correction |

| R-DB-G4-001 | Reusing customer profile adapter could leak mutation affordances into Admin. | CONTROLLED | Desktop read model strips editable/action properties; unit test proves absence |
| R-DB-G4-002 | Exact-ID lookup could drift into implied global search. | CONTROLLED | local identifier validation + explicit UI copy; no search endpoint |
| R-DB-G4-003 | Native command expansion could become generic transport. | CONTROLLED / PROOF PENDING | two typed enum operations only; exact Tauri permission list + Rust tests |
| R-DB-G4-004 | Historical discrepancy evidence may be incomplete because current API discrepancy resource is current-version oriented. | CONTROLLED | profile view labels current-version discrepancy evidence; no fabricated history |
