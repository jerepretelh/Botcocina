import { expect, test, type Page } from '@playwright/test';

import { gotoApp, waitForAppReady } from '../helpers/app';
import { hasExternalStorageState } from '../helpers/auth';
import { authScreenLocator } from '../helpers/selectors';

const SAMPLE_IMPORT_RECIPE = `[
  {
    "id": "e2e-import-mock-${Date.now()}",
    "title": "Receta E2E Importada",
    "recipeCategory": "stovetop",
    "servings": 2,
    "ingredients": [
      {
        "title": "Base E2E",
        "items": [{ "name": "Ingrediente de prueba", "canonicalName": "ingrediente", "amount": 1, "unit": "unidad" }]
      }
    ],
    "phases": [
      {
        "id": "phase-1",
        "number": "FASE 1",
        "title": "Preparación E2E",
        "steps": [
          { "id": "s1", "text": "Hacer la receta de prueba importada" }
        ]
      }
    ]
  }
]`;

async function assertAppSessionReady(page: Page): Promise<void> {
  const authVisible = await authScreenLocator(page).isVisible({ timeout: 1_500 }).catch(() => false);

  expect(
    authVisible,
    hasExternalStorageState()
      ? 'The app is showing the auth screen even though PLAYWRIGHT_STORAGE_STATE was provided.'
      : 'The app requires an authenticated session. Re-run with PLAYWRIGHT_STORAGE_STATE pointing to a valid state.json.'
  ).toBe(false);
}

test.describe('Fixed Runtime Import persistence', () => {
  test('importing a JSON recipe correctly displays and persists it across reloads', async ({ page }) => {
    // 1. Navigate to the fixed-runtime section
    await gotoApp(page, '/runtime-fijo');
    await assertAppSessionReady(page);
    await waitForAppReady(page);
    
    // Switch to create tab if necessary or open the Import UI directly
    // Using simple UI interactions based on what we saw in the codebase
    await page.getByRole('button', { name: 'Nueva receta', exact: true }).click();
    
    // Go to "Importar" JSON or paste directly
    // Look for a textarea where JSON can be pasted for preview or an upload button
    // This assumes the `isImportActive` behavior from `FixedRuntimeApp.tsx`
    await page.getByRole('button', { name: /importar/i }).first().click();

    await page.getByPlaceholder(/Pegar JSON aquí/i).fill(SAMPLE_IMPORT_RECIPE);
    await page.getByRole('button', { name: /Analizar/i }).click();
    await page.getByRole('button', { name: /Importar/i }).click();
    
    // Look for success message
    await expect(page.getByText(/Importación lista/i)).toBeVisible({ timeout: 10_000 });

    // Ensure it's in the library
    await page.getByRole('button', { name: /Librería/i }).click();
    await expect(page.getByText('Receta E2E Importada')).toBeVisible();

    // Reload the page
    await page.reload();
    await waitForAppReady(page);

    // After reload, should still be there (persisted in DB or local fallback properly)
    await gotoApp(page, '/runtime-fijo');
    await expect(page.getByText('Receta E2E Importada')).toBeVisible();
  });
});
