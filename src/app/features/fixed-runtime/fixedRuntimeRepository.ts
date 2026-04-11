import { isSupabaseEnabled, supabaseClient } from '../../lib/supabaseClient';
import { loadFixedRecipes, parseFixedRecipesJson } from './loader';
import type { FixedRecipeJson } from './types';

type FixedRecipeSource = 'seed' | 'import' | 'ai';
export type FixedRuntimeStorageMode = 'supabase' | 'local-fallback';

interface DbFixedRecipeRow {
  id: string;
  slug: string;
  scope_key: string;
  title: string;
  recipe_json: unknown;
  source: FixedRecipeSource;
  owner_user_id: string | null;
  is_active: boolean;
}

export interface FixedRuntimeCatalogPayload {
  baseRecipes: FixedRecipeJson[];
  importedRecipes: FixedRecipeJson[];
  storageMode: FixedRuntimeStorageMode;
}

// Removed `isMissingFixedRecipesTableError` as we no longer want silent fallbacks for missing tables.

function assertClient() {
  if (!isSupabaseEnabled || !supabaseClient) {
    throw new Error('Supabase no disponible para runtime fijo.');
  }
  return supabaseClient;
}

function normalizeSource(value: unknown): FixedRecipeSource {
  if (value === 'seed' || value === 'import' || value === 'ai') return value;
  return 'import';
}

function parseRowRecipe(row: DbFixedRecipeRow): FixedRecipeJson | null {
  try {
    const parsed = parseFixedRecipesJson([row.recipe_json])[0];
    if (!parsed) return null;
    return parsed;
  } catch {
    return null;
  }
}

function dedupeByRecipeId(input: FixedRecipeJson[]): FixedRecipeJson[] {
  const map = new Map<string, FixedRecipeJson>();
  input.forEach((recipe) => map.set(recipe.id, recipe));
  return Array.from(map.values());
}

export async function loadFixedRuntimeCatalog(userId: string | null): Promise<FixedRuntimeCatalogPayload> {
  if (!isSupabaseEnabled || !supabaseClient || !userId) {
    return {
      baseRecipes: await loadFixedRecipes(),
      importedRecipes: [],
      storageMode: 'local-fallback',
    };
  }

  const client = assertClient();
  const [globalRes, privateRes] = await Promise.all([
    client
      .from('fixed_recipes')
      .select('id,slug,scope_key,title,recipe_json,source,owner_user_id,is_active')
      .is('owner_user_id', null)
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
    client
      .from('fixed_recipes')
      .select('id,slug,scope_key,title,recipe_json,source,owner_user_id,is_active')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
  ]);

  if (globalRes.error || privateRes.error) {
    throw new Error(globalRes.error?.message || privateRes.error?.message || 'No se pudo cargar catálogo runtime.');
  }

  const globalRows = (globalRes.data ?? []) as DbFixedRecipeRow[];
  const privateRows = (privateRes.data ?? []) as DbFixedRecipeRow[];
  const globalRecipes: FixedRecipeJson[] = [];
  const privateRecipes: FixedRecipeJson[] = [];

  globalRows.forEach((row) => {
    const recipe = parseRowRecipe({ ...row, source: normalizeSource(row.source) });
    if (recipe) globalRecipes.push(recipe);
  });
  privateRows.forEach((row) => {
    const recipe = parseRowRecipe({ ...row, source: normalizeSource(row.source) });
    if (recipe) privateRecipes.push(recipe);
  });

  return {
    baseRecipes: dedupeByRecipeId(globalRecipes),
    importedRecipes: dedupeByRecipeId(privateRecipes),
    storageMode: 'supabase',
  };
}

export async function upsertUserFixedRecipe(input: {
  userId: string;
  recipe: FixedRecipeJson;
  source: FixedRecipeSource;
}): Promise<void> {
  const client = assertClient();
  const { error } = await client.from('fixed_recipes').upsert({
    slug: input.recipe.id,
    scope_key: `user:${input.userId}`,
    title: input.recipe.title,
    recipe_json: input.recipe,
    source: input.source,
    owner_user_id: input.userId,
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'slug,scope_key' });
  if (error) {
    throw new Error(error.message || 'No se pudo guardar receta runtime.');
  }
}

export async function upsertUserFixedRecipes(input: {
  userId: string;
  recipes: FixedRecipeJson[];
  source: FixedRecipeSource;
}): Promise<void> {
  if (input.recipes.length === 0) return;
  const client = assertClient();
  const payload = input.recipes.map((recipe) => ({
    slug: recipe.id,
    scope_key: `user:${input.userId}`,
    title: recipe.title,
    recipe_json: recipe,
    source: input.source,
    owner_user_id: input.userId,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await client.from('fixed_recipes').upsert(payload, { onConflict: 'slug,scope_key' });
  if (error) {
    throw new Error(error.message || 'No se pudo guardar recetas runtime.');
  }
}

export async function clearUserFixedRecipes(userId: string): Promise<void> {
  const client = assertClient();
  const { error } = await client
    .from('fixed_recipes')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('owner_user_id', userId)
    .in('source', ['import', 'ai']);
  if (error) {
    throw new Error(error.message || 'No se pudo limpiar recetas importadas runtime.');
  }
}
