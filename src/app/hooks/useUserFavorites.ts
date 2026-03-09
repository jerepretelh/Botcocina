import { useCallback, useEffect, useMemo, useState } from 'react';
import { addFavorite, getFavorites, removeFavorite } from '../lib/userFavoritesRepository';

interface UseUserFavoritesParams {
  userId: string | null;
}

export function useUserFavorites({ userId }: UseUserFavoritesParams) {
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setFavoriteRecipeIds(new Set());
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const favorites = await getFavorites(userId);
      setFavoriteRecipeIds(new Set(favorites.map((favorite) => favorite.recipeId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los favoritos');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      if (!userId) return;
      const isFavorite = favoriteRecipeIds.has(recipeId);
      if (isFavorite) {
        await removeFavorite(userId, recipeId);
      } else {
        await addFavorite(userId, recipeId);
      }
      await refresh();
    },
    [favoriteRecipeIds, refresh, userId],
  );

  const favoriteIdsArray = useMemo(() => [...favoriteRecipeIds], [favoriteRecipeIds]);

  return {
    favoriteRecipeIds,
    favoriteIdsArray,
    isLoading,
    error,
    refresh,
    toggleFavorite,
  };
}
