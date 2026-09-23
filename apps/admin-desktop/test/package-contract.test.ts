import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const config=JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json",import.meta.url),"utf8"));

describe("DB-G9 frozen Windows package contract",()=>{
  it("keeps the authorised NSIS current-user lifecycle model",()=>{
    expect(config.bundle.targets).toEqual(["nsis"]);
    expect(config.bundle.windows.nsis.installMode).toBe("currentUser");
    expect(config.bundle.windows.allowDowngrades).toBe(false);
    expect(config.bundle.windows.webviewInstallMode.type).toBe("embedBootstrapper");
  });

  it("keeps packaged renderer hardening and updater absence explicit",()=>{
    expect(config.app.windows[0].devtools).toBe(false);
    expect(config.app.security.csp).toContain("default-src 'self'");
    expect(config.app.security.csp).toContain("connect-src 'self'");
    expect(config.plugins?.updater).toBeUndefined();
  });
});
