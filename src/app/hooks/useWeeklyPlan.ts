import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Recipe,
  RecipeContent,
  ShoppingAggregationResult,
  ShoppingList,
  ShoppingListItem,
  UserRecipeCookingConfig,
  WeeklyPlan,
  WeeklyPlanItem,
  WeeklyPlanItemConfigSnapshot,
  WeeklyPlanSlot,
} from '../../types';
import {
  createManualShoppingListItem,
  createWeeklyPlan,
  deleteShoppingListItem,
  deleteWeeklyPlanItem,
  ensureWeeklyPlan,
  getOrCreateShoppingList,
  getShoppingListItems,
  getWeekStartDate,
  getWeeklyPlanItems,
  saveWeeklyPlanItem,
  updateShoppingListItem,
  replaceShoppingListItems,
  type WeeklyPlanItemInput,
} from '../lib/planRepository';
import { buildWeeklyShoppingAggregation } from '../lib/planShoppingAggregation';
import { mapCountToPortion } from '../utils/recipeHelpers';

interface UseWeeklyPlanParams {
  userId: string | null;
  recipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
  userRecipeConfigsByRecipeId: Record<string, UserRecipeCookingConfig>;
}

type SavePlanItemInput = {
  id?: string;
  recipe: Recipe;
  dayOfWeek: number | null;
  slot: WeeklyPlanSlot | null;
  notes?: string | null;
  configSnapshot: WeeklyPlanItemConfigSnapshot;
};

function buildDefaultSnapshot(
  recipe: Recipe,
  savedConfig?: UserRecipeCookingConfig | null,
): WeeklyPlanItemConfigSnapshot {
  const quantityMode = savedConfig?.quantityMode ?? 'people';
  const peopleCount = savedConfig?.peopleCount ?? 2;
  const amountUnit = savedConfig?.amountUnit ?? null;
  const availableCount = savedConfig?.availableCount ?? null;
  const resolvedPortion =
    quantityMode === 'have'
      ? mapCountToPortion(amountUnit === 'grams' ? Math.max(1, Math.round((availableCount ?? 500) / 250)) : Math.max(1, availableCount ?? 2))
      : mapCountToPortion(peopleCount);
  const scaleFactor =
    quantityMode === 'have'
      ? amountUnit === 'grams'
        ? Math.max(0.25, (availableCount ?? 500) / (resolvedPortion === 1 ? 250 : resolvedPortion === 2 ? 500 : 1000))
        : Math.max(0.25, (availableCount ?? resolvedPortion) / resolvedPortion)
      : Math.max(0.25, peopleCount / resolvedPortion);

  return {
    quantityMode,
    peopleCount,
    amountUnit,
    availableCount,
    selectedOptionalIngredients: savedConfig?.selectedOptionalIngredients ?? [],
    sourceContextSummary: savedConfig?.sourceContextSummary ?? {
      summaryLabel: `Planificada para ${peopleCount} persona${peopleCount === 1 ? '' : 's'}`,
    },
    resolvedPortion,
    scaleFactor,
  };
}

