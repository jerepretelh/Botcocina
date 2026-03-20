import { expect, type Page } from '@playwright/test';

import { authLoadingLocator } from './selectors';
import { normalizeHashPath, toAppUrl } from './routes';

export async function gotoApp(page: Page, hashPath = '/'): Promise<void> {
  await page.goto(toAppUrl(hashPath), { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
}

export async function waitForAppReady(page: Page): Promise<void> {
  const authLoading = authLoadingLocator(page);
  const loadingVisible = await authLoading.isVisible({ timeout: 1_000 }).catch(() => false);

  if (loadingVisible) {
    await expect(authLoading).toBeHidden({ timeout: 10_000 });
  }

  await page.waitForLoadState('networkidle').catch(() => undefined);
}

export async function currentHashPath(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const nextPath = window.location.hash.replace(/^#/, '');
    return nextPath || '/';
  });
}

export async function expectHashPath(page: Page, expectedPath: string): Promise<void> {
  await expect
    .poll(async () => normalizeHashPath(await currentHashPath(page)))
    .toBe(normalizeHashPath(expectedPath));
}
