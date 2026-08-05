import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 3000;
const isProduction = process.env.E2E_PROD === "true";

export default defineConfig({
  testDir: "./__tests__/e2e",
  fullyParallel: false,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isProduction
      ? "npm run start"
      : "HOSTNAME=0.0.0.0 npm run dev",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
