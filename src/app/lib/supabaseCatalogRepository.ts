import type { Recipe, RecipeContent, RecipeStep, SubStep } from '../../types';
import { isSupabaseEnabled, supabaseClient } from './supabaseClient';
import type { CatalogRepository, RecipesCatalogPayload } from './catalogRepository';
import { loadLocalRecipeCatalog } from './localRecipeCatalog';
import { canUseCompoundRecipes, disableCompoundRecipesForSession } from './supabaseOptionalFeatures';
import { coercePersistedCompoundRecipe } from './compoundRecipeMeta';
import { hydrateAIRecipeExactCache } from './aiRecipeExactCache';
import { buildResolvedLegacyContentFromScaledRecipe, createRecipeYield, hydrateRecipeV2FromPersistence, scaleRecipeV2 } from './recipeV2';

type DbRecipe = {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  emoji: string | null;
  ingredient: string;
  description: string;
  equipment: string | null;
  tip: string | null;
  portion_label_singular: string | null;
  portion_label_plural: string | null;
  owner_user_id: string | null;
  visibility: 'public' | 'private' | null;
  experience?: 'standard' | 'compound' | null;
  compound_meta?: unknown;
  base_yield_type?: 'servings' | 'units' | 'weight' | 'volume' | 'pan_size' | 'tray_size' | 'custom' | null;
  base_yield_value?: number | null;
  base_yield_unit?: string | null;
  base_yield_label?: string | null;
  ingredients_json?: unknown;
  steps_json?: unknown;
  time_summary_json?: unknown;
  created_at: string | null;
  updated_at: string | null;
};

function isMissingCompoundColumnError(error: { message?: string | null; details?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === '42703' || message.includes('column') && (message.includes('experience') || message.includes('compound_meta'));
}

function isMissingRecipeV2ColumnError(error: { message?: string | null; details?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === '42703' || (message.includes('column') && (
    message.includes('base_yield_')
    || message.includes('ingredients_json')
    || message.includes('steps_json')
    || message.includes('time_summary_json')
  ));
}

type DbIngredient = {
  recipe_id: string;
  sort_order: number;
  name: string;
  emoji: string | null;
  indispensable: boolean;
  p1: string;
  p2: string;
  p4: string;
};

type DbSubstep = {
  recipe_id: string;
  substep_order: number;
  step_number: number | null;
  step_name: string | null;
  substep_name: string;
  notes: string | null;
  is_timer: boolean;
  p1: string;
  p2: string;
  p4: string;
  fire_level: 'low' | 'medium' | 'high' | null;
  equipment: string | null;
};

function toPortionValue(isTimer: boolean, value: string): string | number {
  if (!isTimer) return value || 'Continuar';
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 30;
}

function mapSubstepsToSteps(substeps: DbSubstep[]): RecipeStep[] {
  const grouped = new Map<number, { stepName: string; fireLevel: RecipeStep['fireLevel']; equipment?: RecipeStep['equipment']; subSteps: Array<{ order: number; subStep: SubStep }> }>();

  for (const item of substeps.sort((a, b) => a.substep_order - b.substep_order)) {
    const stepNumber = item.step_number ?? item.substep_order;
    const existing = grouped.get(stepNumber) ?? {
      stepName: item.step_name || item.substep_name,
      fireLevel: item.fire_level ?? 'medium',
      equipment: (item.equipment as RecipeStep['equipment']) || undefined,
      subSteps: [],
    };

    existing.subSteps.push({
      order: item.substep_order,
      subStep: {
        subStepName: item.substep_name,
        notes: item.notes ?? '',
        portions: {
          1: toPortionValue(item.is_timer, item.p1),
          2: toPortionValue(item.is_timer, item.p2),
          4: toPortionValue(item.is_timer, item.p4),
        },
        isTimer: item.is_timer,
      },
    });
    grouped.set(stepNumber, existing);
  }

  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stepNumber, value]) => ({
      stepNumber,
      stepName: value.stepName,
      fireLevel: value.fireLevel,
      equipment: value.equipment,
      subSteps: value.subSteps.sort((a, b) => a.order - b.order).map((x) => x.subStep),
    }));
}

