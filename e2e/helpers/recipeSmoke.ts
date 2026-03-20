import { expect, type Locator, type Page } from '@playwright/test';

import { getRecipeCatalogFlowMeta, type RecipeCatalogPrimaryCapability } from '../../src/app/lib/recipeCatalogFlowMeta';
import { expectHashPath, gotoApp, waitForAppReady } from './app';
import { hasExternalStorageState } from './auth';
import {
  globalRecipesAllPath,
  recipeCookingPath,
  recipeIngredientsPath,
  recipeSetupPath,
} from './routes';
import { authScreenLocator } from './selectors';

export type SmokeEntryPoint = 'all-recipes' | 'compound-lab';

export interface SmokeRecipeCase {
  recipeId: string;
  displayName: string;
  cardName: string | RegExp;
  capability: RecipeCatalogPrimaryCapability;
  entryPoint: SmokeEntryPoint;
  requiresPlanning?: boolean;
  requiresShopping?: boolean;
  requiresReload?: boolean;
  secondary?: boolean;
}

function defineSmokeRecipeCase(definition: SmokeRecipeCase): SmokeRecipeCase {
  const meta = getRecipeCatalogFlowMeta(definition.recipeId);
  if (meta.primaryCapability !== definition.capability) {
    throw new Error(
      `Smoke case ${definition.recipeId} expected capability ${definition.capability}, got ${meta.primaryCapability}.`,
    );
  }
  return definition;
}

export const canonicalSmokeRecipes = {
  containerBound: defineSmokeRecipeCase({
    recipeId: 'keke-platano-molde',
    displayName: 'Keke de plátano',
    cardName: 'Keke de plátano',
    capability: 'container_bound',
    entryPoint: 'all-recipes',
    requiresPlanning: true,
    requiresShopping: true,
  }),
  compoundPrimary: defineSmokeRecipeCase({
    recipeId: 'arroz-lentejas-compuesto',
    displayName: 'Arroz con lentejas',
    cardName: /Arroz con lentejas/i,
    capability: 'compound',
    entryPoint: 'compound-lab',
  }),
  standard: defineSmokeRecipeCase({
    recipeId: 'huevo-sancochado',
    displayName: 'Huevo sancochado',
    cardName: 'Huevo sancochado',
    capability: 'standard',
    entryPoint: 'all-recipes',
  }),
  baseIngredient: defineSmokeRecipeCase({
    recipeId: 'arroz',
    displayName: 'Arroz perfecto',
    cardName: /Arroz perfecto/i,
    capability: 'base_ingredient',
    entryPoint: 'all-recipes',
  }),
  cookingContext: defineSmokeRecipeCase({
    recipeId: 'papas-airfryer',
    displayName: 'Papas en airfryer',
    cardName: 'Papas en airfryer',
    capability: 'cooking_context',
    entryPoint: 'all-recipes',
  }),
  optionalIngredients: defineSmokeRecipeCase({
    recipeId: 'pan-palta-huevo',
    displayName: 'Pan con palta y huevo',
    cardName: 'Pan con palta y huevo',
    capability: 'optional_ingredients',
    entryPoint: 'all-recipes',
  }),
  compoundSecondary: defineSmokeRecipeCase({
    recipeId: 'tallarines-rojos-compuesto',
    displayName: 'Tallarines rojos coordinados',
    cardName: 'Tallarines rojos coordinados',
    capability: 'compound',
    entryPoint: 'all-recipes',
    requiresReload: true,
    secondary: true,
  }),
} as const;

export const releaseSmokeRecipes = [
  canonicalSmokeRecipes.containerBound,
  canonicalSmokeRecipes.compoundPrimary,
] as const;

export const capabilitySmokeRecipes = [
  canonicalSmokeRecipes.containerBound,
  canonicalSmokeRecipes.baseIngredient,
  canonicalSmokeRecipes.cookingContext,
  canonicalSmokeRecipes.optionalIngredients,
  canonicalSmokeRecipes.standard,
  canonicalSmokeRecipes.compoundSecondary,
] as const;

