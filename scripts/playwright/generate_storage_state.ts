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

    const authHeading = page.getByRole('heading', { name: 'Inicia sesión', exact: true });
    await expect(authHeading).toBeVisible();

    await page.locator('#signin-email').fill(email);
    await page.locator('#signin-password').fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect
      .poll(
        async () => page.evaluate(() => window.location.hash.replace(/^#/, '') || '/'),
        { timeout: 15_000 },
      )
      .not.toBe('/auth');

    await expect(authHeading).toBeHidden();

    await context.storageState({ path: storageStatePath });
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

void main();
