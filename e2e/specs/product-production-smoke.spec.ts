import { expect, test } from '@playwright/test';

import { expectHashPath, gotoApp } from '../helpers/app';
import { isProductionLikePlaywrightTarget } from '../helpers/environment';
import { recipeSetupPath } from '../helpers/routes';
import {
  addRecipeToPlan,
  assertAppSessionReady,
  canonicalSmokeRecipes,
  closeRecipeAndExpectReturn,
  compoundLabPath,
  expectedReturnPathForEntry,
  openPlannedShoppingAndExpectRecipe,
  openRecipeEntryPoint,
  openRecipeFromWeeklyPlan,
  openPlanningSheetFromAllRecipes,
  reopenSetupFromCooking,
  startCooking,
} from '../helpers/recipeSmoke';

test.describe('Production authenticated smoke', () => {
  test.skip(!isProductionLikePlaywrightTarget(), 'This smoke is intended for a non-local authenticated deployment target.');

  test('covers standard journey, compound returnTo, and planning/shopping continuity', async ({ page }) => {
    await test.step('standard journey stays stable from Todas through close', async () => {
      const recipe = canonicalSmokeRecipes.containerBound;
      await openRecipeEntryPoint(page, recipe);
      await startCooking(page, recipe);
      await expect(page.getByRole('button', { name: 'Ajustar', exact: true })).toBeVisible();
      await reopenSetupFromCooking(page, recipe);
      await closeRecipeAndExpectReturn(page, expectedReturnPathForEntry(recipe.entryPoint));
    });

    await test.step('compound preserves returnTo from lab', async () => {
      const recipe = canonicalSmokeRecipes.compoundPrimary;
      await openRecipeEntryPoint(page, recipe);
      await startCooking(page, recipe);
      await gotoApp(page, recipeSetupPath(recipe.recipeId));
      await assertAppSessionReady(page);
      await expectHashPath(page, recipeSetupPath(recipe.recipeId));
      await closeRecipeAndExpectReturn(page, compoundLabPath());
    });

    await test.step('planning and shopping keep a V2 recipe operational', async () => {
      const recipe = canonicalSmokeRecipes.containerBound;
      await openPlanningSheetFromAllRecipes(page, recipe);
      await addRecipeToPlan(page);
      await openRecipeFromWeeklyPlan(page, recipe);
      await closeRecipeAndExpectReturn(page, '/plan-semanal');
      await openPlannedShoppingAndExpectRecipe(page, recipe);
    });
  });
});
