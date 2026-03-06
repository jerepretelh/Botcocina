import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CatalogViewMode, UserRecipeList } from '../../types';
import { trackProductEvent } from '../lib/productEvents';
import {
  addRecipeToList,
  createList,
  deleteList,
  ensureDefaultUserList,
  getListMembership,
  getLists,
  removeRecipeFromList,
  renameList,
} from '../lib/userListsRepository';

interface UseUserListsParams {
  userId: string | null;
}

export function useUserLists({ userId }: UseUserListsParams) {
  const [lists, setLists] = useState<UserRecipeList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [catalogViewMode, setCatalogViewMode] = useState<CatalogViewMode>('platform');
  const [listMembershipByRecipe, setListMembershipByRecipe] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const ensured = await ensureDefaultUserList(userId);
      const userLists = await getLists(userId);
      const membership = await getListMembership(userId);
      setLists(userLists);
      setListMembershipByRecipe(membership);

      setActiveListId((current) => {
        if (current && userLists.some((list) => list.id === current)) return current;
        return ensured?.id ?? userLists[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar listas');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCatalogViewModeTracked = useCallback(
    (mode: CatalogViewMode) => {
      setCatalogViewMode(mode);
      if (userId) void trackProductEvent(userId, 'catalog_view_mode_changed', { mode });
    },
    [userId],
  );

  const createUserList = useCallback(
    async (name: string) => {
      if (!userId) return;
      await createList(userId, name);
      if (userId) void trackProductEvent(userId, 'list_create', { name });
      await refresh();
    },
    [refresh, userId],
  );

  const renameUserList = useCallback(
    async (listId: string, name: string) => {
      await renameList(listId, name);
      await refresh();
    },
    [refresh],
  );

  const deleteUserList = useCallback(
    async (listId: string) => {
      await deleteList(listId);
      await refresh();
    },
    [refresh],
  );

  const toggleRecipeInActiveList = useCallback(
    async (recipeId: string) => {
      if (!activeListId) return;
      const alreadyIn = (listMembershipByRecipe[recipeId] ?? []).includes(activeListId);
      if (alreadyIn) {
        await removeRecipeFromList(activeListId, recipeId);
        if (userId) void trackProductEvent(userId, 'list_recipe_remove', { recipeId, listId: activeListId });
      } else {
        await addRecipeToList(activeListId, recipeId);
        if (userId) void trackProductEvent(userId, 'list_recipe_add', { recipeId, listId: activeListId });
      }
      await refresh();
    },
    [activeListId, listMembershipByRecipe, refresh, userId],
  );

  const addRecipeToDefaultList = useCallback(
    async (recipeId: string) => {
      if (!userId) return;
      const defaultList = lists.find((list) => list.isDefault) ?? null;
      const ensuredDefault = defaultList ?? (await ensureDefaultUserList(userId));
      if (!ensuredDefault) return;
      await addRecipeToList(ensuredDefault.id, recipeId);
      if (userId) void trackProductEvent(userId, 'list_recipe_add', { recipeId, listId: ensuredDefault.id, auto: true });
      await refresh();
    },
    [lists, refresh, userId],
  );

  const activeList = useMemo(() => lists.find((list) => list.id === activeListId) ?? null, [lists, activeListId]);
  const activeListRecipeIds = useMemo(() => {
    if (!activeListId) return new Set<string>();
    const ids = Object.entries(listMembershipByRecipe)
      .filter(([, listIds]) => listIds.includes(activeListId))
      .map(([recipeId]) => recipeId);
    return new Set(ids);
  }, [listMembershipByRecipe, activeListId]);

  return {
    lists,
    activeListId,
    setActiveListId,
    activeList,
    catalogViewMode,
    setCatalogViewMode: setCatalogViewModeTracked,
    listMembershipByRecipe,
    activeListRecipeIds,
    isLoading,
    error,
    refresh,
    createUserList,
    renameUserList,
    deleteUserList,
    toggleRecipeInActiveList,
    addRecipeToDefaultList,
  };
}

