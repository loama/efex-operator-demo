import { defineConfig } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  reporter: "line",
  retries: 0,
  testDir: "./scripts",
  testMatch: "web-hydration.spec.ts",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "bun run scripts/serve-dist.ts",
    port: 4173,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  workers: 1,
});
