# MIQOS-APP-PREP-001 — Frontend Inventory

**Phase:** P0  
**Gate:** APP-G0

## 1. Current implementation

Both web applications use the Next.js App Router and React client components. Existing pages are deliberately thin prototype views.

Observed implementation characteristics:

- page components call the Fastify API directly with browser `fetch`;
- API response state is generally typed as `any`;
- visual styling is predominantly inline `style={{...}}`;
- layouts contain hard-coded synthetic/non-production banners;
- `API_URL` is centralised only as a small environment constant in each app;
- no shared design tokens or theme layer are present;
- `packages/ui` is not yet consumed by the web applications;
- customer/admin workspace `test` scripts currently report `no-unit-tests-yet`.

## 2. Existing functional coverage

Customer prototype routes cover:

- profile capture/sections;
- validation/review;
- correction;
- lock;
- optimisation preferences;
- scenario generation;
- quote comparison;
- recommendation/objective journey;
- completion.

Admin prototype routes cover:

- profile/version inspection;
- audit history;
- selection trace;
- Sprint 4 trace.

## 3. Positive baseline findings

- No frontend dependency on `@miqo/db`; persistence remains behind the API.
- Prototype environment identity is visibly exposed.
- Existing pages already use useful accessibility primitives such as labels, `role="alert"`, `role="status"` and stable test IDs.
- Customer flows preserve the core wording that facts are locked and only choices may be optimised.
- Quote UI keeps premium, finance cost and excess as separate displayed dimensions.

## 4. Reuse/duplication findings

Current duplication suitable for APP-PREP extraction includes:

- page shells and width/padding conventions;
- money formatting;
- loading/error patterns;
- API request/error handling;
- status rendering;
- environment banners;
- profile/version references;
- quote/comparison presentation;
- recommendation/explanation presentation.

## 5. Missing application primitives

The following do not yet exist as production-ready shared primitives:

- AppShell / navigation;
- design tokens and theme;
- semantic status badges;
- environment context/banner abstraction;
- profile field/provenance components;
- scenario/rejection components;
- quote card/comparison table abstractions;
- result/explanation components;
- audit/lineage visual components;
- loading/skeleton/empty/blocked state system;
- responsive navigation and mobile comparison interaction.

## 6. Contract risk

The dominant frontend coupling is **raw API-shape coupling**, not database coupling. Pages interpret service payloads directly and derive UI state inline. APP-PREP should therefore introduce explicit typed application/ViewModel contracts before substantial visual reconstruction.
