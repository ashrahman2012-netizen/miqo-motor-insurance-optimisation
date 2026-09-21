import { describe, expect, it } from "vitest";
import { SCAFFOLD_IDENTITY } from "../src/app/scaffold-identity";

describe("Desktop skeleton proof identity", () => {
  it("remains explicitly TEST/SYNTHETIC and G8-scoped", () => {
    expect(SCAFFOLD_IDENTITY).toEqual({
      productName: "MIQOS Admin",
      packageEnvironment: "TEST",
      applicationEnvironment: "SYNTHETIC",
      workPackage: "G8",
      status: "SKELETON_PROOF"
    });
  });
});
