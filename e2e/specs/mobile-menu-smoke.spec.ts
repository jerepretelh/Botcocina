import { expect, test, type Page } from '@playwright/test';

import { expectHashPath, gotoApp } from '../helpers/app';
import { hasExternalStorageState } from '../helpers/auth';
import { globalRecipesHomePath } from '../helpers/routes';
import { authScreenLocator } from '../helpers/selectors';

async function assertAppSessionReady(page: Page): Promise<void> {
  const authVisible = await authScreenLocator(page).isVisible({ timeout: 1_500 }).catch(() => false);

  expect(
    authVisible,
    hasExternalStorageState()
      ? 'The app is showing the auth screen even though PLAYWRIGHT_STORAGE_STATE was provided.'
      : 'The app requires an authenticated session. Re-run with PLAYWRIGHT_STORAGE_STATE pointing to a valid state.json.',
  ).toBe(false);
}

test.describe('Mobile menu smoke', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, '/');
    await assertAppSessionReady(page);
  });

  test('navigates to primary destinations from the mobile menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('button', { name: 'Favoritos', exact: true }).click();
    await expectHashPath(page, '/favoritos');

    await page.getByRole('button', { name: 'Recetas', exact: true }).click();
    await expectHashPath(page, globalRecipesHomePath);

    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await expectHashPath(page, '/ajustes');
  });
});
