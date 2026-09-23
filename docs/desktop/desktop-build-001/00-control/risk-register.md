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
| R-DB-G1-007 | Raw provider evidence leakage. | **CONTROLLED / TEST CLOSED BY DB-G7-R1** | raw evidence is protected by explicit permission, sensitive-read logging and customer-route redaction; production hardening remains DB-G10/release gated |
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
| R-DB-G4-003 | Native command expansion could become generic transport. | **CONTROLLED / TEST CLOSED BY DB-G8** | exact eleven-command Tauri capability is matched to implemented auth/read/runtime/support commands; no generic HTTP/shell/fs permission |
| R-DB-G4-004 | Historical discrepancy evidence may be incomplete because current API discrepancy resource is current-version oriented. | CONTROLLED | profile view labels current-version discrepancy evidence; no fabricated history |


## DB-G5 risks

| ID | Risk | State | Control / target |
|---|---|---|---|
| R-DB-G5-001 | Displayed persisted ordinal/comparison/integrity could be mistaken for Desktop computation. | CONTROLLED | explicit UI copy + adapter composition only; no calculation code |
| R-DB-G5-002 | Raw provider response could be associated with the wrong quote request. | CONTROLLED | native derives surfaced request from trace; service verifies response correlation |
| R-DB-G5-003 | Raw provider payload could leak through logging/export/caching. | CONTROLLED / HARDEN DB-G10 | exact protected trace/raw-evidence views only; no default export/cache; operational logs exclude payload/token material |
| R-DB-G5-004 | Native deep-trace command could evolve into generic multi-resource transport. | **CONTROLLED / TEST CLOSED BY DB-G8** | typed selection-trace operation remains allow-listed inside the exact eleven-command capability; G7/G8 package proof is green |
| R-DB-G5-005 | Global decision-data search/list could be implied by top-level routes. | CONTROLLED | exact Selection ID entry and explicit no-global-search copy |


## DB-G6 risks

| ID | Risk | State | Control / target |
|---|---|---|---|
| R-DB-G6-001 | Correlation identifiers could be conflated with business/audit identity. | CONTROLLED | distinct session/trace/request labels; no business-authority semantics |
| R-DB-G6-002 | API build headers could leak configuration/secrets. | CONTROLLED | fixed semantic version/build/source fields only; no environment dump |
| R-DB-G6-003 | Support evidence could become a payload/log exfiltration mechanism. | CONTROLLED | fixed typed diagnostics struct; no log-content/raw-payload fields; no export/upload permission |
| R-DB-G6-004 | Operational logs could capture credential or business payload material. | CONTROLLED / HARDEN DB-G10 | structured code/reference fields only; DB-G7/G8 proof retains no Bearer/refresh_token material |
| R-DB-G6-005 | Installed UI path for support-snapshot generation is not directly exercised by G8 automation. | ACCEPTED / HARDEN DB-G10 | native command exactly permissioned/compiled; closed metadata construction; add installed UI exercise during hardening |
| R-DB-G6-006 | In-memory diagnostics may report only the most recent API operation rather than a full support timeline. | ACCEPTED | intentional bounded current-session summary; logs remain bounded chronological evidence |


## DB-G7 / DB-G7-R1 risks

| ID | Risk | State | Control / target |
|---|---|---|---|
| R-DB-G7-001 | Admin evidence could remain reachable through an unauthenticated legacy alias. | **CLOSED BY DB-G7-R1 for TEST/SYNTHETIC** | legacy `/admin/**` and unprotected raw-response aliases return 404; supported reads use `/desktop-admin/**` |
| R-DB-G7-002 | Authenticated principal could read evidence outside granted permissions. | CONTROLLED | server-side group-to-permission mapping; 401 unauthenticated / 403 insufficient permission; combined profile evidence requires all constituent permissions |
| R-DB-G7-003 | Raw provider evidence could be read without a security audit event. | CONTROLLED | explicit `miqos.admin.raw-evidence.read` check with sensitive-read access logging |
| R-DB-G7-004 | Customer-facing routes could expose Admin audit/discrepancy lineage merely because Admin authentication was added elsewhere. | CONTROLLED | separate narrowed customer contracts; Admin-only audit IDs, trace IDs, entity type and internal discrepancy lineage omitted |
| R-DB-G7-005 | Narrowing customer audit evidence could remove legitimate customer journey milestones. | **CLOSED BY DB-G7-R1** | customer-safe allowlist preserves validation, lock, objective, scenario-exploration and result/explanation milestones; BUILD-001H browser proof passes |
| R-DB-G7-006 | Deterministic TEST OIDC authority could be mistaken for production identity certification. | CONTROLLED / EXTERNAL DEPENDENCY OPEN | exact loopback TEST issuer only; D-G3-IDP-001 and CC-G5-001 remain open for real/non-synthetic operation |
| R-DB-G7-007 | Renderer/native clients could bypass the governed Admin route set. | CONTROLLED / HARDEN DB-G10 | typed native operations and same-origin Admin Web proxy; no generic arbitrary URL transport admitted |


## DB-G8 risks

| ID | Risk | State | Control / target |
|---|---|---|---|
| R-DB-G8-001 | Trace-linked provider identity could be misrepresented as a global provider status/health/activation state. | **CLOSED BY DB-G8** | Providers route is explicit DEFERRED; only exact persisted decision-trace provider/route evidence is available |
| R-DB-G8-002 | TEST/SYNTHETIC CI, package or identity evidence could be misrepresented as production/provider certification. | **CLOSED BY DB-G8** | Certification route is explicit DEFERRED and states engineering proof is not certification |
| R-DB-G8-003 | Reserved/foundation placeholders could imply unsupported capability exists downstream. | **CLOSED BY DB-G8** | every canonical navigation route now has an implemented/read/trace/deferred disposition; no RESERVED route remains |
| R-DB-G8-004 | Capability closure could add speculative native permissions for future provider/certification features. | **CLOSED BY DB-G8** | no new native/API resource; exact eleven implemented commands remain the complete capability set |
| R-DB-G8-005 | A later gateway could silently convert a deferred area into authority without admission. | CONTROLLED | DB-G1 new-consumption admission remains mandatory; endpoint reachability is not authorisation |
