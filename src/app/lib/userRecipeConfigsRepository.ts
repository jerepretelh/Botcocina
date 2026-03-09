import type { SavedRecipeContextSummary, UserRecipeCookingConfig } from '../../types';
import { isSupabaseEnabled, supabaseClient } from './supabaseClient';

type DbUserRecipeCookingConfig = {
  user_id: string;
  recipe_id: string;
  quantity_mode: 'people' | 'have';
  people_count: number | null;
  amount_unit: 'units' | 'grams' | null;
  available_count: number | null;
  selected_optional_ingredients: unknown;
  source_context_summary: unknown;
  last_used_at: string;
  created_at: string;
  updated_at: string;
};

function ensureReady() {
  if (!isSupabaseEnabled || !supabaseClient) {
    throw new Error('Supabase no está disponible para guardar configuración de recetas.');
  }
  return supabaseClient;
}

function mapRow(row: DbUserRecipeCookingConfig): UserRecipeCookingConfig {
  return {
    userId: row.user_id,
    recipeId: row.recipe_id,
    quantityMode: row.quantity_mode,
    peopleCount: row.people_count,
    amountUnit: row.amount_unit,
    availableCount: row.available_count,
    selectedOptionalIngredients: Array.isArray(row.selected_optional_ingredients)
      ? row.selected_optional_ingredients.filter((item): item is string => typeof item === 'string')
      : [],
    sourceContextSummary:
      row.source_context_summary && typeof row.source_context_summary === 'object'
        ? (row.source_context_summary as SavedRecipeContextSummary)
        : null,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserRecipeCookingConfigs(userId: string): Promise<UserRecipeCookingConfig[]> {
  const client = ensureReady();
  const { data, error } = await client
    .from('user_recipe_cooking_configs')
    .select('user_id, recipe_id, quantity_mode, people_count, amount_unit, available_count, selected_optional_ingredients, source_context_summary, last_used_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'No se pudieron cargar las configuraciones de recetas.');
  }

  return ((data ?? []) as DbUserRecipeCookingConfig[]).map(mapRow);
}

export async function upsertUserRecipeCookingConfig(config: Omit<UserRecipeCookingConfig, 'createdAt' | 'updatedAt'>): Promise<UserRecipeCookingConfig> {
  const client = ensureReady();
  const payload = {
    user_id: config.userId,
    recipe_id: config.recipeId,
    quantity_mode: config.quantityMode,
    people_count: config.peopleCount,
    amount_unit: config.amountUnit,
    available_count: config.availableCount,
    selected_optional_ingredients: config.selectedOptionalIngredients,
    source_context_summary: config.sourceContextSummary,
    last_used_at: config.lastUsedAt,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('user_recipe_cooking_configs')
    .upsert(payload, { onConflict: 'user_id,recipe_id' })
    .select('user_id, recipe_id, quantity_mode, people_count, amount_unit, available_count, selected_optional_ingredients, source_context_summary, last_used_at, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo guardar la configuración de la receta.');
  }

  return mapRow(data as DbUserRecipeCookingConfig);
}
