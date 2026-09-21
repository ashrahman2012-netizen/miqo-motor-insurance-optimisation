import {describe, expect, it} from "vitest";
import {createApplicationEnvironmentVM} from "@miqo/ui";
import {DESKTOP_NAVIGATION} from "./shell";

describe("MIQOS Desktop scaffold", () => {
  it("retains the synthetic environment boundary", () => {
    const environment = createApplicationEnvironmentVM("SYNTHETIC");
    expect(environment.dataClassification).toBe("SYNTHETIC");
    expect(environment.providerConnectivityClass).toBe("DISABLED");
  });

  it("exposes only the minimal System route at scaffold stage", () => {
    expect(DESKTOP_NAVIGATION).toEqual([
      {label: "System", href: "/admin/system"},
    ]);
  });
});
