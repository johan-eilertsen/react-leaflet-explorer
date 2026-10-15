import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  testMatch: "*.spec.ts",
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3112",
    browserName: "chromium",
    launchOptions: { channel: "chrome" },
    viewport: { width: 1000, height: 700 },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/browser/serve-package.mjs",
    url: "http://127.0.0.1:3112",
    reuseExistingServer: false,
  },
});
