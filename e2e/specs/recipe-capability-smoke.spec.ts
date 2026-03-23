import { expect, test } from '@playwright/test';

import {
  assertAppSessionReady,
  capabilitySmokeRecipes,
  closeRecipeAndExpectReturn,
  expectCookingStepAdvance,
  expectedReturnPathForEntry,
  incrementSetupYield,
  openRecipeEntryPoint,
  reloadAndAssertRoute,
  reopenIngredientsFromCooking,
  reopenSetupFromCooking,
  selectSetupButton,
  startCooking,
} from '../helpers/recipeSmoke';
import { currentHashPath, gotoApp, waitForAppReady } from '../helpers/app';
import { normalizeHashPath } from '../helpers/routes';
import { recipeIngredientsPath, recipeSetupPath } from '../helpers/routes';

test.describe('Recipe capability smoke', () => {
  test('container-bound recipe keeps its chosen mold through cook and reopen', async ({ page }) => {
    const recipe = capabilitySmokeRecipes[0];
    await openRecipeEntryPoint(page, recipe);

    await selectSetupButton(page, 'Molde grande');
    await startCooking(page, recipe);
    await reopenSetupFromCooking(page, recipe);
    await expect(page.getByRole('button', { name: 'Molde grande', exact: true })).toBeVisible();

    await closeRecipeAndExpectReturn(page, expectedReturnPathForEntry(recipe.entryPoint));
  });

  test('base ingredient recipe keeps yield changes when returning from cooking', async ({ page }) => {
    const recipe = capabilitySmokeRecipes[1];
    await openRecipeEntryPoint(page, recipe);

    await incrementSetupYield(page);
    await startCooking(page, recipe);
    await reopenSetupFromCooking(page, recipe);
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await closeRecipeAndExpectReturn(page, expectedReturnPathForEntry(recipe.entryPoint));
  });

  test('cooking context recipe keeps its setup-to-cook continuity without rebounding home', async ({ page }) => {
    const recipe = capabilitySmokeRecipes[2];
    await openRecipeEntryPoint(page, recipe);

    await startCooking(page, recipe);
    await reopenSetupFromCooking(page, recipe);
    await expect(page.getByText('Papas en airfryer', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await closeRecipeAndExpectReturn(page, expectedReturnPathForEntry(recipe.entryPoint));
  });

  test('optional ingredient recipe survives deselection through cooking and ingredients reopen', async ({ page }) => {
    const recipe = capabilitySmokeRecipes[3];
    await openRecipeEntryPoint(page, recipe);

    await selectSetupButton(page, /Sal/i);
    await startCooking(page, recipe);
    await reopenIngredientsFromCooking(page, recipe);
    await expect(page.getByRole('button', { name: /Sal/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await closeRecipeAndExpectReturn(page, expectedReturnPathForEntry(recipe.entryPoint));
  });

  test('standard journey recipe completes a clean setup to cook to close loop', async ({ page }) => {
    const recipe = capabilitySmokeRecipes[4];
    await openRecipeEntryPoint(page, recipe);

    await startCooking(page, recipe);
    await reopenSetupFromCooking(page, recipe);
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await closeRecipeAndExpectReturn(page, expectedReturnPathForEntry(recipe.entryPoint));
  });

  test('standard recipe advances beyond the first cooking screen instead of staying stuck on step one', async ({ page }) => {
    const recipe = capabilitySmokeRecipes[4];
    await openRecipeEntryPoint(page, recipe);

    await startCooking(page, recipe);
    await expectCookingStepAdvance(page, {
      recipe,
      beforeLabel: 'SUBPASO 1 DE 5',
      afterLabel: 'SUBPASO 2 DE 5',
      beforeTitle: 'Coloca agua suficiente para cubrir los huevos.',
      afterTitle: 'Hierve el agua antes de ingresar los huevos.',
    });

    await closeRecipeAndExpectReturn(page, expectedReturnPathForEntry(recipe.entryPoint));
  });

  test('secondary compound recipe keeps cooking route stable after reload', async ({ page }) => {
    const recipe = capabilitySmokeRecipes[5];
    await openRecipeEntryPoint(page, recipe);

    await startCooking(page, recipe);
    await reloadAndAssertRoute(page, `/recetas/${recipe.recipeId}/cocinar`);
    await expect(page.getByText(recipe.displayName, { exact: true })).toBeVisible();

    await page.goto(page.url().replace(/#.*$/, `#${recipeSetupPath(recipe.recipeId)}`));
    await assertAppSessionReady(page);
    await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await waitForAppReady(page);
    await expect
      .poll(async () => normalizeHashPath(await currentHashPath(page)))
      .toMatch(/^\/recetas-globales(\/|$)/);
  });

  test('manual deep links for setup and ingredients still mount their canonical capability recipes', async ({ page }) => {
    const cookingContextRecipe = capabilitySmokeRecipes[2];
    const optionalRecipe = capabilitySmokeRecipes[3];

    await gotoApp(page, recipeSetupPath(cookingContextRecipe.recipeId));
    await assertAppSessionReady(page);
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();

    await gotoApp(page, recipeIngredientsPath(optionalRecipe.recipeId));
    await assertAppSessionReady(page);
    await expect(page.getByText(optionalRecipe.displayName, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar receta', exact: true })).toBeVisible();
  });
});