export async function assertAppSessionReady(page: Page): Promise<void> {
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

export function recipeCard(page: Page, recipeName: string | RegExp): Locator {
  return page.locator('article').filter({ has: page.getByRole('heading', { name: recipeName }) }).first();
}

export function compoundLabPath(): string {
  return '/experimentos/recetas-compuestas';
}

export function expectedReturnPathForEntry(entryPoint: SmokeEntryPoint): string {
  return entryPoint === 'compound-lab' ? compoundLabPath() : globalRecipesAllPath;
}

export async function openRecipeFromAllRecipes(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await gotoApp(page, globalRecipesAllPath);
  await assertAppSessionReady(page);
  await expectHashPath(page, globalRecipesAllPath);

  const card = recipeCard(page, recipe.cardName);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expectHashPath(page, recipeSetupPath(recipe.recipeId));
}

export async function openCompoundRecipeFromLab(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await gotoApp(page, compoundLabPath());
  await assertAppSessionReady(page);

  const card = recipeCard(page, recipe.cardName);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Abrir configuración', exact: true }).click();
  await expectHashPath(page, recipeSetupPath(recipe.recipeId));
}

export async function openRecipeEntryPoint(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  if (recipe.entryPoint === 'compound-lab') {
    await openCompoundRecipeFromLab(page, recipe);
    return;
  }

  await openRecipeFromAllRecipes(page, recipe);
}

export async function startCooking(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await page.getByRole('button', { name: 'Empezar receta', exact: true }).click();
  await expectHashPath(page, recipeCookingPath(recipe.recipeId));
}

export async function reopenSetupFromCooking(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await page.getByRole('button', { name: 'Ajustar', exact: true }).click();
  await expectHashPath(page, recipeSetupPath(recipe.recipeId));
}

export async function reopenIngredientsFromCooking(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await page.getByRole('button', { name: 'Ingredientes', exact: true }).click();
  await expectHashPath(page, recipeIngredientsPath(recipe.recipeId));
}

export async function closeRecipeAndExpectReturn(page: Page, expectedPath: string): Promise<void> {
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await waitForAppReady(page);
  await expectHashPath(page, expectedPath);
}

export async function reloadAndAssertRoute(page: Page, expectedPath: string): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await assertAppSessionReady(page);
  await expectHashPath(page, expectedPath);
}

export async function selectSetupButton(page: Page, name: string | RegExp): Promise<void> {
  await page.getByRole('button', { name }).first().click();
}

export async function incrementSetupYield(page: Page): Promise<void> {
  await page.getByRole('button', { name: '+', exact: true }).first().click();
}

export async function openPlanningSheetFromAllRecipes(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await gotoApp(page, globalRecipesAllPath);
  await assertAppSessionReady(page);

  const card = recipeCard(page, recipe.cardName);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Planificar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Agregar al plan', exact: true })).toBeVisible();
}

export async function addRecipeToPlan(page: Page): Promise<void> {
  const submitButton = page.getByRole('button', { name: 'Agregar al plan', exact: true });
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  await expect(submitButton).toBeHidden({ timeout: 10_000 });
}

export async function expectWeeklyPlanningReady(page: Page): Promise<void> {
  await expect(page.getByText('Plan semanal', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Semana del/i })).toBeVisible();

  const schemaDriftText = page.getByText(/weekly_plan_items\.target_yield|target_yield does not exist/i).first();
  if (await schemaDriftText.isVisible({ timeout: 1_500 }).catch(() => false)) {
    throw new Error(
      'Production planning schema drift detected: weekly_plan_items.target_yield is missing. Apply migration 20260319_v18_target_yield_v2_contract.sql before treating this as a product smoke failure.',
    );
  }
}

export async function openRecipeFromWeeklyPlan(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await gotoApp(page, '/plan-semanal');
  await assertAppSessionReady(page);
  await expectWeeklyPlanningReady(page);
  const title = page.getByRole('heading', { name: recipe.displayName, exact: false }).last();
  await expect(title).toBeVisible();

  const plannedCard = title.locator('xpath=ancestor::div[contains(@class, "rounded-[1.5rem]")][1]');
  await expect(plannedCard).toBeVisible();

  const openButton = plannedCard.getByRole('button', { name: 'Abrir', exact: true });
  const hasOpenButton = await openButton.isVisible().catch(() => false);
  if (!hasOpenButton) {
    const unavailableBadge = plannedCard.getByText(/Receta no disponible/i).first();
    const isMarkedUnavailable = await unavailableBadge.isVisible().catch(() => false);
    throw new Error(
      isMarkedUnavailable
        ? `Weekly plan item "${recipe.displayName}" is visible but unresolvable in the current catalog.`
        : `Weekly plan item "${recipe.displayName}" is visible but missing the Abrir action.`,
    );
  }

  await openButton.click();
  await expectHashPath(page, recipeSetupPath(recipe.recipeId));
}

export async function openPlannedShoppingAndExpectRecipe(page: Page, recipe: SmokeRecipeCase): Promise<void> {
  await gotoApp(page, '/plan-semanal');
  await assertAppSessionReady(page);
  await expectWeeklyPlanningReady(page);

  await page.getByRole('button', { name: 'Abrir compras', exact: true }).click();
  await expectHashPath(page, '/compras');
  await expect(page.getByRole('heading', { name: 'Lista planeada', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Para: ${recipe.displayName}`, 'i'))).toBeVisible();
}
