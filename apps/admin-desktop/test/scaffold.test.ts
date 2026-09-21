import { describe, expect, it } from "vitest";
import { SCAFFOLD_IDENTITY } from "../src/app/scaffold-identity";

describe("Desktop scaffold identity", () => {
  it("remains explicitly limited to WP-G8.1", () => {
    expect(SCAFFOLD_IDENTITY).toEqual({
      productName: "MIQOS Admin",
      packageEnvironment: "TEST",
      workPackage: "WP-G8.1",
      status: "SCAFFOLD_ONLY"
    });
  });
});
