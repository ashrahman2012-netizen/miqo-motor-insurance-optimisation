# MIQOS Application Environment UX Model v1.0

**Gate:** APP-G8  
**Status:** FROZEN

## 1. Environment modes

The application presentation model recognises exactly:

```text
SYNTHETIC
CERTIFICATION
PRODUCTION
```

This is a **presentation model**. It does not authorise an environment to exist or weaken runtime/provider controls.

The current certified repository remains synthetic-only. `PRODUCTION` and `CERTIFICATION` presentation semantics are provisioned for future controlled environments.

## 2. Runtime authority

Environment identity must come from trusted runtime/server configuration. It must never be user-selectable through:

- query string;
- local storage;
- customer preference;
- client-only environment override;
- editable UI control.

`ApplicationEnvironmentContext` is a read-only presentation projection of trusted environment state.

## 3. Customer presentation

### SYNTHETIC

Persistent banner on every customer screen:

> **SYNTHETIC — Test data and test quotations only. No live insurer connection.**

Treatment: info blue/cyan, persistent, non-dismissible.

Customer result surfaces must also avoid language that implies a synthetic result is purchasable cover.

### CERTIFICATION

Persistent banner on every screen that can expose certification data:

> **CERTIFICATION — Controlled provider verification environment. Results are not customer quotations.**

Treatment: violet certification identity, persistent, non-dismissible.

Ordinary production customer traffic must not be routed into this environment.

### PRODUCTION

No persistent development/test banner in normal customer journeys.

Production identity must still be available in administrative/system context. Production status does not imply:

- quote eligibility;
- provider certification;
- successful integrity outcome;
- policy binding;
- recommendation suitability.

## 4. Admin presentation

Admin shell always exposes environment identity in a stable top-level location.

| Environment | Admin treatment |
|---|---|
| SYNTHETIC | blue/cyan badge + “SYNTHETIC” |
| CERTIFICATION | violet badge + “CERTIFICATION” |
| PRODUCTION | neutral high-contrast badge + “PRODUCTION” |

For SYNTHETIC/CERTIFICATION, provider/customer-impacting actions should repeat the environment identity near the action if confusion could cause operational harm.

## 5. ApplicationEnvironmentContext contract

Target presentation contract:

```ts
type ApplicationEnvironment =
  | "SYNTHETIC"
  | "CERTIFICATION"
  | "PRODUCTION";

type ApplicationEnvironmentContextValue = Readonly<{
  environment: ApplicationEnvironment;
  displayLabel: string;
  dataClassification: string;
  providerConnectivityClass: string;
  customerBanner: "PERSISTENT" | "NONE";
  customerBannerMessage: string | null;
  adminBadge: "INFO" | "CERTIFICATION" | "NEUTRAL";
}>;
```

No field in this context grants provider connectivity, activates live quoting or bypasses backend guards.

## 6. Failure-safe presentation

If trusted environment identity cannot be resolved:

- customer/admin UI must not silently assume PRODUCTION;
- application presentation should fail closed to a visible “ENVIRONMENT UNKNOWN / NOT AUTHORISED” state;
- provider-impacting or customer-result actions should remain unavailable until environment state is resolved.

## 7. Existing synthetic guard remains controlling

The current API startup guard and CI boundary verification remain unchanged by APP-G8. P1 adds no live-provider credential, endpoint, flag or production startup path.