function mergeLocalCompoundRecipes(args: {
  recipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
  localRecipes: Recipe[];
  localRecipeContentById: Record<string, RecipeContent>;
}) {
  const { recipes, recipeContentById, localRecipes, localRecipeContentById } = args;
  const mergedRecipes = [...recipes];
  const mergedRecipeContentById = { ...recipeContentById };
  const knownRecipeIds = new Set(recipes.map((recipe) => recipe.id));

  for (const localRecipe of localRecipes) {
    if (localRecipe.experience !== 'compound') continue;
    if (knownRecipeIds.has(localRecipe.id)) continue;

    mergedRecipes.push(localRecipe);
    if (localRecipeContentById[localRecipe.id]) {
      mergedRecipeContentById[localRecipe.id] = localRecipeContentById[localRecipe.id];
    }
  }

  return {
    recipes: mergedRecipes,
    recipeContentById: mergedRecipeContentById,
  };
}

export const supabaseCatalogRepository: CatalogRepository = {
  async fetchCatalog(): Promise<RecipesCatalogPayload> {
    const localCatalog = await loadLocalRecipeCatalog();

    if (!isSupabaseEnabled || !supabaseClient) {
      return {
        source: 'local-dev',
        warning: 'Supabase no configurado. Usando catálogo local.',
        recipes: localCatalog.defaultRecipes,
        recipeContentById: localCatalog.initialRecipeContent,
      };
    }

    try {
      const userRes = await supabaseClient.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      const recipesSelect = canUseCompoundRecipes()
        ? 'id, category_id, name, icon, emoji, ingredient, description, equipment, tip, portion_label_singular, portion_label_plural, owner_user_id, visibility, experience, compound_meta, base_yield_type, base_yield_value, base_yield_unit, base_yield_label, ingredients_json, steps_json, time_summary_json, created_at, updated_at'
        : 'id, category_id, name, icon, emoji, ingredient, description, equipment, tip, portion_label_singular, portion_label_plural, owner_user_id, visibility, base_yield_type, base_yield_value, base_yield_unit, base_yield_label, ingredients_json, steps_json, time_summary_json, created_at, updated_at';

      const [publicRecipesRes, privateRecipesRes] = await Promise.all([
        supabaseClient
          .from('recipes')
          .select(recipesSelect)
          .eq('is_published', true)
          .eq('visibility', 'public')
          .order('name', { ascending: true }),
        userId
          ? supabaseClient
              .from('recipes')
              .select(recipesSelect)
              .eq('owner_user_id', userId)
              .eq('visibility', 'private')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (publicRecipesRes.error || privateRecipesRes.error) {
        if (isMissingRecipeV2ColumnError(publicRecipesRes.error) || isMissingRecipeV2ColumnError(privateRecipesRes.error)) {
          const legacySelect = canUseCompoundRecipes()
            ? 'id, category_id, name, icon, emoji, ingredient, description, equipment, tip, portion_label_singular, portion_label_plural, owner_user_id, visibility, experience, compound_meta, created_at, updated_at'
            : 'id, category_id, name, icon, emoji, ingredient, description, equipment, tip, portion_label_singular, portion_label_plural, owner_user_id, visibility, created_at, updated_at';
          const [legacyPublicRecipesRes, legacyPrivateRecipesRes] = await Promise.all([
            supabaseClient
              .from('recipes')
              .select(legacySelect)
              .eq('is_published', true)
              .eq('visibility', 'public')
              .order('name', { ascending: true }),
            userId
              ? supabaseClient
                  .from('recipes')
                  .select(legacySelect)
                  .eq('owner_user_id', userId)
                  .eq('visibility', 'private')
                  .order('created_at', { ascending: false })
              : Promise.resolve({ data: [], error: null } as any),
          ]);
          if (!legacyPublicRecipesRes.error && !legacyPrivateRecipesRes.error) {
            publicRecipesRes.data = legacyPublicRecipesRes.data;
            privateRecipesRes.data = legacyPrivateRecipesRes.data as any;
            publicRecipesRes.error = null as any;
            privateRecipesRes.error = null as any;
          }
        }
        if (canUseCompoundRecipes() && (isMissingCompoundColumnError(publicRecipesRes.error) || isMissingCompoundColumnError(privateRecipesRes.error))) {
          disableCompoundRecipesForSession();
          return this.fetchCatalog();
        }
        const detail = publicRecipesRes.error?.message || privateRecipesRes.error?.message || 'Error de lectura';
        return {
          source: 'local-dev',
          warning: `No se pudo leer catálogo Supabase (${detail}). Usando catálogo local.`,
          recipes: localCatalog.defaultRecipes,
          recipeContentById: localCatalog.initialRecipeContent,
        };
      }

      const recipesRows = [...(publicRecipesRes.data ?? []), ...((privateRecipesRes.data ?? []) as any[])] as DbRecipe[];
      const recipeIds = recipesRows.map((row) => row.id);

      if (recipeIds.length === 0) {
        return {
          source: 'local-dev',
          warning: 'Supabase no tiene recetas publicadas. Usando catálogo local.',
          recipes: localCatalog.defaultRecipes,
          recipeContentById: localCatalog.initialRecipeContent,
        };
      }

      const [ingredientsRes, substepsRes] = await Promise.all([
        supabaseClient
          .from('recipe_ingredients')
          .select('recipe_id, sort_order, name, emoji, indispensable, p1, p2, p4')
          .in('recipe_id', recipeIds)
          .order('sort_order', { ascending: true }),
        supabaseClient
          .from('recipe_substeps')
          .select('recipe_id, substep_order, step_number, step_name, substep_name, notes, is_timer, p1, p2, p4, fire_level, equipment')
          .in('recipe_id', recipeIds)
          .order('substep_order', { ascending: true }),
      ]);

      if (ingredientsRes.error || substepsRes.error) {
        const detail = ingredientsRes.error?.message || substepsRes.error?.message || 'Error de lectura';
        return {
          source: 'local-dev',
          warning: `No se pudo leer detalle de recetas Supabase (${detail}). Usando catálogo local.`,
          recipes: localCatalog.defaultRecipes,
          recipeContentById: localCatalog.initialRecipeContent,
        };
      }

      const ingredientsRows = (ingredientsRes.data ?? []) as DbIngredient[];
      const substepsRows = (substepsRes.data ?? []) as DbSubstep[];

      const ingredientsByRecipe = new Map<string, DbIngredient[]>();
      for (const row of ingredientsRows) {
        const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
        list.push(row);
        ingredientsByRecipe.set(row.recipe_id, list);
      }

      const substepsByRecipe = new Map<string, DbSubstep[]>();
      for (const row of substepsRows) {
        const list = substepsByRecipe.get(row.recipe_id) ?? [];
        list.push(row);
        substepsByRecipe.set(row.recipe_id, list);
      }

      const recipes: Recipe[] = [];
      const recipeContentById: Record<string, RecipeContent> = {};

      for (const recipeRow of recipesRows) {
        const mappedSteps = mapSubstepsToSteps(substepsByRecipe.get(recipeRow.id) ?? []);
        if (mappedSteps.length === 0) continue;

        recipes.push({
          id: recipeRow.id,
          categoryId: recipeRow.category_id as Recipe['categoryId'],
          name: recipeRow.name,
          icon: recipeRow.icon || '🍽️',
          emoji: recipeRow.emoji || recipeRow.icon || '🍽️',
          ingredient: recipeRow.ingredient,
          description: recipeRow.description,
          equipment: (recipeRow.equipment as Recipe['equipment']) || undefined,
          experience: recipeRow.experience === 'compound' ? 'compound' : undefined,
          ownerUserId: recipeRow.owner_user_id,
          visibility: (recipeRow.visibility as Recipe['visibility']) || 'public',
          createdAt: recipeRow.created_at ?? undefined,
          updatedAt: recipeRow.updated_at ?? undefined,
        });

        const baseContent: RecipeContent = {
          ingredients: (ingredientsByRecipe.get(recipeRow.id) ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => ({
              name: item.name,
              emoji: item.emoji || '🍽️',
              indispensable: item.indispensable,
              portions: {
                1: item.p1 || 'Al gusto',
                2: item.p2 || item.p1 || 'Al gusto',
                4: item.p4 || item.p2 || item.p1 || 'Al gusto',
              },
            })),
          steps: mappedSteps,
          tip: recipeRow.tip || 'Ten todo listo antes de empezar.',
          portionLabels: {
            singular: recipeRow.portion_label_singular || 'porción',
            plural: recipeRow.portion_label_plural || 'porciones',
          },
        };

        const recipeForHydration = recipes[recipes.length - 1];
        const resolvedV2Content = (recipeRow.base_yield_type && Array.isArray(recipeRow.ingredients_json) && Array.isArray(recipeRow.steps_json))
          ? buildResolvedLegacyContentFromScaledRecipe(
              scaleRecipeV2(
                hydrateRecipeV2FromPersistence({
                  recipe: recipeForHydration,
                  content: baseContent,
                  payload: {
                    base_yield_type: recipeRow.base_yield_type,
                    base_yield_value: recipeRow.base_yield_value ?? null,
                    base_yield_unit: recipeRow.base_yield_unit ?? null,
                    base_yield_label: recipeRow.base_yield_label ?? null,
                    ingredients_json: recipeRow.ingredients_json as any,
                    steps_json: recipeRow.steps_json as any,
                    time_summary_json: recipeRow.time_summary_json as any,
                    experience: recipeRow.experience ?? null,
                    compound_meta: recipeRow.compound_meta as any,
                  },
                }),
                createRecipeYield({
                  type: recipeRow.base_yield_type,
                  value: recipeRow.base_yield_value ?? null,
                  unit: recipeRow.base_yield_unit ?? null,
                  label: recipeRow.base_yield_label ?? null,
                }),
              ),
            )
          : null;

        const persistedCompound = coercePersistedCompoundRecipe({
          experience: recipeRow.experience,
          compoundMeta: recipeRow.compound_meta,
          content: resolvedV2Content ?? baseContent,
        });

        const hydratedExact = hydrateAIRecipeExactCache(recipeForHydration, {
          ...(resolvedV2Content ?? baseContent),
          compoundMeta: persistedCompound.compoundMeta,
        });

        recipes[recipes.length - 1] = hydratedExact.recipe;
        recipeContentById[recipeRow.id] = hydratedExact.content;

        if (persistedCompound.experience === 'compound') {
          recipes[recipes.length - 1] = {
            ...recipes[recipes.length - 1],
            experience: 'compound',
          };
        } else if (recipeRow.experience === 'compound') {
          console.warn(`Receta ${recipeRow.id} llegó como compound sin metadata válida. Se abrirá en flujo estándar.`);
        }
      }

      if (recipes.length === 0) {
        return {
          source: 'local-dev',
          warning: 'Supabase devolvió recetas sin subpasos válidos. Usando catálogo local.',
          recipes: localCatalog.defaultRecipes,
          recipeContentById: localCatalog.initialRecipeContent,
        };
      }

      const mergedCatalog = mergeLocalCompoundRecipes({
        recipes,
        recipeContentById,
        localRecipes: localCatalog.defaultRecipes,
        localRecipeContentById: localCatalog.initialRecipeContent,
      });

      return {
        source: 'supabase',
        recipes: mergedCatalog.recipes,
        recipeContentById: mergedCatalog.recipeContentById,
      };
    } catch {
      return {
        source: 'local-dev',
        warning: 'No se pudo sincronizar recetas con Supabase. Usando catálogo local.',
        recipes: localCatalog.defaultRecipes,
        recipeContentById: localCatalog.initialRecipeContent,
      };
    }
  },
  async fetchCatalogForUser(): Promise<RecipesCatalogPayload> {
    return this.fetchCatalog();
  },
};
