import type {ApplicationEnvironment, ApplicationEnvironmentVM} from "@miqo/application-contracts";

export function createApplicationEnvironmentVM(environment: ApplicationEnvironment): ApplicationEnvironmentVM {
  if (environment === "SYNTHETIC") {
    return {
      environment,
      displayLabel: "SYNTHETIC",
      dataClassification: "SYNTHETIC",
      providerConnectivityClass: "DISABLED",
      customerBanner: "PERSISTENT",
      customerBannerMessage: "SYNTHETIC — Test data and test quotations only. No live insurer connection.",
      adminBadge: "INFO",
    };
  }
  if (environment === "CERTIFICATION") {
    return {
      environment,
      displayLabel: "CERTIFICATION",
      dataClassification: "CERTIFICATION",
      providerConnectivityClass: "CONTROLLED_CERTIFICATION",
      customerBanner: "PERSISTENT",
      customerBannerMessage: "CERTIFICATION — Controlled provider verification environment. Results are not customer quotations.",
      adminBadge: "CERTIFICATION",
    };
  }
  return {
    environment,
    displayLabel: "PRODUCTION",
    dataClassification: "PRODUCTION",
    providerConnectivityClass: "RUNTIME_CONTROLLED",
    customerBanner: "NONE",
    customerBannerMessage: null,
    adminBadge: "NEUTRAL",
  };
}
