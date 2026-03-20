import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const defaultBaseUrl = 'http://127.0.0.1:4173';
const storageStateEnv = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();
const resolvedStorageState = storageStateEnv ? path.resolve(storageStateEnv) : null;
const storageState = resolvedStorageState && fs.existsSync(resolvedStorageState)
  ? resolvedStorageState
  : undefined;

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/.artifacts/html-report', open: 'never' }],
  ],
  outputDir: 'e2e/.artifacts/test-results',
  use: {
    ...devices['Pixel 7'],
    baseURL: defaultBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: defaultBaseUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
