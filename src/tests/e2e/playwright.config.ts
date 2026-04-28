import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 1,
  reporter: "list",

  use: {
    baseURL: "http://localhost:3000",
    // Keep browser context across steps within a test.
    trace: "on-first-retry",
    // Accept self-signed certs from dev server.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start Next.js dev server if not already running.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
