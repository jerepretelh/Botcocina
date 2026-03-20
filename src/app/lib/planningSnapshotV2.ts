import type {
  Recipe,
  RecipeContent,
  UserRecipeCookingConfig,
  WeeklyPlanItem,
  WeeklyPlanItemConfigSnapshot,
} from '../../types';
import type { RecipeV2 } from '../types/recipe-v2';
import { getIngredientKey } from '../utils/recipeHelpers';
import { deriveLegacyPlanCompatFromTargetYield } from './planSnapshotCompat';
import { deriveTargetYieldFromLegacy } from './recipeV2';
import { resolvePersistedTargetYield } from './recipe-v2/resolvePersistedTargetYield';

type BuildPlanningSnapshotArgs = {
  recipe: Recipe;
  recipeContent?: RecipeContent | null;
  recipeV2?: RecipeV2 | null;
  snapshot?: WeeklyPlanItemConfigSnapshot | null;
  savedConfig?: UserRecipeCookingConfig | null;
};

type RuntimeHydrationArgs = {
  item: WeeklyPlanItem;
  recipe: Recipe;
  recipeContent?: RecipeContent | null;
  recipeV2?: RecipeV2 | null;
};

function normalizeOptionalIngredientsForV2(
  recipeV2: RecipeV2,
  selectedKeys: string[] | null | undefined,
): string[] {
  const optionalIngredients = recipeV2.ingredients.filter((ingredient) => !ingredient.indispensable);
  if (optionalIngredients.length === 0) return [];
  if (!selectedKeys || selectedKeys.length === 0) return [];

  const normalized = new Set(selectedKeys);
  return optionalIngredients
    .filter((ingredient) => normalized.has(ingredient.id) || normalized.has(getIngredientKey(ingredient.name)))
    .map((ingredient) => ingredient.id);
}

export function isPlannedOptionalIngredientSelected(
  selectedKeys: string[] | null | undefined,
  ingredientId: string,
  ingredientName: string,
): boolean {
  if (!selectedKeys || selectedKeys.length === 0) return true;
  const normalized = new Set(selectedKeys);
  return normalized.has(ingredientId) || normalized.has(getIngredientKey(ingredientName));
}

function buildLegacySnapshot({
  recipe,
  recipeContent,
  snapshot,
  savedConfig,
}: BuildPlanningSnapshotArgs): WeeklyPlanItemConfigSnapshot {
  const quantityMode = snapshot?.quantityMode ?? savedConfig?.quantityMode ?? 'people';
  const peopleCount = snapshot?.peopleCount ?? savedConfig?.peopleCount ?? 2;
  const amountUnit = snapshot?.amountUnit ?? savedConfig?.amountUnit ?? null;
  const availableCount = snapshot?.availableCount ?? savedConfig?.availableCount ?? null;
  const targetYield = snapshot?.targetYield
    ?? savedConfig?.targetYield
    ?? deriveTargetYieldFromLegacy({
      quantityMode,
      peopleCount,
      amountUnit,
      availableCount,
      recipe,
      content: recipeContent ?? null,
    });
  const compat = deriveLegacyPlanCompatFromTargetYield(targetYield, null);
  const selectedOptionalIngredients = snapshot?.selectedOptionalIngredients ?? savedConfig?.selectedOptionalIngredients ?? [];
  const cookingContext = snapshot?.cookingContext ?? savedConfig?.cookingContext ?? null;
  const sourceContextSummary = {
    ...(savedConfig?.sourceContextSummary ?? {}),
    ...(snapshot?.sourceContextSummary ?? {}),
    targetYield,
    cookingContext,
  };

  return {
    quantityMode: compat.quantityMode,
    peopleCount: quantityMode === 'people' ? peopleCount : compat.peopleCount,
    amountUnit: quantityMode === 'have' ? amountUnit : null,
    availableCount: quantityMode === 'have' ? availableCount : null,
    targetYield,
    cookingContext,
    selectedOptionalIngredients,
    sourceContextSummary,
    resolvedPortion: snapshot?.resolvedPortion ?? compat.resolvedPortion,
    scaleFactor: snapshot?.scaleFactor ?? compat.scaleFactor,
  };
}

