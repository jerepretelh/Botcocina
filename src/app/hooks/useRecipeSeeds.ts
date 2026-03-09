import { useEffect, useState } from 'react';
import type { RecipeCategoryId, RecipeSeed } from '../../types';
import { searchRecipeSeeds } from '../lib/recipeSeedsRepository';

interface UseRecipeSeedsParams {
  searchTerm: string;
  categoryId?: RecipeCategoryId | null;
  limit?: number;
}

export function useRecipeSeeds({ searchTerm, categoryId, limit }: UseRecipeSeedsParams) {
  const [seeds, setSeeds] = useState<RecipeSeed[]>([]);
  const [source, setSource] = useState<'supabase' | 'local-dev'>('local-dev');
  const [warning, setWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      const result = await searchRecipeSeeds(searchTerm, categoryId, limit);
      if (cancelled) return;
      setSeeds(result.seeds);
      setSource(result.source);
      setWarning(result.warning ?? null);
      setIsLoading(false);
    }, searchTerm.trim() ? 180 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchTerm, categoryId, limit]);

  return {
    seeds,
    source,
    warning,
    isLoading,
  };
}
