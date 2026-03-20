import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { getPlaywrightBaseUrl, isLocalPlaywrightTarget } from './e2e/helpers/environment';

const defaultBaseUrl = 'http://127.0.0.1:4173';
const configuredBaseUrl = getPlaywrightBaseUrl();
const storageStateEnv = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();
const resolvedStorageState = storageStateEnv ? path.resolve(storageStateEnv) : null;
const storageState = resolvedStorageState && fs.existsSync(resolvedStorageState)
  ? resolvedStorageState
  : undefined;
const shouldUseLocalWebServer = isLocalPlaywrightTarget(configuredBaseUrl);
const localTargetUrl = new URL(configuredBaseUrl);
const localTargetHost = localTargetUrl.hostname || '127.0.0.1';
const localTargetPort = Number(localTargetUrl.port || '4173');

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
    baseURL: configuredBaseUrl || defaultBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState,
  },
  webServer: shouldUseLocalWebServer
    ? {
        command: `npm run dev -- --host ${localTargetHost} --port ${localTargetPort}`,
        url: configuredBaseUrl || defaultBaseUrl,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
