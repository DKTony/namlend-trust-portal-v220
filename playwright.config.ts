import { defineConfig, devices } from '@playwright/test';

const PORT = 8080;
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Environment wiring summary:
//   VITE_CONVEX_URL       — Convex backend (required for all UI tests)
//   VITE_SUPABASE_URL     — Legacy Supabase (optional; legacy API tests self-skip when absent)
//   VITE_SUPABASE_ANON_KEY — Legacy Supabase anon key (optional)
//   SUPABASE_SERVICE_ROLE_KEY — Legacy service key (optional; approval-rpc-race-condition only)
//   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD — Test credentials (defaults in global-setup.ts)
//   BASE_URL              — Override app URL (default: http://localhost:8080)

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.(e2e|spec)\.ts/,
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Workers kept at 1 to avoid Convex Auth rate limiting during parallel sign-in flows.
  // Increase to 2+ once UI tests use pre-seeded session tokens instead of login form.
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev:e2e',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
