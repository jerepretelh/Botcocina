import type { UserListRecipe, UserRecipeList } from '../../types';
import { isSupabaseEnabled, supabaseClient } from './supabaseClient';

type DbUserRecipeList = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type DbUserListRecipe = {
  list_id: string;
  recipe_id: string;
  sort_order: number;
  created_at: string;
};

const DEFAULT_LIST_NAME = 'Mis recetas';
const DEFAULT_LIST_SLUG = 'mis-recetas';

function normalizeListName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  return cleaned.slice(0, 50) || DEFAULT_LIST_NAME;
}

function slugify(name: string): string {
  return normalizeListName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapList(row: DbUserRecipeList): UserRecipeList {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListRecipe(row: DbUserListRecipe): UserListRecipe {
  return {
    listId: row.list_id,
    recipeId: row.recipe_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function getLists(userId: string): Promise<UserRecipeList[]> {
  if (!isSupabaseEnabled || !supabaseClient || !userId) return [];
  const res = await supabaseClient
    .from('user_recipe_lists')
    .select('id,user_id,name,slug,is_default,created_at,updated_at')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (res.error) throw res.error;
  return ((res.data ?? []) as DbUserRecipeList[]).map(mapList);
}

export async function ensureDefaultUserList(userId: string): Promise<UserRecipeList | null> {
  if (!isSupabaseEnabled || !supabaseClient || !userId) return null;

  await supabaseClient
    .from('user_catalog_bootstrap')
    .upsert({ user_id: userId, bootstrapped_at: new Date().toISOString() }, { onConflict: 'user_id' });

  const existing = await supabaseClient
    .from('user_recipe_lists')
    .select('id,user_id,name,slug,is_default,created_at,updated_at')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) {
    return mapList(existing.data as DbUserRecipeList);
  }

  const created = await supabaseClient
    .from('user_recipe_lists')
    .insert({
      user_id: userId,
      name: DEFAULT_LIST_NAME,
      slug: DEFAULT_LIST_SLUG,
      is_default: true,
    })
    .select('id,user_id,name,slug,is_default,created_at,updated_at')
    .single();

  if (created.error) throw created.error;
  return mapList(created.data as DbUserRecipeList);
}

export async function createList(userId: string, name: string): Promise<UserRecipeList | null> {
  if (!isSupabaseEnabled || !supabaseClient || !userId) return null;
  const normalized = normalizeListName(name);
  const baseSlug = slugify(normalized) || 'lista';
  const suffix = Math.floor(Math.random() * 10000);
  const slug = `${baseSlug}-${suffix}`;

  const res = await supabaseClient
    .from('user_recipe_lists')
    .insert({
      user_id: userId,
      name: normalized,
      slug,
      is_default: false,
    })
    .select('id,user_id,name,slug,is_default,created_at,updated_at')
    .single();

  if (res.error) throw res.error;
  return mapList(res.data as DbUserRecipeList);
}

export async function renameList(listId: string, name: string): Promise<void> {
  if (!isSupabaseEnabled || !supabaseClient || !listId) return;
  const normalized = normalizeListName(name);
  const baseSlug = slugify(normalized) || 'lista';
  const suffix = Math.floor(Math.random() * 10000);
  const slug = `${baseSlug}-${suffix}`;
  const res = await supabaseClient
    .from('user_recipe_lists')
    .update({
      name: normalized,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId);
  if (res.error) throw res.error;
}

export async function deleteList(listId: string): Promise<void> {
  if (!isSupabaseEnabled || !supabaseClient || !listId) return;
  const res = await supabaseClient.from('user_recipe_lists').delete().eq('id', listId);
  if (res.error) throw res.error;
}

export async function getRecipesForList(listId: string): Promise<UserListRecipe[]> {
  if (!isSupabaseEnabled || !supabaseClient || !listId) return [];
  const res = await supabaseClient
    .from('user_list_recipes')
    .select('list_id,recipe_id,sort_order,created_at')
    .eq('list_id', listId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (res.error) throw res.error;
  return ((res.data ?? []) as DbUserListRecipe[]).map(mapListRecipe);
}

export async function getListMembership(userId: string): Promise<Record<string, string[]>> {
  if (!isSupabaseEnabled || !supabaseClient || !userId) return {};
  const listsRes = await supabaseClient
    .from('user_recipe_lists')
    .select('id,user_id')
    .eq('user_id', userId);
  if (listsRes.error) throw listsRes.error;
  const listIds = (listsRes.data ?? []).map((x) => x.id as string);
  if (listIds.length === 0) return {};

  const itemsRes = await supabaseClient
    .from('user_list_recipes')
    .select('list_id,recipe_id')
    .in('list_id', listIds);
  if (itemsRes.error) throw itemsRes.error;

  const map: Record<string, string[]> = {};
  for (const row of itemsRes.data ?? []) {
    const recipeId = row.recipe_id as string;
    const listId = row.list_id as string;
    if (!map[recipeId]) map[recipeId] = [];
    map[recipeId].push(listId);
  }
  return map;
}

export async function addRecipeToList(listId: string, recipeId: string): Promise<void> {
  if (!isSupabaseEnabled || !supabaseClient || !listId || !recipeId) return;

  const maxRes = await supabaseClient
    .from('user_list_recipes')
    .select('sort_order')
    .eq('list_id', listId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (maxRes.data?.sort_order ?? 0) + 1;

  const res = await supabaseClient
    .from('user_list_recipes')
    .upsert(
      {
        list_id: listId,
        recipe_id: recipeId,
        sort_order: nextSort,
      },
      { onConflict: 'list_id,recipe_id' },
    );
  if (res.error) throw res.error;
}

export async function removeRecipeFromList(listId: string, recipeId: string): Promise<void> {
  if (!isSupabaseEnabled || !supabaseClient || !listId || !recipeId) return;
  const res = await supabaseClient
    .from('user_list_recipes')
    .delete()
    .eq('list_id', listId)
    .eq('recipe_id', recipeId);
  if (res.error) throw res.error;
}

