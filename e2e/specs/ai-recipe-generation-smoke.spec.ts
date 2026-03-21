import { expect, test, type Page } from '@playwright/test';

import { currentHashPath, gotoApp, waitForAppReady } from '../helpers/app';
import { hasExternalStorageState } from '../helpers/auth';
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

async function openAIWizard(page: Page): Promise<void> {
  await gotoApp(page, '/');
  await assertAppSessionReady(page);
  await page.getByRole('button', { name: 'Crear receta nueva con IA', exact: true }).click();
  await expect(page.getByText('Paso 1 de 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
}

async function openMyRecipes(page: Page): Promise<void> {
  await gotoApp(page, '/mis-recetas');
  await assertAppSessionReady(page);

  await expect(page.getByText('Biblioteca personal', { exact: true })).toBeVisible();
}

async function openRecipeFromMyRecipes(page: Page, recipeName: string): Promise<void> {
  const recipeCard = page.locator('article').filter({ has: page.getByRole('heading', { name: recipeName, exact: true }) }).first();
  await expect(recipeCard).toBeVisible();
  await expect(recipeCard.getByText('Generada con IA', { exact: true })).toBeVisible();
  await recipeCard.getByRole('button', { name: 'Abrir', exact: true }).click();
}

async function expectRecipeInMyRecipes(page: Page, recipeName: string): Promise<void> {
  const recipeCard = page.locator('article').filter({ has: page.getByRole('heading', { name: recipeName, exact: true }) }).first();
  await expect(recipeCard).toBeVisible();
  await expect(recipeCard.getByText('Generada con IA', { exact: true })).toBeVisible();
}

async function startRecipeFromSetup(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Ver ingredientes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver ingredientes', exact: true }).click();
  const startButton = page.getByRole('button', { name: /Empezar (a cocinar|receta)/i });
  await expect(startButton).toBeVisible();
  await startButton.click();
}

test.describe('AI recipe generation smoke', () => {
  test('mock standard recipe can be generated, saved, reopened, and cooked from My Recipes', async ({ page }) => {
    await openAIWizard(page);

    await page.getByRole('button', { name: 'Saltar a refinamiento', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generar receta mock', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Generar receta mock', exact: true }).click();

    await expect(page.getByText('Milanesa crocante de pollo', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Salir', exact: true }).click();
    await waitForAppReady(page);

    await openMyRecipes(page);
    await openRecipeFromMyRecipes(page, 'Milanesa crocante de pollo');
    await startRecipeFromSetup(page);

    await expect(page.getByText('Milanesa crocante de pollo', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
  });

  test('mock compound recipe can be generated, saved, reopened, and reaches the compound runtime', async ({ page }) => {
    await openAIWizard(page);

    await page.getByPlaceholder(/Describe tu idea/i).fill('Quiero tallarines rojos con salsa y pasta en paralelo.');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Empezando receta...', exact: true })).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText('Tallarines rojos compuestos', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timers y estado', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toHaveCount(0);
    const currentPath = await currentHashPath(page);
    const match = currentPath.match(/^\/recetas\/([^/]+)\/cocinar$/);
    expect(match, `Expected a compound cooking route, got ${currentPath}`).not.toBeNull();
    const savedRecipeId = decodeURIComponent(match?.[1] ?? '');

    await openMyRecipes(page);
    await expectRecipeInMyRecipes(page, 'Tallarines rojos compuestos');
    await gotoApp(page, `/recetas/${encodeURIComponent(savedRecipeId)}/cocinar`);

    await expect(page.getByText('Tallarines rojos compuestos', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timers y estado', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toHaveCount(0);
  });
});
