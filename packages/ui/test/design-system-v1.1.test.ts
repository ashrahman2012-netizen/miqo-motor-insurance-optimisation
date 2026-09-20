import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const tokens=JSON.parse(readFileSync(new URL("../tokens/miqos-design-tokens.v1.1.json",import.meta.url),"utf8"));
const semantics=JSON.parse(readFileSync(new URL("../tokens/miqos-semantic-mappings.v1.1.json",import.meta.url),"utf8"));

describe("MIQOS-DS-001 v1.1 visual baseline",()=>{
  it("freezes the refined core palette",()=>{
    expect(tokens.color.bg.canvas).toBe("#041428");
    expect(tokens.color.surface.primary).toBe("#0F1F3A");
    expect(tokens.color.brand.primary).toBe("#3574FF");
    expect(tokens.color.brand.secondaryAccent).toBe("#7000FF");
    expect(tokens.color.state.success).toBe("#10B981");
    expect(tokens.color.state.warning).toBe("#F59E0B");
    expect(tokens.color.state.danger).toBe("#EF4444");
  });

  it("keeps interaction and outcome semantics distinct",()=>{
    expect(semantics.controlClasses.O.accent).toBe("#3574FF");
    expect(semantics.statuses.READY).toBe("success");
    expect(semantics.statuses.PENDING).toBe("warning");
    expect(semantics.statuses.BLOCKED).toBe("danger");
    expect(semantics.statuses.CERTIFICATION).toBe("certification");
    expect(semantics.controlClasses.I.severityIndependent).toBe(true);
  });

  it("records restrained glow as a governance rule",()=>{
    expect(tokens.shadow.rule).toContain("selective emphasis");
  });
});
