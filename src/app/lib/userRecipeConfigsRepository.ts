import type { SavedRecipeContextSummary, UserRecipeCookingConfig } from '../../types';
import type { CookingContextV2, RecipeYieldType, RecipeYieldV2 } from '../types/recipe-v2';
import { isSupabaseEnabled, supabaseClient } from './supabaseClient';
import { canUseUserRecipeConfigs, disableUserRecipeConfigsForSession } from './supabaseOptionalFeatures';
import { deriveTargetYieldFromLegacy } from './recipeV2';

const VALID_TARGET_YIELD_TYPES: Set<RecipeYieldType> = new Set([
  'servings',
  'units',
  'weight',
  'volume',
  'pan_size',
  'tray_size',
  'custom',
]);

type DbUserRecipeCookingConfig = {
  user_id: string;
  recipe_id: string;
  quantity_mode: 'people' | 'have';
  people_count: number | null;
  amount_unit: 'units' | 'grams' | null;
  available_count: number | null;
  target_yield?: unknown;
  selected_optional_ingredients: unknown;
  source_context_summary: unknown;
  last_used_at: string;
  created_at: string;
  updated_at: string;
};

function isMissingTableError(error: { message?: string | null; code?: string | null; details?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === 'PGRST205' || message.includes('could not find the table') || message.includes('relation') && message.includes('does not exist');
}

function isMissingTargetYieldColumn(error: { message?: string | null; code?: string | null; details?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === '42703' || (message.includes('column') && message.includes('target_yield'));
}

function getTargetYieldSchemaErrorMessage() {
  return 'Falta aplicar la migracion de target_yield para configuraciones V2.';
}

function coerceTargetYield(value: unknown, row: DbUserRecipeCookingConfig): RecipeYieldV2 | null {
  if (value && typeof value === 'object' && 'type' in (value as Record<string, unknown>)) {
    const candidate = value as Partial<RecipeYieldV2>;
    if (
      typeof candidate.type === 'string'
      && VALID_TARGET_YIELD_TYPES.has(candidate.type as RecipeYieldType)
      && typeof candidate.value === 'number'
      && Number.isFinite(candidate.value)
      && candidate.value > 0
    ) {
      return {
        type: candidate.type as RecipeYieldV2['type'],
        value: candidate.value,
        canonicalUnit: typeof candidate.canonicalUnit === 'string' ? candidate.canonicalUnit : null,
        visibleUnit: typeof candidate.visibleUnit === 'string' ? candidate.visibleUnit : null,
        unit: typeof candidate.unit === 'string' ? candidate.unit : null,
        label: typeof candidate.label === 'string' ? candidate.label : null,
        containerKey: typeof candidate.containerKey === 'string' ? candidate.containerKey : null,
        containerMeta: candidate.containerMeta && typeof candidate.containerMeta === 'object'
          ? candidate.containerMeta as RecipeYieldV2['containerMeta']
          : null,
      };
    }
  }
  return deriveTargetYieldFromLegacy({
    quantityMode: row.quantity_mode,
    peopleCount: row.people_count,
    amountUnit: row.amount_unit,
    availableCount: row.available_count,
  });
}

function coerceCookingContext(value: unknown): CookingContextV2 | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CookingContextV2>;
  return {
    selectedContainerKey: typeof candidate.selectedContainerKey === 'string' ? candidate.selectedContainerKey : null,
    selectedContainerMeta: candidate.selectedContainerMeta && typeof candidate.selectedContainerMeta === 'object'
      ? candidate.selectedContainerMeta
      : null,
  };
}

function ensureReady() {
  if (!isSupabaseEnabled || !supabaseClient) {
    throw new Error('Supabase no está disponible para guardar configuración de recetas.');
  }
  return supabaseClient;
}

function mapRow(row: DbUserRecipeCookingConfig): UserRecipeCookingConfig {
  const sourceContextSummary =
    row.source_context_summary && typeof row.source_context_summary === 'object'
      ? (row.source_context_summary as SavedRecipeContextSummary)
      : null;
  return {
    userId: row.user_id,
    recipeId: row.recipe_id,
    quantityMode: row.quantity_mode,
    peopleCount: row.people_count,
    amountUnit: row.amount_unit,
    availableCount: row.available_count,
    targetYield: coerceTargetYield(row.target_yield, row),
    cookingContext: coerceCookingContext(sourceContextSummary?.cookingContext ?? null),
    selectedOptionalIngredients: Array.isArray(row.selected_optional_ingredients)
      ? row.selected_optional_ingredients.filter((item): item is string => typeof item === 'string')
      : [],
    sourceContextSummary,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserRecipeCookingConfigs(userId: string): Promise<UserRecipeCookingConfig[]> {
  if (!canUseUserRecipeConfigs()) {
    return [];
  }
  const client = ensureReady();
  const { data, error } = await client
    .from('user_recipe_cooking_configs')
    .select('user_id, recipe_id, quantity_mode, people_count, amount_unit, available_count, target_yield, selected_optional_ingredients, source_context_summary, last_used_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      disableUserRecipeConfigsForSession();
      return [];
    }
    throw new Error(isMissingTargetYieldColumn(error) ? getTargetYieldSchemaErrorMessage() : error.message || 'No se pudieron cargar las configuraciones de recetas.');
  }

  return ((data ?? []) as DbUserRecipeCookingConfig[]).map(mapRow);
}

export async function upsertUserRecipeCookingConfig(config: Omit<UserRecipeCookingConfig, 'createdAt' | 'updatedAt'>): Promise<UserRecipeCookingConfig> {
  if (!canUseUserRecipeConfigs()) {
    const now = new Date().toISOString();
    return {
      ...config,
      createdAt: now,
      updatedAt: now,
    };
  }
  const client = ensureReady();
  const now = new Date().toISOString();
  const payload = {
    user_id: config.userId,
    recipe_id: config.recipeId,
    quantity_mode: config.quantityMode,
    people_count: config.peopleCount,
    amount_unit: config.amountUnit,
    available_count: config.availableCount,
    target_yield: config.targetYield ?? null,
    selected_optional_ingredients: config.selectedOptionalIngredients,
    source_context_summary: {
      ...(config.sourceContextSummary ?? {}),
      cookingContext: config.cookingContext ?? config.sourceContextSummary?.cookingContext ?? null,
    },
    last_used_at: config.lastUsedAt,
    updated_at: now,
  };

  const { data, error } = await client
    .from('user_recipe_cooking_configs')
    .upsert(payload, { onConflict: 'user_id,recipe_id' })
    .select('user_id, recipe_id, quantity_mode, people_count, amount_unit, available_count, target_yield, selected_optional_ingredients, source_context_summary, last_used_at, created_at, updated_at')
    .single();

  if (error || !data) {
    if (isMissingTableError(error)) {
      disableUserRecipeConfigsForSession();
      return {
        ...config,
        createdAt: now,
        updatedAt: now,
      };
    }
    throw new Error(isMissingTargetYieldColumn(error) ? getTargetYieldSchemaErrorMessage() : error?.message || 'No se pudo guardar la configuración de la receta.');
  }

  return mapRow(data as DbUserRecipeCookingConfig);
}

export const __testing = {
  mapRow,
};
