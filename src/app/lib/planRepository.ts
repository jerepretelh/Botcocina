import type {
  ShoppingList,
  ShoppingListItem,
  ShoppingListItemSourceType,
  WeeklyPlan,
  WeeklyPlanItem,
  WeeklyPlanItemConfigSnapshot,
  WeeklyPlanSlot,
} from '../../types';
import { isSupabaseEnabled, supabaseClient } from './supabaseClient';

type DbWeeklyPlan = {
  id: string;
  user_id: string;
  title: string;
  status: 'active' | 'archived';
  week_start_date: string;
  created_at: string;
  updated_at: string;
};

type DbWeeklyPlanItem = {
  id: string;
  weekly_plan_id: string;
  day_of_week: number | null;
  slot: WeeklyPlanSlot | null;
  recipe_id: string | null;
  recipe_name_snapshot: string | null;
  fixed_servings: number | null;
  quantity_mode: 'people' | 'have' | null;
  people_count: number | null;
  amount_unit: 'units' | 'grams' | null;
  available_count: number | null;
  selected_optional_ingredients: unknown;
  source_context_summary: unknown;
  resolved_portion: 1 | 2 | 4 | null;
  scale_factor: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

type DbShoppingList = {
  id: string;
  user_id: string;
  weekly_plan_id: string | null;
  title: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

type DbShoppingListItem = {
  id: string;
  shopping_list_id: string;
  item_name: string;
  quantity_text: string | null;
  is_checked: boolean;
  source_recipe_id: string | null;
  source_type: ShoppingListItemSourceType;
  source_plan_item_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export interface ShoppingListItemInput {
  itemName: string;
  quantityText: string | null;
  sourceRecipeId?: string | null;
  sourcePlanItemId?: string | null;
  sortOrder: number;
}

export interface WeeklyPlanItemInput {
  id?: string;
  dayOfWeek?: number | null;
  slot?: WeeklyPlanSlot | null;
  recipeId?: string | null;
  recipeNameSnapshot: string;
  notes?: string | null;
  sortOrder?: number;
  configSnapshot: WeeklyPlanItemConfigSnapshot;
}

function ensureReady() {
  if (!isSupabaseEnabled || !supabaseClient) {
    throw new Error('Supabase no está disponible para plan semanal.');
  }
  return supabaseClient;
}

function mapPlan(row: DbWeeklyPlan): WeeklyPlan {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status,
    weekStartDate: row.week_start_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlanItem(row: DbWeeklyPlanItem): WeeklyPlanItem {
  return {
    id: row.id,
    weeklyPlanId: row.weekly_plan_id,
    dayOfWeek: row.day_of_week,
    slot: row.slot,
    recipeId: row.recipe_id,
    recipeNameSnapshot: row.recipe_name_snapshot ?? 'Receta',
    notes: row.notes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    configSnapshot: {
      quantityMode: row.quantity_mode ?? 'people',
      peopleCount: row.people_count ?? row.fixed_servings ?? null,
      amountUnit: row.amount_unit,
      availableCount: row.available_count,
      selectedOptionalIngredients: Array.isArray(row.selected_optional_ingredients)
        ? row.selected_optional_ingredients.filter((item): item is string => typeof item === 'string')
        : [],
      sourceContextSummary:
        row.source_context_summary && typeof row.source_context_summary === 'object'
          ? row.source_context_summary as WeeklyPlanItemConfigSnapshot['sourceContextSummary']
          : null,
      resolvedPortion: row.resolved_portion ?? 2,
      scaleFactor: row.scale_factor ?? 1,
    },
  };
}

function mapShoppingList(row: DbShoppingList): ShoppingList {
  return {
    id: row.id,
    userId: row.user_id,
    weeklyPlanId: row.weekly_plan_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapShoppingListItem(row: DbShoppingListItem): ShoppingListItem {
  return {
    id: row.id,
    shoppingListId: row.shopping_list_id,
    itemName: row.item_name,
    quantityText: row.quantity_text,
    isChecked: row.is_checked,
    sourceRecipeId: row.source_recipe_id,
    sourceType: row.source_type,
    sourcePlanItemId: row.source_plan_item_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getWeekStartDate(date = new Date()): string {
  const copy = new Date(date);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export async function getActiveWeeklyPlan(userId: string): Promise<WeeklyPlan | null> {
  const client = ensureReady();
  const { data, error } = await client
    .from('weekly_plans')
    .select('id,user_id,title,status,week_start_date,created_at,updated_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(error.message || 'No se pudo cargar el plan semanal activo.');
  return data ? mapPlan(data as DbWeeklyPlan) : null;
}

export async function createWeeklyPlan(userId: string, weekStartDate: string, title?: string): Promise<WeeklyPlan> {
  const client = ensureReady();
  await client
    .from('weekly_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  const { data, error } = await client
    .from('weekly_plans')
    .insert({
      user_id: userId,
      title: title ?? `Semana del ${weekStartDate}`,
      status: 'active',
      week_start_date: weekStartDate,
    })
    .select('id,user_id,title,status,week_start_date,created_at,updated_at')
    .single();

  if (error || !data) throw new Error(error?.message || 'No se pudo crear el plan semanal.');
  return mapPlan(data as DbWeeklyPlan);
}

export async function ensureWeeklyPlan(userId: string, weekStartDate = getWeekStartDate()): Promise<WeeklyPlan> {
  const active = await getActiveWeeklyPlan(userId);
  if (active) return active;
  return createWeeklyPlan(userId, weekStartDate);
}

export async function getWeeklyPlanItems(weeklyPlanId: string): Promise<WeeklyPlanItem[]> {
  const client = ensureReady();
  const { data, error } = await client
    .from('weekly_plan_items')
    .select('id,weekly_plan_id,day_of_week,slot,recipe_id,recipe_name_snapshot,fixed_servings,quantity_mode,people_count,amount_unit,available_count,selected_optional_ingredients,source_context_summary,resolved_portion,scale_factor,notes,sort_order,created_at')
    .eq('weekly_plan_id', weeklyPlanId)
    .order('day_of_week', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message || 'No se pudieron cargar los items del plan semanal.');
  return ((data ?? []) as DbWeeklyPlanItem[]).map(mapPlanItem);
}

export async function saveWeeklyPlanItem(weeklyPlanId: string, input: WeeklyPlanItemInput): Promise<WeeklyPlanItem> {
  const client = ensureReady();
  const payload = {
    id: input.id,
    weekly_plan_id: weeklyPlanId,
    day_of_week: input.dayOfWeek ?? null,
    slot: input.slot ?? null,
    recipe_id: input.recipeId ?? null,
    recipe_name_snapshot: input.recipeNameSnapshot,
    fixed_servings: input.configSnapshot.peopleCount,
    quantity_mode: input.configSnapshot.quantityMode,
    people_count: input.configSnapshot.peopleCount,
    amount_unit: input.configSnapshot.amountUnit,
    available_count: input.configSnapshot.availableCount,
    selected_optional_ingredients: input.configSnapshot.selectedOptionalIngredients,
    source_context_summary: input.configSnapshot.sourceContextSummary,
    resolved_portion: input.configSnapshot.resolvedPortion,
    scale_factor: input.configSnapshot.scaleFactor,
    notes: input.notes ?? null,
    sort_order: input.sortOrder ?? 0,
  };

  const { data, error } = await client
    .from('weekly_plan_items')
    .upsert(payload)
    .select('id,weekly_plan_id,day_of_week,slot,recipe_id,recipe_name_snapshot,fixed_servings,quantity_mode,people_count,amount_unit,available_count,selected_optional_ingredients,source_context_summary,resolved_portion,scale_factor,notes,sort_order,created_at')
    .single();

  if (error || !data) throw new Error(error?.message || 'No se pudo guardar el item del plan semanal.');
  return mapPlanItem(data as DbWeeklyPlanItem);
}

export async function deleteWeeklyPlanItem(itemId: string): Promise<void> {
  const client = ensureReady();
  const { error } = await client.from('weekly_plan_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message || 'No se pudo eliminar el item del plan semanal.');
}

export async function getOrCreateShoppingList(userId: string, weeklyPlanId: string): Promise<ShoppingList> {
  const client = ensureReady();
  const { data: existing, error: existingError } = await client
    .from('shopping_lists')
    .select('id,user_id,weekly_plan_id,title,status,created_at,updated_at')
    .eq('user_id', userId)
    .eq('weekly_plan_id', weeklyPlanId)
    .eq('status', 'active')
    .maybeSingle();

  if (existingError) throw new Error(existingError.message || 'No se pudo cargar la lista de compras.');
  if (existing) return mapShoppingList(existing as DbShoppingList);

  const { data, error } = await client
    .from('shopping_lists')
    .insert({
      user_id: userId,
      weekly_plan_id: weeklyPlanId,
      title: 'Lista de compras semanal',
      status: 'active',
    })
    .select('id,user_id,weekly_plan_id,title,status,created_at,updated_at')
    .single();

  if (error || !data) throw new Error(error?.message || 'No se pudo crear la lista de compras.');
  return mapShoppingList(data as DbShoppingList);
}

export async function getShoppingListItems(shoppingListId: string): Promise<ShoppingListItem[]> {
  const client = ensureReady();
  const { data, error } = await client
    .from('shopping_list_items')
    .select('id,shopping_list_id,item_name,quantity_text,is_checked,source_recipe_id,source_type,source_plan_item_id,sort_order,created_at,updated_at')
    .eq('shopping_list_id', shoppingListId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message || 'No se pudieron cargar los items de compras.');
  return ((data ?? []) as DbShoppingListItem[]).map(mapShoppingListItem);
}

export async function replaceShoppingListItems(
  shoppingListId: string,
  items: ShoppingListItemInput[],
): Promise<void> {
  const client = ensureReady();
  const { error: deleteError } = await client
    .from('shopping_list_items')
    .delete()
    .eq('shopping_list_id', shoppingListId)
    .eq('source_type', 'plan_auto');
  if (deleteError) throw new Error(deleteError.message || 'No se pudo reiniciar la lista de compras.');

  if (items.length === 0) return;

  const { error } = await client.from('shopping_list_items').insert(
    items.map((item) => ({
      shopping_list_id: shoppingListId,
      item_name: item.itemName,
      quantity_text: item.quantityText,
      source_recipe_id: item.sourceRecipeId ?? null,
      source_type: 'plan_auto',
      source_plan_item_id: item.sourcePlanItemId ?? null,
      sort_order: item.sortOrder,
    })),
  );
  if (error) throw new Error(error.message || 'No se pudo guardar la lista de compras.');
}

export async function createManualShoppingListItem(
  shoppingListId: string,
  input: Pick<ShoppingListItemInput, 'itemName' | 'quantityText' | 'sortOrder'>,
): Promise<ShoppingListItem> {
  const client = ensureReady();
  const { data, error } = await client
    .from('shopping_list_items')
    .insert({
      shopping_list_id: shoppingListId,
      item_name: input.itemName,
      quantity_text: input.quantityText,
      source_type: 'manual',
      sort_order: input.sortOrder,
    })
    .select('id,shopping_list_id,item_name,quantity_text,is_checked,source_recipe_id,source_type,source_plan_item_id,sort_order,created_at,updated_at')
    .single();

  if (error || !data) throw new Error(error?.message || 'No se pudo crear el item manual.');
  return mapShoppingListItem(data as DbShoppingListItem);
}

export async function updateShoppingListItem(
  itemId: string,
  input: Partial<Pick<ShoppingListItem, 'itemName' | 'quantityText' | 'isChecked'>>,
): Promise<void> {
  const client = ensureReady();
  const { error } = await client
    .from('shopping_list_items')
    .update({
      item_name: input.itemName,
      quantity_text: input.quantityText,
      is_checked: input.isChecked,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);
  if (error) throw new Error(error.message || 'No se pudo actualizar el item de compras.');
}

export async function deleteShoppingListItem(itemId: string): Promise<void> {
  const client = ensureReady();
  const { error } = await client.from('shopping_list_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message || 'No se pudo eliminar el item de compras.');
}
