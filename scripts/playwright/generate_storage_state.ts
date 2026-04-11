import { chromium, expect } from '@playwright/test';

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173').trim().replace(/\/+$/, '');
const email = process.env.PLAYWRIGHT_AUTH_EMAIL?.trim();
const password = process.env.PLAYWRIGHT_AUTH_PASSWORD ?? '';
const storageStatePath = (process.env.PLAYWRIGHT_STORAGE_STATE_OUTPUT ?? 'playwright/.auth/user.json').trim();

if (!email) {
  throw new Error('PLAYWRIGHT_AUTH_EMAIL is required.');
}

if (!password) {
  throw new Error('PLAYWRIGHT_AUTH_PASSWORD is required.');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/#/auth`, { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#signin-email');
    const passwordInput = page.locator('#signin-password');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect
      .poll(
        async () => page.evaluate(() => window.location.hash.replace(/^#/, '') || '/'),
        { timeout: 15_000 },
      )
      .not.toBe('/auth');

    await context.storageState({ path: storageStatePath });
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

void main();
