# MIQOS Application Build Implementation Controls v1.0

**Gate:** APP-G14  
**Status:** FROZEN

## 1. Repository controls

- Build begins on `miqos/app-build-001` created from the final APP-G15 certified head.
- No application commit is added to Sprint 6/provider-certification evidence branches.
- Each build wave produces a controlled evidence checkpoint.
- Unrelated repository failures are recorded, not silently “fixed” by architectural drift.

## 2. Adapter boundary

P5 resolves the P4 open location decision:

```text
packages/application-adapters
@miqo/application-adapters
```

This future package is a pure runtime mapping layer.

It may depend on:

- `@miqo/application-contracts`;
- framework-neutral utility code where approved.

It must not depend on:

- `@miqo/db`;
- React/Next.js;
- provider-specific adapters;
- browser storage;
- direct network clients.

## 3. Fetch/orchestration boundary

Network/API orchestration belongs to application-level loaders/services in:

```text
apps/customer-web
apps/admin-web
```

Those loaders:

1. call Fastify resources;
2. pass results to application adapters;
3. return typed ViewModels to page composition.

React display components receive ViewModels/props rather than raw response objects.

## 4. Component documentation/testing

Component behaviour is documented adjacent to implementation through:

- exported props/types;
- focused Markdown/API notes for complex semantic components;
- component tests using stable role/name/value expectations;
- fixture-driven states.

A heavyweight component explorer is **not a build-readiness dependency**. Storybook or an equivalent may be proposed later if it provides measurable value, but BUILD-001A is not blocked on adopting one.

## 5. Route migration

Prototype routes remain available until their canonical replacements pass their wave acceptance tests.

Then route migration may use redirects preserving identifiers/context.

Do not delete the only proven path before the replacement is verified.

## 6. Security/authentication boundary

Authentication and full RBAC are not currently certified application-prep capabilities.

Therefore:

- BUILD must not invent a production security model;
- admin action availability remains server-authority driven;
- the final application certification may certify the UI/build against the current synthetic/test boundary;
- production deployment/security readiness requires a separately authorised security/identity decision if not already supplied by the hosting programme.

This is a deployment-readiness item, not a blocker to application construction.

## 7. Provider boundary

Provider integration remains data-driven through market routes and canonical quotations.

No BUILD wave may introduce provider-specific screen branches merely to match an integration.

## 8. Unsupported IA areas

Documents, support and settings are reserved IA areas. Where a real service does not exist, use explicit informational/deferred states rather than fabricated persistence/actions.
