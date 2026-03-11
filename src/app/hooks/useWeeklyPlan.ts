import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Recipe,
  RecipeContent,
  ShoppingAggregationResult,
  ShoppingList,
  ShoppingListItem,
  ShoppingTrip,
  ShoppingTripItem,
  ShoppingVarianceSummary,
  UserRecipeCookingConfig,
  WeeklyPlan,
  WeeklyPlanItem,
  WeeklyPlanItemConfigSnapshot,
  WeeklyPlanSlot,
} from '../../types';
import {
  createManualShoppingListItem,
  createShoppingTrip,
  createExtraShoppingTripItem,
  createWeeklyPlan,
  deleteShoppingListItem,
  deleteWeeklyPlanItem,
  ensureWeeklyPlan,
  getActiveShoppingTrip,
  getShoppingTripById,
  getOrCreateShoppingList,
  getShoppingListItems,
  getShoppingTripItems,
  getWeekStartDate,
  getWeeklyPlanItems,
  checkoutShoppingTrip,
  saveWeeklyPlanItem,
  updateShoppingTrip,
  updateShoppingTripItem,
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
  const [shoppingTrip, setShoppingTrip] = useState<ShoppingTrip | null>(null);
  const [shoppingTripItems, setShoppingTripItems] = useState<ShoppingTripItem[]>([]);
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
  const shoppingVariance = useMemo<ShoppingVarianceSummary>(() => {
    const plannedItems = shoppingTripItems.filter((item) => !item.isExtra);
    const pendingCount = plannedItems.filter((item) => item.status === 'pending').length;
    const skippedCount = plannedItems.filter((item) => item.status === 'skipped').length;
    const inCartItems = shoppingTripItems.filter((item) => item.status === 'in_cart');
    const changedCount = plannedItems.filter((item) => {
      if (item.status !== 'in_cart') return false;
      const plannedName = (item.plannedItemNameSnapshot ?? '').trim().toLowerCase();
      const actualName = item.actualItemName.trim().toLowerCase();
      const plannedQty = (item.plannedQuantityText ?? '').trim().toLowerCase();
      const actualQty = (item.actualQuantityText ?? '').trim().toLowerCase();
      return plannedName !== actualName || plannedQty !== actualQty;
    }).length;
    const runningTotal = shoppingTripItems.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0);

    return {
      plannedCount: plannedItems.length,
      pendingCount,
      inCartCount: inCartItems.length,
      changedCount,
      skippedCount,
      extraCount: shoppingTripItems.filter((item) => item.isExtra).length,
      runningTotal,
      finalTotal: shoppingTrip?.finalTotal ?? null,
    };
  }, [shoppingTrip?.finalTotal, shoppingTripItems]);

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

  const refreshTrip = useCallback(async (currentShoppingList: ShoppingList | null) => {
    if (!currentShoppingList) {
      setShoppingTrip(null);
      setShoppingTripItems([]);
      return;
    }
    const activeTrip = await getActiveShoppingTrip(currentShoppingList.id);
    setShoppingTrip(activeTrip);
    if (!activeTrip) {
      setShoppingTripItems([]);
      return;
    }
    setShoppingTripItems(await getShoppingTripItems(activeTrip.id));
  }, []);

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
      await refreshTrip(ensuredShopping);
      if (nextShoppingItems.length === 0 && nextItems.length > 0) {
        await syncShopping(nextPlan, nextItems);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el plan semanal.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshTrip, syncShopping, userId]);

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
    if (shoppingList) {
      setShoppingItems(await getShoppingListItems(shoppingList.id));
    }
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
    setShoppingTrip(null);
    setShoppingTripItems([]);
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

  const startShoppingTripFromList = useCallback(async () => {
    if (!userId || !shoppingList) return null;
    const trip = await createShoppingTrip(userId, shoppingList, shoppingItems);
    setShoppingTrip(trip);
    setShoppingTripItems(await getShoppingTripItems(trip.id));
    return trip;
  }, [shoppingItems, shoppingList, userId]);

  const refreshCurrentTrip = useCallback(async () => {
    if (!shoppingTrip) return;
    const refreshedTrip = await getShoppingTripById(shoppingTrip.id);
    setShoppingTrip(refreshedTrip);
    setShoppingTripItems(refreshedTrip ? await getShoppingTripItems(refreshedTrip.id) : []);
  }, [shoppingTrip]);

  const updateTripItemActuals = useCallback(async (
    itemId: string,
    input: Partial<Pick<ShoppingTripItem, 'actualItemName' | 'actualQuantityText' | 'lineTotal' | 'notes' | 'status' | 'isInCart'>>,
  ) => {
    await updateShoppingTripItem(itemId, {
      actualItemName: input.actualItemName,
      actualQuantityText: input.actualQuantityText,
      lineTotal: input.lineTotal,
      notes: input.notes,
      status: input.status,
      isInCart: input.isInCart,
    });
    await refreshCurrentTrip();
  }, [refreshCurrentTrip]);

  const toggleTripItemInCart = useCallback(async (itemId: string, nextInCart: boolean) => {
    await updateShoppingTripItem(itemId, {
      status: nextInCart ? 'in_cart' : 'pending',
      isInCart: nextInCart,
    });
    await refreshCurrentTrip();
  }, [refreshCurrentTrip]);

  const markTripItemSkipped = useCallback(async (itemId: string) => {
    await updateShoppingTripItem(itemId, {
      status: 'skipped',
      isInCart: false,
    });
    await refreshCurrentTrip();
  }, [refreshCurrentTrip]);

  const addExtraTripItem = useCallback(async (itemName: string, quantityText: string | null, lineTotal: number | null) => {
    if (!shoppingTrip) return null;
    const trimmedName = itemName.trim();
    if (!trimmedName) return null;
    await createExtraShoppingTripItem(shoppingTrip.id, {
      actualItemName: trimmedName,
      actualQuantityText: quantityText?.trim() || null,
      lineTotal,
      sortOrder: shoppingTripItems.length,
    });
    await refreshCurrentTrip();
    return true;
  }, [refreshCurrentTrip, shoppingTrip, shoppingTripItems.length]);

  const updateShoppingTripMeta = useCallback(async (input: Partial<Pick<ShoppingTrip, 'storeName' | 'estimatedTotal' | 'finalTotal'>>) => {
    if (!shoppingTrip) return;
    await updateShoppingTrip(shoppingTrip.id, input);
    await refreshCurrentTrip();
  }, [refreshCurrentTrip, shoppingTrip]);

  const checkoutTrip = useCallback(async (finalTotal: number | null, storeName: string | null) => {
    if (!shoppingTrip) return;
    await checkoutShoppingTrip(shoppingTrip.id, { finalTotal, storeName });
    await refreshCurrentTrip();
  }, [refreshCurrentTrip, shoppingTrip]);

  const getDefaultPlanSnapshot = useCallback((recipe: Recipe) => {
    return buildDefaultSnapshot(recipe, userRecipeConfigsByRecipeId[recipe.id] ?? null);
  }, [userRecipeConfigsByRecipeId]);

  return {
    plan,
    items,
    shoppingList,
    shoppingItems,
    shoppingTrip,
    shoppingTripItems,
    autoShoppingItems,
    manualShoppingItems,
    aggregation,
    shoppingVariance,
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
    startShoppingTripFromList,
    updateTripItemActuals,
    toggleTripItemInCart,
    markTripItemSkipped,
    addExtraTripItem,
    updateShoppingTripMeta,
    checkoutTrip,
    getDefaultPlanSnapshot,
  };
}
