import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4100",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "rm -f data/playwright-sprint1.sqlite && MIQO_HARNESS_DB=data/playwright-sprint1.sqlite MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_LIVE_PROVIDERS_ENABLED=false npm run dev:harness",
    url: "http://127.0.0.1:4100/health",
    reuseExistingServer: false,
    timeout: 30_000
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
