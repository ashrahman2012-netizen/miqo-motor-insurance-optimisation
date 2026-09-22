import {describe, expect, it} from "vitest";
import {DESKTOP_BUILD_IDENTITY} from "../src/app/build-identity";
import {ADMIN_NAVIGATION, normaliseDesktopPath, resolveDesktopRoute} from "../src/app/navigation";

describe("Desktop application foundation identity", () => {
  it("remains explicitly TEST/SYNTHETIC and DB-G2 scoped", () => {
    expect(DESKTOP_BUILD_IDENTITY).toEqual({
      productName: "MIQOS Admin",
      packageEnvironment: "TEST",
      applicationEnvironment: "SYNTHETIC",
      programme: "MIQOS-DESKTOP-BUILD-001",
      gateway: "DB-G2",
      status: "APPLICATION_FOUNDATION",
    });
  });

  it("freezes the canonical Admin navigation without customer actions", () => {
    expect(ADMIN_NAVIGATION.map(item => item.label)).toEqual([
      "Dashboard",
      "Cases",
      "Optimisation",
      "Scenarios",
      "Market Routes",
      "Quote Runs",
      "Recommendation Sets",
      "Integrity",
      "Discrepancies",
      "Audit & Trace",
      "Providers",
      "Certification",
      "System",
    ]);
  });

  it("normalises packaged entry and resolves dynamic read-only routes", () => {
    expect(normaliseDesktopPath("/index.html")).toBe("/");
    expect(normaliseDesktopPath("/admin/audit/")).toBe("/admin/audit");
    expect(resolveDesktopRoute("/admin/profiles/PRO-SYN-001").disposition).toBe("READ_ONLY");
    expect(resolveDesktopRoute("/admin/profile-versions/RPV-SYN-001-V1").disposition).toBe("READ_ONLY");
    expect(resolveDesktopRoute("/admin/selections/SEL-SYN-001/trace").disposition).toBe("READ_ONLY");
  });

  it("keeps provider activation and unsupported global functionality out of the route model", () => {
    expect(resolveDesktopRoute("/admin/providers").disposition).toBe("RESERVED");
    expect(resolveDesktopRoute("/admin/optimisation").disposition).toBe("TRACE_DERIVED");
    expect(resolveDesktopRoute("/admin/unknown").disposition).toBe("NOT_FOUND");
  });
});