export function resolvePlanningSnapshotV2(args: BuildPlanningSnapshotArgs): WeeklyPlanItemConfigSnapshot {
  const { recipe, recipeContent = null, recipeV2 = null, snapshot = null, savedConfig = null } = args;

  if (!recipeV2) {
    return buildLegacySnapshot({ recipe, recipeContent, recipeV2, snapshot, savedConfig });
  }

  const fallbackTargetYield = deriveTargetYieldFromLegacy({
    quantityMode: snapshot?.quantityMode ?? savedConfig?.quantityMode ?? 'people',
    peopleCount: snapshot?.peopleCount ?? savedConfig?.peopleCount ?? recipeV2.baseYield.value ?? recipe.basePortions ?? 2,
    amountUnit: snapshot?.amountUnit ?? savedConfig?.amountUnit ?? null,
    availableCount: snapshot?.availableCount ?? savedConfig?.availableCount ?? null,
    recipe,
    content: recipeContent,
  });
  const persistedTargetYield = snapshot?.targetYield
    ?? savedConfig?.targetYield
    ?? snapshot?.sourceContextSummary?.targetYield
    ?? savedConfig?.sourceContextSummary?.targetYield
    ?? null;
  const preferredTargetYield = persistedTargetYield?.type === recipeV2.baseYield.type
    ? persistedTargetYield
    : fallbackTargetYield.type === recipeV2.baseYield.type
      ? fallbackTargetYield
      : persistedTargetYield;
  const resolvedTargetYield = resolvePersistedTargetYield(
    recipeV2,
    preferredTargetYield ?? fallbackTargetYield,
  );
  const compat = deriveLegacyPlanCompatFromTargetYield(resolvedTargetYield, recipeV2);
  const selectedOptionalIngredients = normalizeOptionalIngredientsForV2(
    recipeV2,
    snapshot?.selectedOptionalIngredients ?? savedConfig?.selectedOptionalIngredients ?? [],
  );
  const cookingContext = snapshot?.cookingContext
    ?? savedConfig?.cookingContext
    ?? snapshot?.sourceContextSummary?.cookingContext
    ?? savedConfig?.sourceContextSummary?.cookingContext
    ?? recipeV2.cookingContextDefaults
    ?? null;
  const sourceContextSummary = {
    ...(savedConfig?.sourceContextSummary ?? {}),
    ...(snapshot?.sourceContextSummary ?? {}),
    targetYield: resolvedTargetYield,
    cookingContext,
  };

  return {
    quantityMode: compat.quantityMode,
    peopleCount: compat.peopleCount,
    amountUnit: compat.amountUnit,
    availableCount: compat.availableCount,
    targetYield: resolvedTargetYield,
    cookingContext,
    selectedOptionalIngredients,
    sourceContextSummary,
    resolvedPortion: compat.resolvedPortion,
    scaleFactor: compat.scaleFactor,
  };
}

export function hydrateWeeklyPlanItemForV2(args: BuildPlanningSnapshotArgs & { item: WeeklyPlanItem }): WeeklyPlanItem {
  const { item, ...rest } = args;
  return {
    ...item,
    configSnapshot: resolvePlanningSnapshotV2({
      ...rest,
      snapshot: item.configSnapshot,
    }),
  };
}

export function buildPlannedIngredientSelection({
  item,
  recipeContent = null,
  recipeV2 = null,
}: RuntimeHydrationArgs): Record<string, boolean> {
  if (recipeV2) {
    const selectedOptionalIngredients = new Set(
      normalizeOptionalIngredientsForV2(recipeV2, item.configSnapshot.selectedOptionalIngredients),
    );
    return Object.fromEntries(
      recipeV2.ingredients.map((ingredient) => {
        if (ingredient.indispensable) return [ingredient.id, true];
        if (selectedOptionalIngredients.size === 0) return [ingredient.id, true];
        return [ingredient.id, selectedOptionalIngredients.has(ingredient.id)];
      }),
    );
  }

  const ingredients = recipeContent?.ingredients ?? [];
  const selectedOptionalIngredients = new Set(item.configSnapshot.selectedOptionalIngredients);
  return Object.fromEntries(
    ingredients.map((ingredient) => {
      const key = getIngredientKey(ingredient.name);
      if (ingredient.indispensable) return [key, true];
      if (selectedOptionalIngredients.size === 0) return [key, true];
      return [key, selectedOptionalIngredients.has(key)];
    }),
  );
}

export function hydratePlannedItemForRuntime(args: RuntimeHydrationArgs) {
  const { item, recipe, recipeContent = null, recipeV2 = null } = args;
  const hydratedSnapshot = resolvePlanningSnapshotV2({
    recipe,
    recipeContent,
    recipeV2,
    snapshot: item.configSnapshot,
  });

  if (!hydratedSnapshot.targetYield) {
    throw new Error(`La receta planificada "${recipe.name}" no tiene targetYield V2 válido.`);
  }

  return {
    snapshot: hydratedSnapshot,
    ingredientSelection: buildPlannedIngredientSelection({
      item: {
        ...item,
        configSnapshot: hydratedSnapshot,
      },
      recipe,
      recipeContent,
      recipeV2,
    }),
  };
}
