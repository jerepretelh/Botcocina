import { expect, test, type Locator, type Page } from '@playwright/test';

import { expectHashPath, gotoApp, waitForAppReady } from '../helpers/app';
import { hasExternalStorageState } from '../helpers/auth';
import { isProductionLikePlaywrightTarget } from '../helpers/environment';
import {
  globalRecipesAllPath,
  recipeCookingPath,
  recipeSetupPath,
} from '../helpers/routes';
import { authScreenLocator } from '../helpers/selectors';

const STANDARD_RECIPE = {
  id: 'keke-platano-molde',
  name: 'Keke de plátano',
};

const COMPOUND_RECIPE = {
  id: 'arroz-lentejas-compuesto',
  name: /Arroz con lentejas/i,
};

test.describe('Production authenticated smoke', () => {
  test.skip(!isProductionLikePlaywrightTarget(), 'This smoke is intended for a non-local authenticated deployment target.');

  async function assertAppSessionReady(page: Page): Promise<void> {
    const authVisible = await authScreenLocator(page).isVisible({ timeout: 1_500 }).catch(() => false);

    expect(
      authVisible,
      hasExternalStorageState()
        ? 'The app is showing the auth screen even though PLAYWRIGHT_STORAGE_STATE was provided.'
        : 'The product smoke requires an authenticated session. Re-run with PLAYWRIGHT_STORAGE_STATE pointing to a valid state.json.',
    ).toBe(false);
  }

  function recipeCard(page: Page, recipeName: string | RegExp): Locator {
    return page.locator('article').filter({ has: page.getByRole('heading', { name: recipeName }) }).first();
  }

  test('covers standard journey, compound returnTo, and planning/shopping continuity', async ({ page }) => {
    await test.step('standard journey stays stable from Todas through close', async () => {
      await gotoApp(page, globalRecipesAllPath);
      await assertAppSessionReady(page);
      await expectHashPath(page, globalRecipesAllPath);

      const standardCard = recipeCard(page, STANDARD_RECIPE.name);
      await expect(standardCard).toBeVisible();
      await standardCard.getByRole('button', { name: 'Abrir', exact: true }).click();

      await expectHashPath(page, recipeSetupPath(STANDARD_RECIPE.id));
      await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
      await expectHashPath(page, recipeCookingPath(STANDARD_RECIPE.id));
      await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Ajustar', exact: true }).click();
      await expectHashPath(page, recipeSetupPath(STANDARD_RECIPE.id));

      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await waitForAppReady(page);
      await expectHashPath(page, globalRecipesAllPath);
    });

    await test.step('compound preserves returnTo from lab', async () => {
      await gotoApp(page, '/experimentos/recetas-compuestas');
      await assertAppSessionReady(page);

      const compoundCard = recipeCard(page, COMPOUND_RECIPE.name);
      await expect(compoundCard).toBeVisible();
      await compoundCard.getByRole('button', { name: 'Abrir configuración', exact: true }).click();

      await expectHashPath(page, recipeSetupPath(COMPOUND_RECIPE.id));
      await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
      await expectHashPath(page, recipeCookingPath(COMPOUND_RECIPE.id));

      await gotoApp(page, recipeSetupPath(COMPOUND_RECIPE.id));
      await assertAppSessionReady(page);
      await expectHashPath(page, recipeSetupPath(COMPOUND_RECIPE.id));

      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await waitForAppReady(page);
      await expectHashPath(page, '/experimentos/recetas-compuestas');
    });

    await test.step('planning and shopping keep a V2 recipe operational', async () => {
      await gotoApp(page, globalRecipesAllPath);
      await assertAppSessionReady(page);

      const standardCard = recipeCard(page, STANDARD_RECIPE.name);
      await expect(standardCard).toBeVisible();
      await standardCard.getByRole('button', { name: 'Planificar', exact: true }).click();

      await expect(page.getByRole('button', { name: 'Agregar al plan', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Agregar al plan', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Agregar al plan', exact: true })).toBeHidden({ timeout: 10_000 });

      await gotoApp(page, '/plan-semanal');
      await assertAppSessionReady(page);
      await expect(page.getByRole('heading', { name: 'Plan semanal', exact: true })).toBeVisible();
      await expect(page.getByText(STANDARD_RECIPE.name, { exact: false }).first()).toBeVisible();

      const plannedCard = page.locator('div.rounded-\\[1\\.5rem\\]').filter({
        has: page.getByText(STANDARD_RECIPE.name, { exact: false }),
      }).first();
      await plannedCard.getByRole('button', { name: 'Abrir', exact: true }).click();
      await expectHashPath(page, recipeSetupPath(STANDARD_RECIPE.id));

      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await waitForAppReady(page);
      await expectHashPath(page, '/plan-semanal');

      await page.getByRole('button', { name: 'Abrir compras', exact: true }).click();
      await expectHashPath(page, '/compras');
      await expect(page.getByRole('heading', { name: 'Lista planeada', exact: true })).toBeVisible();
      await expect(page.getByText(/Para: Keke de plátano/i)).toBeVisible();
    });
  });
});
