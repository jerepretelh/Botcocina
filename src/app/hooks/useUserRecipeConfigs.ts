import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserRecipeCookingConfig } from '../../types';
import { getUserRecipeCookingConfigs, upsertUserRecipeCookingConfig } from '../lib/userRecipeConfigsRepository';

interface UseUserRecipeConfigsParams {
  userId: string | null;
}

export function useUserRecipeConfigs({ userId }: UseUserRecipeConfigsParams) {
  const [configsByRecipeId, setConfigsByRecipeId] = useState<Record<string, UserRecipeCookingConfig>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setConfigsByRecipeId({});
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const configs = await getUserRecipeCookingConfigs(userId);
      const next = configs.reduce<Record<string, UserRecipeCookingConfig>>((acc, item) => {
        acc[item.recipeId] = item;
        return acc;
      }, {});
      setConfigsByRecipeId(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las configuraciones de recetas');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveConfig = useCallback(
    async (config: Omit<UserRecipeCookingConfig, 'createdAt' | 'updatedAt'>) => {
      if (!userId) return null;
      const saved = await upsertUserRecipeCookingConfig(config);
      setConfigsByRecipeId((prev) => ({
        ...prev,
        [saved.recipeId]: saved,
      }));
      return saved;
    },
    [userId],
  );

  const configsArray = useMemo(() => Object.values(configsByRecipeId), [configsByRecipeId]);

  return {
    configsByRecipeId,
    configsArray,
    isLoading,
    error,
    refresh,
    saveConfig,
  };
}
