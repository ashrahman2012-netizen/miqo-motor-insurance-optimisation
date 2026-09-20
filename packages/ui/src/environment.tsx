"use client";

import {createContext, useContext, type ReactNode} from "react";
import type {ApplicationEnvironmentVM} from "@miqo/application-contracts";
import {StatusBadge} from "./semantics";

export const ApplicationEnvironmentContext = createContext<ApplicationEnvironmentVM | null>(null);

export function ApplicationEnvironmentProvider({value, children}: {value: ApplicationEnvironmentVM | null; children: ReactNode}) {
  return <ApplicationEnvironmentContext.Provider value={value}>{children}</ApplicationEnvironmentContext.Provider>;
}

export function useApplicationEnvironment() {
  return useContext(ApplicationEnvironmentContext);
}

export function EnvironmentBadge({environment}: {environment?: ApplicationEnvironmentVM | null}) {
  const context = useApplicationEnvironment();
  const value = environment === undefined ? context : environment;
  if (!value) return <StatusBadge status="NOT_AUTHORISED" label="ENVIRONMENT UNKNOWN" />;
  return <StatusBadge status={value.environment} label={value.displayLabel} />;
}

export function EnvironmentBanner({environment}: {environment?: ApplicationEnvironmentVM | null}) {
  const context = useApplicationEnvironment();
  const value = environment === undefined ? context : environment;
  if (!value) {
    return (
      <div className="miqos-environment-banner miqos-environment-banner--blocked" role="alert">
        <strong>ENVIRONMENT UNKNOWN — NOT AUTHORISED</strong>
        <span> Runtime identity could not be resolved. Provider-impacting actions must remain unavailable.</span>
      </div>
    );
  }
  if (value.environment === "PRODUCTION" || value.customerBanner === "NONE") return null;
  return (
    <div className="miqos-environment-banner" data-environment={value.environment} role="status" aria-live="polite">
      {value.customerBannerMessage}
    </div>
  );
}