export function useWeeklyPlan({
  userId,
  recipes,
  recipeContentById,
  userRecipeConfigsByRecipeId,
}: UseWeeklyPlanParams) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [items, setItems] = useState<WeeklyPlanItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipesById = useMemo(
    () => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );

  const aggregation = useMemo<ShoppingAggregationResult>(
    () => buildWeeklyShoppingAggregation(items, recipeContentById, recipesById),
    [items, recipeContentById, recipesById],
  );
  const autoShoppingItems = useMemo(
    () => shoppingItems.filter((item) => item.sourceType === 'plan_auto'),
    [shoppingItems],
  );
  const manualShoppingItems = useMemo(
    () => shoppingItems.filter((item) => item.sourceType === 'manual'),
    [shoppingItems],
  );

  const syncShopping = useCallback(async (nextPlan: WeeklyPlan, nextItems: WeeklyPlanItem[]) => {
    if (!userId) return;
    const nextAggregation = buildWeeklyShoppingAggregation(nextItems, recipeContentById, recipesById);
    const ensuredShopping = await getOrCreateShoppingList(userId, nextPlan.id);
    await replaceShoppingListItems(
      ensuredShopping.id,
      nextAggregation.totalized.map((entry, index) => ({
        itemName: entry.itemName,
        quantityText: entry.quantityText,
        sourceRecipeId: entry.sourceRecipes.length === 1 ? entry.sourceRecipes[0].recipeId : null,
        sourcePlanItemId: entry.sourcePlanItemIds.length === 1 ? entry.sourcePlanItemIds[0] : null,
        sortOrder: index,
      })),
    );
    const refreshedItems = await getShoppingListItems(ensuredShopping.id);
    setShoppingList(ensuredShopping);
    setShoppingItems(refreshedItems);
  }, [recipeContentById, recipesById, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const nextPlan = await ensureWeeklyPlan(userId, getWeekStartDate());
      const nextItems = await getWeeklyPlanItems(nextPlan.id);
      const ensuredShopping = await getOrCreateShoppingList(userId, nextPlan.id);
      const nextShoppingItems = await getShoppingListItems(ensuredShopping.id);
      setPlan(nextPlan);
      setItems(nextItems);
      setShoppingList(ensuredShopping);
      setShoppingItems(nextShoppingItems);
      if (nextShoppingItems.length === 0 && nextItems.length > 0) {
        await syncShopping(nextPlan, nextItems);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el plan semanal.');
    } finally {
      setIsLoading(false);
    }
  }, [syncShopping, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveItem = useCallback(async (input: SavePlanItemInput) => {
    if (!plan) return null;
    const payload: WeeklyPlanItemInput = {
      id: input.id,
      dayOfWeek: input.dayOfWeek,
      slot: input.slot,
      recipeId: input.recipe.id,
      recipeNameSnapshot: input.recipe.name,
      notes: input.notes ?? null,
      sortOrder: input.dayOfWeek !== null && input.dayOfWeek !== undefined ? input.dayOfWeek * 10 : 0,
      configSnapshot: input.configSnapshot,
    };
    const saved = await saveWeeklyPlanItem(plan.id, payload);
    const nextItems = await getWeeklyPlanItems(plan.id);
    setItems(nextItems);
    await syncShopping(plan, nextItems);
    return saved;
  }, [plan, syncShopping]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!plan) return;
    await deleteWeeklyPlanItem(itemId);
    const nextItems = await getWeeklyPlanItems(plan.id);
    setItems(nextItems);
    await syncShopping(plan, nextItems);
  }, [plan, syncShopping]);

  const regenerateShopping = useCallback(async () => {
    if (!plan) return;
    await syncShopping(plan, items);
  }, [items, plan, syncShopping]);

  const createNextWeek = useCallback(async () => {
    if (!userId) return;
    const base = plan?.weekStartDate ? new Date(plan.weekStartDate) : new Date();
    base.setDate(base.getDate() + 7);
    const weekStartDate = base.toISOString().slice(0, 10);
    const nextPlan = await createWeeklyPlan(userId, weekStartDate);
    setPlan(nextPlan);
    setItems([]);
    const ensuredShopping = await getOrCreateShoppingList(userId, nextPlan.id);
    setShoppingList(ensuredShopping);
    setShoppingItems([]);
  }, [plan?.weekStartDate, userId]);

  const updateShoppingItemState = useCallback(async (
    itemId: string,
    input: Partial<Pick<ShoppingListItem, 'itemName' | 'quantityText' | 'isChecked'>>,
  ) => {
    await updateShoppingListItem(itemId, input);
    if (shoppingList) {
      setShoppingItems(await getShoppingListItems(shoppingList.id));
    }
  }, [shoppingList]);

  const addManualShoppingItem = useCallback(async (itemName: string, quantityText: string | null) => {
    if (!shoppingList) return null;
    const trimmedName = itemName.trim();
    if (!trimmedName) return null;
    await createManualShoppingListItem(shoppingList.id, {
      itemName: trimmedName,
      quantityText: quantityText?.trim() || null,
      sortOrder: shoppingItems.length,
    });
    setShoppingItems(await getShoppingListItems(shoppingList.id));
    return true;
  }, [shoppingItems.length, shoppingList]);

  const removeShoppingItem = useCallback(async (itemId: string) => {
    if (!shoppingList) return;
    await deleteShoppingListItem(itemId);
    setShoppingItems(await getShoppingListItems(shoppingList.id));
  }, [shoppingList]);

  const getDefaultPlanSnapshot = useCallback((recipe: Recipe) => {
    return buildDefaultSnapshot(recipe, userRecipeConfigsByRecipeId[recipe.id] ?? null);
  }, [userRecipeConfigsByRecipeId]);

  return {
    plan,
    items,
    shoppingList,
    shoppingItems,
    autoShoppingItems,
    manualShoppingItems,
    aggregation,
    isLoading,
    error,
    refresh,
    saveItem,
    removeItem,
    regenerateShopping,
    createNextWeek,
    updateShoppingItemState,
    addManualShoppingItem,
    removeShoppingItem,
    getDefaultPlanSnapshot,
  };
}
