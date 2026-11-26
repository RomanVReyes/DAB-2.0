import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.E2E_PORT || 3100);
const localURL = "http://127.0.0.1:" + port;
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? localURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "msedge" },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        channel: "msedge",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port " + port,
    url: localURL + "/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
