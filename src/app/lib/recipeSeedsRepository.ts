import type { RecipeCategoryId, RecipeSeed } from '../../types';
import { defaultRecipeSeeds } from '../data/recipeSeeds';
import { isSupabaseEnabled, supabaseClient } from './supabaseClient';
import { getCompatibleCategoryIds } from './recipeCategoryMapping';
import { canUseRecipeSeeds, disableRecipeSeedsForSession } from './supabaseOptionalFeatures';

type DbRecipeSeed = {
  id: string;
  name: string;
  category_id: RecipeCategoryId;
  search_terms: string[] | null;
  short_description: string | null;
  locale: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

export interface RecipeSeedSearchPayload {
  source: 'supabase' | 'local-dev';
  warning?: string;
  seeds: RecipeSeed[];
}

const DEFAULT_LIMIT = 24;

function isMissingTableError(error: { message?: string | null; code?: string | null; details?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === 'PGRST205' || message.includes('could not find the table') || message.includes('relation') && message.includes('does not exist');
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

function mapSeed(row: DbRecipeSeed): RecipeSeed {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    searchTerms: Array.isArray(row.search_terms) ? row.search_terms.filter((item): item is string => typeof item === 'string') : [],
    shortDescription: row.short_description,
    locale: row.locale ?? 'es-PE',
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
  };
}

function filterLocalSeeds(searchTerm: string, categoryId?: RecipeCategoryId | null, limit = DEFAULT_LIMIT): RecipeSeed[] {
  const normalized = normalizeTerm(searchTerm);
  const allSeeds = defaultRecipeSeeds.filter((seed) => seed.isActive);
  let seeds = allSeeds;
  const compatibleIds = categoryId ? getCompatibleCategoryIds(categoryId) : [];
  if (categoryId) {
    seeds = seeds.filter((seed) => compatibleIds.includes(seed.categoryId));
  }

  if (!normalized) {
    return seeds.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit);
  }

  const rankSeeds = (entries: RecipeSeed[]) => entries
    .map((seed) => {
      const haystack = [seed.name, ...(seed.searchTerms ?? []), seed.shortDescription ?? ''].join(' ').toLowerCase();
      if (!haystack.includes(normalized)) return null;
      const exact = seed.name.toLowerCase() === normalized ? 100 : 0;
      const prefix = seed.name.toLowerCase().startsWith(normalized) ? 50 : 0;
      const alias = seed.searchTerms.some((term) => term.toLowerCase().includes(normalized)) ? 20 : 0;
      const wordMatch = haystack.split(/\s+/).some((token) => token.startsWith(normalized)) ? 10 : 0;
      return {
        seed,
        score: exact + prefix + alias + wordMatch - seed.sortOrder / 100,
      };
    })
    .filter((entry): entry is { seed: RecipeSeed; score: number } => Boolean(entry))
    .sort((a, b) => b.score - a.score || a.seed.sortOrder - b.seed.sortOrder)
    .slice(0, limit)
    .map((entry) => entry.seed);

  const scored = rankSeeds(seeds);
  if (scored.length > 0 || !categoryId) return scored;

  return rankSeeds(allSeeds);
}

export async function searchRecipeSeeds(
  searchTerm: string,
  categoryId?: RecipeCategoryId | null,
  limit = DEFAULT_LIMIT,
): Promise<RecipeSeedSearchPayload> {
  if (!isSupabaseEnabled || !supabaseClient || !canUseRecipeSeeds()) {
    return {
      source: 'local-dev',
      warning: !isSupabaseEnabled || !supabaseClient ? 'Supabase no configurado. Usando catálogo local de ideas.' : undefined,
      seeds: filterLocalSeeds(searchTerm, categoryId, limit),
    };
  }

  try {
    let query = supabaseClient
      .from('recipe_seeds')
      .select('id,name,category_id,search_terms,short_description,locale,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (categoryId) {
      query = query.in('category_id', getCompatibleCategoryIds(categoryId));
    }

    const normalized = normalizeTerm(searchTerm);
    if (normalized) {
      const safeTerm = normalized.replace(/[%_,]/g, ' ').trim();
      query = query.or(`name.ilike.%${safeTerm}%,search_text.ilike.%${safeTerm}%,short_description.ilike.%${safeTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        disableRecipeSeedsForSession();
        return {
          source: 'local-dev',
          seeds: filterLocalSeeds(searchTerm, categoryId, limit),
        };
      }
      return {
        source: 'local-dev',
        warning: `No se pudo leer ideas de receta desde Supabase (${error.message}). Usando catálogo local.`,
        seeds: filterLocalSeeds(searchTerm, categoryId, limit),
      };
    }

    const seeds = ((data ?? []) as DbRecipeSeed[]).map(mapSeed);
    return {
      source: 'supabase',
      seeds,
    };
  } catch {
    return {
      source: 'local-dev',
      warning: 'No se pudo cargar el buscador desde Supabase. Usando catálogo local.',
      seeds: filterLocalSeeds(searchTerm, categoryId, limit),
    };
  }
}
