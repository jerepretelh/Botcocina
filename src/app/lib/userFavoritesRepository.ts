import type { UserFavorite } from '../../types';
import { isSupabaseEnabled, supabaseClient } from './supabaseClient';

type DbUserFavorite = {
  user_id: string;
  recipe_id: string;
  created_at: string;
};

function mapFavorite(row: DbUserFavorite): UserFavorite {
  return {
    userId: row.user_id,
    recipeId: row.recipe_id,
    createdAt: row.created_at,
  };
}

export async function getFavorites(userId: string): Promise<UserFavorite[]> {
  if (!isSupabaseEnabled || !supabaseClient || !userId) return [];
  const result = await supabaseClient
    .from('user_favorites')
    .select('user_id,recipe_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (result.error) throw result.error;
  return ((result.data ?? []) as DbUserFavorite[]).map(mapFavorite);
}

export async function addFavorite(userId: string, recipeId: string): Promise<void> {
  if (!isSupabaseEnabled || !supabaseClient || !userId || !recipeId) return;
  const result = await supabaseClient
    .from('user_favorites')
    .upsert(
      {
        user_id: userId,
        recipe_id: recipeId,
      },
      { onConflict: 'user_id,recipe_id' },
    );
  if (result.error) throw result.error;
}

export async function removeFavorite(userId: string, recipeId: string): Promise<void> {
  if (!isSupabaseEnabled || !supabaseClient || !userId || !recipeId) return;
  const result = await supabaseClient
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeId);
  if (result.error) throw result.error;
}
