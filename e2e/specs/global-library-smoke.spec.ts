import { expect, test, type Page } from '@playwright/test';

import { gotoApp, expectHashPath, waitForAppReady } from '../helpers/app';
import { hasExternalStorageState } from '../helpers/auth';
import {
  globalRecipesAllPath,
  normalizeHashPath,
  recipeCookingPath,
  recipeIngredientsPath,
  recipeSetupPath,
} from '../helpers/routes';
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

async function openRecipeFromAllRecipes(page: Page, recipeName: string): Promise<void> {
  const recipeCard = page.locator('article').filter({ has: page.getByRole('heading', { name: recipeName, exact: true }) }).first();
  await expect(recipeCard).toBeVisible();

  await recipeCard.getByRole('button', { name: 'Abrir', exact: true }).click();
}

async function expectNotAtHome(page: Page): Promise<void> {
  await expect
    .poll(async () => normalizeHashPath(await page.evaluate(() => window.location.hash.replace(/^#/, '') || '/')))
    .not.toBe('/');
}

test.describe('Global library smoke', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, globalRecipesAllPath);
    await assertAppSessionReady(page);
    await expectHashPath(page, globalRecipesAllPath);
  });

  test('library opens a visible V2 recipe page without redirecting home', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Keke de plátano', exact: false })).toBeVisible();

    await openRecipeFromAllRecipes(page, 'Keke de plátano');

    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));
    await expectNotAtHome(page);
    await expect(page.getByText('Configura tu receta', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
    await expect(page.getByText('Ingredientes', { exact: true })).toBeVisible();
  });

  test('keke unified journey opens as a single recipe page and closes back to the library', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Keke de plátano');
    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, globalRecipesAllPath);
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
  });

  test('keke unified journey bridges into the current cooking runtime', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Keke de plátano');
    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, '/recetas/keke-platano-molde/cocinar');
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
    await expect(page.getByText('Keke de plátano', { exact: true })).toBeVisible();
  });

  test('papas-airfryer stays anchored to setup route instead of bouncing home', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Papas en airfryer');

    await expectHashPath(page, recipeSetupPath('papas-airfryer'));
    await expectNotAtHome(page);
    await expect(page.getByRole('heading', { name: 'Papas en airfryer', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
  });

  test('papas-airfryer unified journey keeps a single page and closes back to the library', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Papas en airfryer');
    await expectHashPath(page, recipeSetupPath('papas-airfryer'));
    await expect(page.getByRole('heading', { name: 'Papas en airfryer', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, globalRecipesAllPath);
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
  });

  test('pan-palta-huevo unified journey keeps setup and ingredients on the same page', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Pan con palta y huevo');
    await expectHashPath(page, recipeSetupPath('pan-palta-huevo'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sal/i }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, globalRecipesAllPath);
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
  });

  test('pan-palta-huevo optional ingredient selection survives ingredients to cook', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Pan con palta y huevo');
    await expectHashPath(page, recipeSetupPath('pan-palta-huevo'));

    const optionalSaltButton = page.getByRole('button', { name: /Sal/i }).first();
    await expect(optionalSaltButton).toBeVisible();

    await optionalSaltButton.click();
    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('pan-palta-huevo'));
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingredientes', exact: true })).toBeVisible();
  });

  test('quinua-desayuno optional ingredient selection survives ingredients to cook', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Quinua del desayuno');
    await expectHashPath(page, recipeSetupPath('quinua-desayuno'));

    const optionalHoneyButton = page.getByRole('button', { name: /Miel/i }).first();
    await expect(optionalHoneyButton).toBeVisible();

    await optionalHoneyButton.click();
    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('quinua-desayuno'));
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
  });

  test('huevo-sancochado unified journey reaches the current cooking runtime', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Huevo sancochado');
    await expectHashPath(page, recipeSetupPath('huevo-sancochado'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('huevo-sancochado'));
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
    await expect(page.getByText('Huevo sancochado', { exact: true })).toBeVisible();
  });

  test('lomo-saltado-casero unified journey reaches the current cooking runtime', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Lomo saltado casero');
    await expectHashPath(page, recipeSetupPath('lomo-saltado-casero'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('lomo-saltado-casero'));
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
  });

  test('arroz unified journey reaches the current cooking runtime', async ({ page }) => {
    const recipeCard = page.locator('article').filter({ has: page.getByRole('heading', { name: /Arroz perfecto/i }) }).first();
    await expect(recipeCard).toBeVisible();
    await recipeCard.getByRole('button', { name: 'Abrir', exact: true }).click();
    await expectHashPath(page, recipeSetupPath('arroz'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('arroz'));
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
  });

  test('sopa-verduras unified journey reaches the current cooking runtime', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Sopa de verduras');
    await expectHashPath(page, recipeSetupPath('sopa-verduras'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('sopa-verduras'));
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
  });

  test('compound unified journey reaches the current compound runtime', async ({ page }) => {
    await gotoApp(page, '/experimentos/recetas-compuestas');
    await assertAppSessionReady(page);
    const compoundCard = page.locator('article').filter({ has: page.getByRole('heading', { name: /Arroz con lentejas/i }) }).first();
    await expect(compoundCard).toBeVisible();
    await compoundCard.getByRole('button', { name: 'Abrir configuración', exact: true }).click();
    await expectHashPath(page, recipeSetupPath('arroz-lentejas-compuesto'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('arroz-lentejas-compuesto'));
  });

  test('tallarines-rojos-compuesto unified journey reaches the current compound runtime', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Tallarines rojos coordinados');
    await expectHashPath(page, recipeSetupPath('tallarines-rojos-compuesto'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();

    await expectHashPath(page, recipeCookingPath('tallarines-rojos-compuesto'));
  });

  test('closing an overlay opened from library returns to library instead of home', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Keke de plátano');
    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, globalRecipesAllPath);
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Keke de plátano', exact: false })).toBeVisible();
  });

  test('closing ingredients opened from Todas returns to Todas instead of home', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Papas en airfryer');
    await expectHashPath(page, recipeSetupPath('papas-airfryer'));

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
    await expectHashPath(page, recipeCookingPath('papas-airfryer'));

    await page.getByRole('button', { name: 'Ingredientes', exact: true }).click();
    await expectHashPath(page, recipeIngredientsPath('papas-airfryer'));

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, globalRecipesAllPath);
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
  });

  test('closing a unified journey reopened from cooking returns to Todas', async ({ page }) => {
    await openRecipeFromAllRecipes(page, 'Keke de plátano');
    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));

    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
    await expectHashPath(page, recipeCookingPath('keke-platano-molde'));

    await page.getByRole('button', { name: 'Ajustar', exact: true }).click();
    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, globalRecipesAllPath);
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
  });

  test('all recipes route persists after reload', async ({ page }) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await assertAppSessionReady(page);

    await expectHashPath(page, globalRecipesAllPath);
    await expect(page.getByRole('heading', { name: /todas/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Papas en airfryer', exact: true })).toBeVisible();
  });
});
