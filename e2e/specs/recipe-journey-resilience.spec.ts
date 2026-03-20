import { expect, test, type Page } from '@playwright/test';

import { expectHashPath, gotoApp, waitForAppReady } from '../helpers/app';
import { hasExternalStorageState } from '../helpers/auth';
import {
  globalRecipesAllPath,
  recipeCookingPath,
  recipeIngredientsPath,
  recipeSetupPath,
} from '../helpers/routes';
import { authScreenLocator } from '../helpers/selectors';

async function assertAppSessionReady(page: Page): Promise<void> {
  if (!hasExternalStorageState()) {
    const authVisible = await authScreenLocator(page).isVisible({ timeout: 1_500 }).catch(() => false);
    expect(
      authVisible,
      'The app requires an authenticated session. Re-run with PLAYWRIGHT_STORAGE_STATE pointing to a valid state.json.',
    ).toBe(false);
    return;
  }

  await expect
    .poll(
      async () => authScreenLocator(page).isVisible({ timeout: 1_500 }).catch(() => false),
      {
        message: 'The app is showing the auth screen even though PLAYWRIGHT_STORAGE_STATE was provided.',
        timeout: 10_000,
      },
    )
    .toBe(false);
}

async function openRecipeFromAllRecipes(page: Page, recipeName: string): Promise<void> {
  const recipeCard = page.locator('article').filter({ has: page.getByRole('heading', { name: recipeName, exact: true }) }).first();
  await expect(recipeCard).toBeVisible();
  await recipeCard.getByRole('button', { name: 'Abrir', exact: true }).click();
}

async function openCompoundRecipeFromLab(page: Page, recipeName: RegExp): Promise<void> {
  const compoundCard = page.locator('article').filter({ has: page.getByRole('heading', { name: recipeName }) }).first();
  await expect(compoundCard).toBeVisible();
  await compoundCard.getByRole('button', { name: 'Abrir configuración', exact: true }).click();
}

test.describe('Recipe journey resilience', () => {
  test('reload keeps keke setup route mounted', async ({ page }) => {
    await gotoApp(page, globalRecipesAllPath);
    await assertAppSessionReady(page);

    await openRecipeFromAllRecipes(page, 'Keke de plátano');
    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await assertAppSessionReady(page);

    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
  });

  test('reload keeps papas-airfryer ingredients route mounted', async ({ page }) => {
    await gotoApp(page, recipeIngredientsPath('papas-airfryer'));
    await assertAppSessionReady(page);
    await expectHashPath(page, recipeIngredientsPath('papas-airfryer'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await assertAppSessionReady(page);

    await expectHashPath(page, recipeIngredientsPath('papas-airfryer'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
  });

  test('back returns to setup and close returns to returnTo for compound journey', async ({ page }) => {
    await gotoApp(page, '/experimentos/recetas-compuestas');
    await assertAppSessionReady(page);

    await openCompoundRecipeFromLab(page, /Arroz con lentejas/i);
    await expectHashPath(page, recipeSetupPath('arroz-lentejas-compuesto'));

    await gotoApp(page, recipeIngredientsPath('arroz-lentejas-compuesto'));
    await assertAppSessionReady(page);
    await expectHashPath(page, recipeIngredientsPath('arroz-lentejas-compuesto'));

    await page.locator('button:has(svg.lucide-arrow-left)').first().click();
    await expectHashPath(page, recipeSetupPath('arroz-lentejas-compuesto'));

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, '/experimentos/recetas-compuestas');
    await expect(page.getByRole('heading', { name: /Recetas compuestas de prueba/i })).toBeVisible();
  });

  test('auth bootstrap preserves deep journey routes', async ({ page }) => {
    await gotoApp(page, recipeIngredientsPath('papas-airfryer'));
    await assertAppSessionReady(page);

    await expectHashPath(page, recipeIngredientsPath('papas-airfryer'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
  });

  test('reopening journey stages from cooking keeps a visible page instead of blanking the screen', async ({ page }) => {
    await gotoApp(page, globalRecipesAllPath);
    await assertAppSessionReady(page);

    await openRecipeFromAllRecipes(page, 'Sopa de verduras');
    await expectHashPath(page, recipeSetupPath('sopa-verduras'));
    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ingredientes', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Ingredientes', exact: true }).click();
    await expectHashPath(page, recipeIngredientsPath('sopa-verduras'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await page.locator('button:has(svg.lucide-arrow-left)').first().click();
    await expectHashPath(page, recipeSetupPath('sopa-verduras'));
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
  });

  test('reload keeps cooking route mounted for a unified journey recipe', async ({ page }) => {
    await gotoApp(page, globalRecipesAllPath);
    await assertAppSessionReady(page);

    await openRecipeFromAllRecipes(page, 'Keke de plátano');
    await expectHashPath(page, recipeSetupPath('keke-platano-molde'));
    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
    await expectHashPath(page, recipeCookingPath('keke-platano-molde'));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await assertAppSessionReady(page);

    await expectHashPath(page, recipeCookingPath('keke-platano-molde'));
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
  });

  test('compound cooking preserves returnTo when reopening setup and closing', async ({ page }) => {
    await gotoApp(page, '/experimentos/recetas-compuestas');
    await assertAppSessionReady(page);

    await openCompoundRecipeFromLab(page, /Arroz con lentejas/i);
    await expectHashPath(page, recipeSetupPath('arroz-lentejas-compuesto'));
    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
    await expectHashPath(page, recipeCookingPath('arroz-lentejas-compuesto'));

    await gotoApp(page, recipeSetupPath('arroz-lentejas-compuesto'));
    await assertAppSessionReady(page);
    await expectHashPath(page, recipeSetupPath('arroz-lentejas-compuesto'));

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);

    await expectHashPath(page, '/experimentos/recetas-compuestas');
    await expect(page.getByRole('heading', { name: /Recetas compuestas de prueba/i })).toBeVisible();
  });

  test('reload keeps cooking route mounted for a compound journey recipe', async ({ page }) => {
    await gotoApp(page, '/experimentos/recetas-compuestas');
    await assertAppSessionReady(page);

    await openCompoundRecipeFromLab(page, /Arroz con lentejas/i);
    await expectHashPath(page, recipeSetupPath('arroz-lentejas-compuesto'));
    await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
    await expectHashPath(page, recipeCookingPath('arroz-lentejas-compuesto'));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await assertAppSessionReady(page);

    await expectHashPath(page, recipeCookingPath('arroz-lentejas-compuesto'));
    await expect(page.getByRole('button', { name: 'Timers y estado', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Arroz con lentejas', exact: true })).toBeVisible();
  });
});
