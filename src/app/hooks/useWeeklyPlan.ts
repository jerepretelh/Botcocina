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
import { buildWeeklyShoppingAggregationV2 } from '../lib/planShoppingAggregationV2';
import { deriveTargetYieldFromLegacy } from '../lib/recipeV2';
import { deriveLegacyPlanCompatFromTargetYield } from '../lib/planSnapshotCompat';
import type { RecipeV2 } from '../types/recipe-v2';

interface UseWeeklyPlanParams {
  userId: string | null;
  recipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
  recipeV2ById: Record<string, RecipeV2>;
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

function dedupePlanItemsById(items: WeeklyPlanItem[]): WeeklyPlanItem[] {
  const byId = new Map<string, WeeklyPlanItem>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

function buildPlanItemEquivalenceKey(item: WeeklyPlanItem): string {
  return JSON.stringify({
    dayOfWeek: item.dayOfWeek ?? null,
    slot: item.slot ?? null,
    recipeId: item.recipeId ?? null,
    recipeNameSnapshot: item.recipeNameSnapshot,
    notes: item.notes?.trim() || null,
    targetYield: item.configSnapshot.targetYield ?? null,
    cookingContext: item.configSnapshot.cookingContext ?? null,
    selectedOptionalIngredients: [...item.configSnapshot.selectedOptionalIngredients].sort(),
    sourceContextSummary: item.configSnapshot.sourceContextSummary ?? null,
  });
}

function dedupePlanItemsByEquivalence(items: WeeklyPlanItem[]): { uniqueItems: WeeklyPlanItem[]; duplicateIds: string[] } {
  const byKey = new Map<string, WeeklyPlanItem>();
  const duplicateIds: string[] = [];

  for (const item of items) {
    const key = buildPlanItemEquivalenceKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    const existingCreatedAt = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
    const nextCreatedAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    if (nextCreatedAt < existingCreatedAt) {
      duplicateIds.push(existing.id);
      byKey.set(key, item);
    } else {
      duplicateIds.push(item.id);
    }
  }

  return {
    uniqueItems: [...byKey.values()],
    duplicateIds,
  };
}

function buildDefaultSnapshot(
  recipe: Recipe,
  recipeV2?: RecipeV2 | null,
  savedConfig?: UserRecipeCookingConfig | null,
): WeeklyPlanItemConfigSnapshot {
  const targetYield = savedConfig?.targetYield
    ?? recipeV2?.baseYield
    ?? deriveTargetYieldFromLegacy({
      quantityMode: savedConfig?.quantityMode ?? 'people',
      peopleCount: savedConfig?.peopleCount ?? 2,
      amountUnit: savedConfig?.amountUnit ?? null,
      availableCount: savedConfig?.availableCount ?? null,
    });
  const compat = deriveLegacyPlanCompatFromTargetYield(targetYield, recipeV2);

  return {
    quantityMode: compat.quantityMode,
    peopleCount: savedConfig?.peopleCount ?? compat.peopleCount,
    amountUnit: savedConfig?.amountUnit ?? compat.amountUnit,
    availableCount: savedConfig?.availableCount ?? compat.availableCount,
    targetYield,
    cookingContext: savedConfig?.cookingContext ?? recipeV2?.cookingContextDefaults ?? null,
    selectedOptionalIngredients: savedConfig?.selectedOptionalIngredients ?? [],
    sourceContextSummary: savedConfig?.sourceContextSummary ?? {
      summaryLabel: targetYield?.label ? `Planificada para ${targetYield.value ?? ''} ${targetYield.label}`.trim() : recipe.name,
      cookingContext: savedConfig?.cookingContext ?? recipeV2?.cookingContextDefaults ?? null,
    },
    resolvedPortion: compat.resolvedPortion,
    scaleFactor: compat.scaleFactor,
  };
}

export function useWeeklyPlan({
  userId,
  recipes,
  recipeContentById,
  recipeV2ById,
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
  const uniqueItems = useMemo(() => dedupePlanItemsById(items), [items]);

  const aggregation = useMemo<ShoppingAggregationResult>(
    () => buildWeeklyShoppingAggregationV2(uniqueItems, recipeV2ById, recipeContentById, recipesById),
    [uniqueItems, recipeV2ById, recipeContentById, recipesById],
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
    const nextAggregation = buildWeeklyShoppingAggregationV2(nextItems, recipeV2ById, recipeContentById, recipesById);
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
  }, [recipeContentById, recipeV2ById, recipesById, userId]);

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
      const rawItems = dedupePlanItemsById(await getWeeklyPlanItems(nextPlan.id));
      const { uniqueItems: nextItems, duplicateIds } = dedupePlanItemsByEquivalence(rawItems);
      if (duplicateIds.length > 0) {
        await Promise.all(duplicateIds.map((itemId) => deleteWeeklyPlanItem(itemId)));
      }
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
    const { uniqueItems: nextItems, duplicateIds } = dedupePlanItemsByEquivalence(dedupePlanItemsById(await getWeeklyPlanItems(plan.id)));
    if (duplicateIds.length > 0) {
      await Promise.all(duplicateIds.map((itemId) => deleteWeeklyPlanItem(itemId)));
    }
    setItems(nextItems);
    await syncShopping(plan, nextItems);
    return saved;
  }, [plan, syncShopping]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!plan) return;
    await deleteWeeklyPlanItem(itemId);
    const { uniqueItems: nextItems } = dedupePlanItemsByEquivalence(dedupePlanItemsById(await getWeeklyPlanItems(plan.id)));
    setItems(nextItems);
    await syncShopping(plan, nextItems);
  }, [plan, syncShopping]);

  const regenerateShopping = useCallback(async () => {
    if (!plan) return;
    await syncShopping(plan, uniqueItems);
    if (shoppingList) {
      setShoppingItems(await getShoppingListItems(shoppingList.id));
    }
  }, [plan, syncShopping, uniqueItems]);

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
    return buildDefaultSnapshot(recipe, recipeV2ById[recipe.id] ?? null, userRecipeConfigsByRecipeId[recipe.id] ?? null);
  }, [recipeV2ById, userRecipeConfigsByRecipeId]);

  return {
    plan,
    items: uniqueItems,
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
