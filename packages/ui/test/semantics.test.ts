import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {ComparisonStateBadge,EnvironmentBanner,LineageId,StatusBadge,createApplicationEnvironmentVM} from "../src/index";

describe("MIQOS semantic foundation",()=>{
  it("renders LOCKED as informational rather than success",()=>{
    const html=renderToStaticMarkup(createElement(StatusBadge,{status:"LOCKED"}));
    expect(html).toContain('data-tone="info"');
    expect(html).toContain("LOCKED");
  });
  it("keeps adjusted comparable dormant",()=>{
    const html=renderToStaticMarkup(createElement(ComparisonStateBadge,{state:"ADJUSTED_COMPARABLE"}));
    expect(html).toContain('data-tone="dormant"');
    expect(html).toContain("ADJUSTED — DORMANT");
  });
  it("renders persistent synthetic disclosure",()=>{
    const environment=createApplicationEnvironmentVM("SYNTHETIC");
    const html=renderToStaticMarkup(createElement(EnvironmentBanner,{environment}));
    expect(html).toContain("SYNTHETIC");
    expect(html).toContain("Test data and test quotations only");
    expect(html).toContain("No live insurer connection");
  });
  it("renders lineage ids without reinterpreting them",()=>{
    const html=renderToStaticMarkup(createElement(LineageId,{value:"RPV-SYN-001"}));
    expect(html).toContain("<code>RPV-SYN-001</code>");
  });
});
