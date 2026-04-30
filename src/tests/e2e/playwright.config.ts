import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 1,
  reporter: "list",
  globalSetup: "./global-setup.ts",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
    // Default session: Pinky (admin). Tests that need Gabote call loginAs(page, "gabote") explicitly.
    storageState: path.join(__dirname, ".auth/pinky.json"),
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
