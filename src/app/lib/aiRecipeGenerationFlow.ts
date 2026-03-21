import type {
  AIRecipeContextDraft,
  Portion,
  Recipe,
  RecipeContent,
  RecipeSeed,
  SavedRecipeContextSummary,
} from '../../types';
import type { CanonicalRecipeV2 } from './recipe-v2/canonicalRecipeV2';
import type { RecipeYieldV2 } from '../types/recipe-v2';
import type { GeneratedRecipe } from './recipeAI';
import {
  buildInitialIngredientSelection,
  buildRecipeId,
  clampNumber,
  ensureRecipeShape,
  getIngredientKey,
  inferPortionFromPrompt,
  mapCountToPortion,
  normalizeText,
} from '../utils/recipeHelpers';
import { coercePersistedCompoundRecipe, resolveCompoundExperience } from './compoundRecipeMeta';
import { normalizeAIRecipeToV2 } from './recipe-v2/normalizeAIRecipeToV2';
import { buildRecipeV2PersistenceShape, deriveTargetYieldFromLegacy } from './recipeV2';

export type ClarifiedSizing = {
  quantityMode: 'people' | 'have';
  count: number;
  amountUnit?: 'units' | 'grams';
} | null;

export interface PreparedGeneratedAIRecipe {
  existingEquivalentRecipe: Recipe | undefined;
  recipeId: string;
  recipeName: string;
  recipe: Recipe;
  content: RecipeContent;
  recipeV2: CanonicalRecipeV2;
  nextIngredientSelection: Record<string, boolean>;
  initialConfig: {
    quantityMode: 'people' | 'have';
    peopleCount: number | null;
    amountUnit: 'units' | 'grams' | null;
    availableCount: number | null;
    targetYield: RecipeYieldV2;
    selectedOptionalIngredients: string[];
    sourceContextSummary: SavedRecipeContextSummary | null;
  };
  nextRuntime: {
    quantityMode: 'people' | 'have';
    amountUnit: 'units' | 'grams';
    availableCount: number;
    peopleCount: number;
    portion: Portion;
    timerScaleFactor: number;
    timingAdjustedLabel: string;
    isCompound: boolean;
  };
}

type PersistClient = {
  from: (table: string) => {
    insert: (payload: unknown) => any;
    update: (payload: unknown) => any;
    upsert: (payload: unknown, options?: unknown) => Promise<{ error: PersistError | null }> | { error: PersistError | null };
    delete: () => {
      eq: (column: string, value: unknown) => Promise<{ error?: PersistError | null }> | { error?: PersistError | null };
    };
  };
};

type PersistError = {
  message?: string | null;
  details?: string | null;
  code?: string | null;
};

export function buildRecipeEquivalenceSignature(
  recipe: Pick<Recipe, 'name' | 'ingredient'>,
  content: Pick<RecipeContent, 'ingredients' | 'steps' | 'baseServings'>,
): string {
  const ingredientSignature = content.ingredients
    .map((ingredient) => getIngredientKey(ingredient.name))
    .filter(Boolean)
    .sort()
    .join('|');
  const stepSignature = content.steps
    .map((step) => normalizeText(`${step.stepName} ${step.subSteps.map((subStep) => subStep.subStepName).join(' ')}`))
    .filter(Boolean)
    .join('|');

  return [normalizeText(recipe.name || ''), normalizeText(recipe.ingredient || ''), String(content.baseServings ?? ''), ingredientSignature, stepSignature].join('::');
}

export function buildContextSummary(context: AIRecipeContextDraft, options: {
  quantityMode: 'people' | 'have';
  peopleCount: number | null;
  amountUnit: 'units' | 'grams' | null;
  availableCount: number | null;
  targetYield?: RecipeYieldV2 | null;
  selectedSeed?: RecipeSeed | null;
}): SavedRecipeContextSummary | null {
  const availableIngredients = context.availableIngredients.map((item) => item.value.trim()).filter(Boolean);
  const avoidIngredients = context.avoidIngredients.map((item) => item.value.trim()).filter(Boolean);
  const prompt = context.prompt.trim();
  if (!prompt && !context.servings && availableIngredients.length === 0 && avoidIngredients.length === 0 && !options.selectedSeed) {
    return null;
  }

  const summaryLabel =
    options.quantityMode === 'have' && options.availableCount
      ? `Basada en ${options.availableCount}${options.amountUnit === 'grams' ? ' g' : ' unid.'}`
      : options.peopleCount
        ? `Creada para ${options.peopleCount} persona${options.peopleCount === 1 ? '' : 's'}`
        : null;

  return {
    prompt: prompt || null,
    servings: context.servings,
    quantityMode: options.quantityMode,
    amountUnit: options.amountUnit,
    availableCount: options.availableCount,
    targetYield: options.targetYield ?? null,
    availableIngredients,
    avoidIngredients,
    summaryLabel,
    seedId: options.selectedSeed?.id ?? null,
    seedName: options.selectedSeed?.name ?? null,
    seedCategoryId: options.selectedSeed?.categoryId ?? null,
  };
}

export function formatGenerationFailureMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : '';
  const generic = 'No se pudo completar la generación de la receta. La receta no se guardó. Puedes reintentar sin volver a responder todo.';

  if (!detail) {
    return generic;
  }

  if (
    detail.includes('respuesta inválida') ||
    detail.includes('receta incompleta') ||
    detail.includes('No se pudo interpretar') ||
    detail.includes('Google AI') ||
    detail.includes('OpenAI') ||
    detail.includes('No se pudo guardar')
  ) {
    return `${generic} Detalle: ${detail}`;
  }

  return generic;
}

export function assertGeneratedRecipePayload(
  generatedResult: unknown,
): { recipe: GeneratedRecipe; usage?: { totalTokens: number } | undefined; mock?: boolean } {
  if (!generatedResult || typeof generatedResult !== 'object' || !('recipe' in generatedResult)) {
    throw new Error('La IA devolvió una respuesta inválida.');
  }

  const recipe = (generatedResult as { recipe?: unknown }).recipe;
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('La IA devolvió una receta inválida.');
  }

  return generatedResult as { recipe: GeneratedRecipe; usage?: { totalTokens: number } | undefined; mock?: boolean };
}

export function isMissingCompoundColumnError(error: PersistError | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === '42703' || (message.includes('column') && (message.includes('experience') || message.includes('compound_meta')));
}

export function isMissingRecipeV2ColumnError(error: PersistError | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  if (message.includes('experience') || message.includes('compound_meta')) {
    return false;
  }
  return error.code === '42703' || (
    message.includes('column') && (
      message.includes('base_yield_')
      || message.includes('ingredients_json')
      || message.includes('steps_json')
      || message.includes('time_summary_json')
      || message.includes('target_yield')
    )
  );
}

export function prepareGeneratedAIRecipeArtifacts(args: {
  generatedRecipe: GeneratedRecipe;
  availableRecipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
  aiUserId?: string | null;
  contextDraft: AIRecipeContextDraft;
  selectedSeed: RecipeSeed | null;
  suggestedTitle: string | null;
  clarifiedSizing: ClarifiedSizing;
  clarifiedPeopleCount: number | null;
  canUseCompoundRecipes: boolean;
}): PreparedGeneratedAIRecipe {
  const generated = ensureRecipeShape(args.generatedRecipe);
  const inferredPortion = inferPortionFromPrompt(args.contextDraft.prompt);
  const contextualPeopleCount = args.contextDraft.servings ?? null;
  const resolvedPeopleCount = args.clarifiedPeopleCount || contextualPeopleCount || null;
  const generatedV2 = normalizeAIRecipeToV2({
    ...args.generatedRecipe,
    id: generated.id ?? undefined,
    name: generated.name,
    icon: generated.icon,
    ingredient: generated.ingredient,
    description: generated.description,
    tip: generated.tip,
    baseYield: args.generatedRecipe.baseYield ?? {
      type: 'servings',
      value: generated.baseServings ?? resolvedPeopleCount ?? inferredPortion ?? 2,
      unit: generated.portionLabels?.plural ?? 'porciones',
      label: generated.portionLabels?.plural ?? 'porciones',
    },
    ingredients: generated.ingredients,
    steps: generated.steps,
    timeSummary: args.generatedRecipe.timeSummary ?? null,
    experience: args.generatedRecipe.experience,
    compoundMeta: args.generatedRecipe.compoundMeta as RecipeContent['compoundMeta'],
  });

  if (generated.ingredients.length === 0 || generated.steps.length === 0) {
    throw new Error('La IA devolvió una receta incompleta. Intenta nuevamente.');
  }

  const baseContent: RecipeContent = {
    ingredients: generated.ingredients,
    steps: generated.steps,
    tip: generated.tip,
    baseServings: generated.baseServings ?? resolvedPeopleCount ?? inferredPortion ?? 2,
    aiComplexity: generated.complexity === 'complex' ? 'complex' : 'simple',
    portionLabels: {
      singular: generated.portionLabels?.singular || 'porción',
      plural: generated.portionLabels?.plural || 'porciones',
    },
  };
  const explicitCompoundExperience = args.canUseCompoundRecipes
    ? coercePersistedCompoundRecipe({
      experience: args.generatedRecipe.experience,
      compoundMeta: args.generatedRecipe.compoundMeta,
      content: baseContent,
    })
    : {};
  const forcedCompoundExperience = args.canUseCompoundRecipes
    && generatedV2.experience === 'compound'
    && generatedV2.compoundMeta
      ? {
        experience: 'compound' as const,
        compoundMeta: generatedV2.compoundMeta as RecipeContent['compoundMeta'],
      }
      : {};
  const compoundExperience = explicitCompoundExperience.experience === 'compound'
    ? explicitCompoundExperience
    : forcedCompoundExperience.experience === 'compound'
      ? forcedCompoundExperience
      : args.canUseCompoundRecipes
        ? resolveCompoundExperience(baseContent)
        : {};
  const content: RecipeContent = {
    ...baseContent,
    compoundMeta: compoundExperience.compoundMeta,
  };

  const recipeName = generated.name || args.suggestedTitle || 'Nueva receta';
  const recipeSignature = buildRecipeEquivalenceSignature(
    {
      name: recipeName,
      ingredient: generated.ingredient,
    },
    content,
  );
  const existingEquivalentRecipe = args.availableRecipes.find((recipe) => {
    if (recipe.ownerUserId !== (args.aiUserId ?? null) || (recipe.visibility ?? 'public') !== 'private') {
      return false;
    }
    const existingContent = args.recipeContentById[recipe.id];
    if (!existingContent) return false;
    return buildRecipeEquivalenceSignature(recipe, existingContent) === recipeSignature;
  });
  const recipeId =
    existingEquivalentRecipe?.id ??
    `${buildRecipeId(generated.id || recipeName)}-${args.aiUserId?.slice(0, 8) ?? 'anon'}-${Date.now()}`;

  const recipe: Recipe = {
    id: recipeId,
    categoryId: 'personalizadas',
    name: recipeName,
    icon: generated.icon,
    ingredient: generated.ingredient,
    description: generated.description,
    basePortions: generated.baseServings ?? resolvedPeopleCount ?? inferredPortion ?? 2,
    experience: compoundExperience.experience,
    ownerUserId: args.aiUserId ?? null,
    visibility: 'private',
    createdAt: existingEquivalentRecipe?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const recipeV2Base: CanonicalRecipeV2 = generatedV2.id === recipeId
    ? generatedV2
    : {
      ...generatedV2,
      id: recipeId,
    };
  const recipeV2: CanonicalRecipeV2 = {
    ...recipeV2Base,
    id: recipeId,
    experience: compoundExperience.experience ?? recipeV2Base.experience,
    compoundMeta: compoundExperience.compoundMeta ?? recipeV2Base.compoundMeta,
    sourceRecipe: recipe,
    sourceContent: content,
  };

  const quantityMode = args.clarifiedSizing?.quantityMode === 'have' ? 'have' as const : 'people' as const;
  const peopleCount = args.clarifiedSizing?.quantityMode === 'have'
    ? resolvedPeopleCount
    : (resolvedPeopleCount ?? generated.baseServings ?? inferredPortion ?? 2);
  const amountUnit = args.clarifiedSizing?.quantityMode === 'have'
    ? (args.clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units')
    : null;
  const availableCount = args.clarifiedSizing?.quantityMode === 'have' ? args.clarifiedSizing.count : null;
  const targetYield = deriveTargetYieldFromLegacy({
    quantityMode,
    peopleCount,
    amountUnit,
    availableCount,
    recipe,
    content,
  });

  const initialConfig = {
    quantityMode,
    peopleCount,
    amountUnit,
    availableCount,
    targetYield,
    selectedOptionalIngredients: content.ingredients
      .filter((ingredient) => !ingredient.indispensable)
      .map((ingredient) => ingredient.name.toLowerCase().replace(/\s+/g, '_')),
    sourceContextSummary: buildContextSummary(args.contextDraft, {
      quantityMode,
      peopleCount,
      amountUnit,
      availableCount,
      targetYield,
      selectedSeed: args.selectedSeed,
    }),
  };

  let nextQuantityMode: 'people' | 'have' = 'people';
  let nextAmountUnit: 'units' | 'grams' = 'units';
  let nextAvailableCount = 1;
  let nextPeopleCount = resolvedPeopleCount ?? generated.baseServings ?? inferredPortion ?? 2;
  let nextPortion: Portion = inferredPortion ?? mapCountToPortion(nextPeopleCount);
  let nextTimerScaleFactor = 1;
  let nextTimingAdjustedLabel = 'Tiempo estándar';

  if (args.clarifiedSizing?.quantityMode === 'have') {
    nextQuantityMode = 'have';
    nextAmountUnit = args.clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units';
    nextAvailableCount = args.clarifiedSizing.count;
    nextPortion = mapCountToPortion(args.clarifiedSizing.count);
  } else if (args.clarifiedPeopleCount) {
    nextPeopleCount = args.clarifiedPeopleCount;
    nextPortion = mapCountToPortion(args.clarifiedPeopleCount);
  } else if (contextualPeopleCount) {
    nextPeopleCount = contextualPeopleCount;
    nextPortion = mapCountToPortion(contextualPeopleCount);
  } else if (inferredPortion) {
    nextPeopleCount = inferredPortion;
    nextPortion = inferredPortion;
  }

  if (args.clarifiedSizing) {
    nextTimerScaleFactor = clampNumber(args.clarifiedSizing.count / 2, 0.8, 2);
    nextTimingAdjustedLabel =
      Math.abs(nextTimerScaleFactor - 1) < 0.01
        ? 'Tiempo estándar'
        : `Tiempo ajustado x${nextTimerScaleFactor.toFixed(2)}`;
  }

  return {
    existingEquivalentRecipe,
    recipeId,
    recipeName,
    recipe,
    content,
    recipeV2,
    nextIngredientSelection: buildInitialIngredientSelection(content.ingredients),
    initialConfig,
    nextRuntime: {
      quantityMode: nextQuantityMode,
      amountUnit: nextAmountUnit,
      availableCount: nextAvailableCount,
      peopleCount: nextPeopleCount,
      portion: nextPortion,
      timerScaleFactor: nextTimerScaleFactor,
      timingAdjustedLabel: nextTimingAdjustedLabel,
      isCompound: recipe.experience === 'compound' && Boolean(content.compoundMeta),
    },
  };
}

async function persistAiRecipeToSupabaseOnce(args: {
  recipe: Recipe;
  content: RecipeContent;
  prompt: string;
  source: 'real' | 'mock';
  initialConfig: PreparedGeneratedAIRecipe['initialConfig'];
  recipeV2: CanonicalRecipeV2;
  aiUserId?: string | null;
  isSupabaseEnabled: boolean;
  supabaseClient: PersistClient | null;
  canUseCompoundRecipes: boolean;
  canUseUserRecipeConfigs: boolean;
  disableUserRecipeConfigsForSession: () => void;
  addRecipeToDefaultList?: (recipeId: string) => Promise<void>;
  trackProductEvent?: (userId: string, eventName: string, payload: Record<string, unknown>) => Promise<void>;
}): Promise<void> {
  if (!args.isSupabaseEnabled || !args.supabaseClient || !args.aiUserId) return;
  const shouldLogGeneration = args.source !== 'mock';
  const createdRun = shouldLogGeneration
    ? await args.supabaseClient
      .from('ai_recipe_generations')
      .insert({
        user_id: args.aiUserId,
        prompt: args.prompt,
        mode: 'generate',
        status: 'created',
      })
      .select('id')
      .single()
    : { data: null };

  const generationId = createdRun.data?.id as string | undefined;

  const updateGeneration = async (status: 'approved' | 'failed', fields?: Record<string, unknown>) => {
    if (!generationId) return;
    await args.supabaseClient
      .from('ai_recipe_generations')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...fields,
      })
      .eq('id', generationId);
  };

  try {
    const recipePayload = {
      id: args.recipe.id,
      category_id: args.recipe.categoryId,
      name: args.recipe.name,
      icon: args.recipe.icon,
      emoji: args.recipe.emoji ?? args.recipe.icon,
      ingredient: args.recipe.ingredient,
      description: args.recipe.description,
      equipment: args.recipe.equipment ?? null,
      tip: args.content.tip,
      portion_label_singular: args.content.portionLabels.singular,
      portion_label_plural: args.content.portionLabels.plural,
      source: 'ai',
      owner_user_id: args.aiUserId,
      visibility: 'private',
      is_published: false,
      ...buildRecipeV2PersistenceShape(args.recipeV2),
      ...(args.canUseCompoundRecipes
        ? {
          experience: args.recipe.experience ?? 'standard',
          compound_meta: args.content.compoundMeta ?? null,
        }
        : {}),
      updated_at: new Date().toISOString(),
    };
    const recipeUpsert = await args.supabaseClient.from('recipes').upsert(
      recipePayload,
      { onConflict: 'id' },
    );
    if (recipeUpsert.error && isMissingRecipeV2ColumnError(recipeUpsert.error)) {
      const legacyRecipePayload = {
        id: args.recipe.id,
        category_id: args.recipe.categoryId,
        name: args.recipe.name,
        icon: args.recipe.icon,
        emoji: args.recipe.emoji ?? args.recipe.icon,
        ingredient: args.recipe.ingredient,
        description: args.recipe.description,
        equipment: args.recipe.equipment ?? null,
        tip: args.content.tip,
        portion_label_singular: args.content.portionLabels.singular,
        portion_label_plural: args.content.portionLabels.plural,
        source: 'ai',
        owner_user_id: args.aiUserId,
        visibility: 'private',
        is_published: false,
        ...(args.canUseCompoundRecipes
          ? {
            experience: args.recipe.experience ?? 'standard',
            compound_meta: args.content.compoundMeta ?? null,
          }
          : {}),
        updated_at: new Date().toISOString(),
      };
      const legacyRecipeUpsert = await args.supabaseClient.from('recipes').upsert(
        legacyRecipePayload,
        { onConflict: 'id' },
      );
      if (legacyRecipeUpsert.error) {
        throw legacyRecipeUpsert.error;
      }
    } else if (recipeUpsert.error) {
      throw recipeUpsert.error;
    }

    await args.supabaseClient.from('recipe_ingredients').delete().eq('recipe_id', args.recipe.id);
    await args.supabaseClient.from('recipe_substeps').delete().eq('recipe_id', args.recipe.id);

    const ingredientsPayload = args.content.ingredients.map((ingredient, index) => ({
      recipe_id: args.recipe.id,
      sort_order: index + 1,
      name: ingredient.name,
      emoji: ingredient.emoji || '🍽️',
      indispensable: Boolean(ingredient.indispensable),
      p1: ingredient.portions[1] || 'Al gusto',
      p2: ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
      p4: ingredient.portions[4] || ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
    }));
    if (ingredientsPayload.length > 0) {
      await args.supabaseClient.from('recipe_ingredients').insert(ingredientsPayload);
    }

    const substepsPayload = args.content.steps.flatMap((step) =>
      step.subSteps.map((subStep, index) => {
        const p1 = subStep.portions[1];
        const p2 = subStep.portions[2];
        const p4 = subStep.portions[4];
        return {
          recipe_id: args.recipe.id,
          substep_order: step.stepNumber * 100 + index + 1,
          step_number: step.stepNumber,
          step_name: step.stepName,
          substep_name: subStep.subStepName,
          notes: subStep.notes || '',
          is_timer: subStep.isTimer,
          p1: String(p1 ?? (subStep.isTimer ? 30 : 'Continuar')),
          p2: String(p2 ?? p1 ?? (subStep.isTimer ? 45 : 'Continuar')),
          p4: String(p4 ?? p2 ?? p1 ?? (subStep.isTimer ? 60 : 'Continuar')),
          fire_level: step.fireLevel ?? null,
          equipment: step.equipment ?? null,
          updated_at: new Date().toISOString(),
        };
      }),
    );
    if (substepsPayload.length > 0) {
      await args.supabaseClient.from('recipe_substeps').insert(substepsPayload);
    }

    if (args.canUseUserRecipeConfigs) {
      const { error: configError } = await args.supabaseClient.from('user_recipe_cooking_configs').upsert(
        {
          user_id: args.aiUserId,
          recipe_id: args.recipe.id,
          quantity_mode: args.initialConfig.quantityMode,
          people_count: args.initialConfig.peopleCount,
          amount_unit: args.initialConfig.amountUnit,
          available_count: args.initialConfig.availableCount,
          target_yield: args.initialConfig.targetYield ?? null,
          selected_optional_ingredients: args.initialConfig.selectedOptionalIngredients,
          source_context_summary: args.initialConfig.sourceContextSummary,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,recipe_id' },
      );
      if (configError) {
        if (isMissingRecipeV2ColumnError(configError)) {
          const legacyConfig = await args.supabaseClient.from('user_recipe_cooking_configs').upsert(
            {
              user_id: args.aiUserId,
              recipe_id: args.recipe.id,
              quantity_mode: args.initialConfig.quantityMode,
              people_count: args.initialConfig.peopleCount,
              amount_unit: args.initialConfig.amountUnit,
              available_count: args.initialConfig.availableCount,
              selected_optional_ingredients: args.initialConfig.selectedOptionalIngredients,
              source_context_summary: args.initialConfig.sourceContextSummary,
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,recipe_id' },
          );
          if (legacyConfig.error) {
            throw legacyConfig.error;
          }
        } else {
          const configMessage = `${configError.message ?? ''} ${configError.details ?? ''}`.toLowerCase();
          if (configError.code === 'PGRST205' || configMessage.includes('could not find the table') || (configMessage.includes('relation') && configMessage.includes('does not exist'))) {
            args.disableUserRecipeConfigsForSession();
          } else {
            throw configError;
          }
        }
      }
    }

    await updateGeneration('approved', {
      recipe_id: args.recipe.id,
      raw_response: args.content,
    });
    if (args.addRecipeToDefaultList) {
      await args.addRecipeToDefaultList(args.recipe.id);
    }
    if (args.source !== 'mock' && args.trackProductEvent) {
      await args.trackProductEvent(args.aiUserId, 'ai_recipe_created_private', { recipeId: args.recipe.id }).catch(() => {});
    }
  } catch (error) {
    await updateGeneration('failed', {
      error_message: error instanceof Error ? error.message : 'failed-to-persist-ai-recipe',
    });
    if (isMissingCompoundColumnError(error as PersistError)) {
      throw error;
    }
    throw new Error('No se pudo guardar la receta generada en tu biblioteca.');
  }
}

export async function persistPreparedAIRecipeWithFallback(args: {
  prepared: PreparedGeneratedAIRecipe;
  prompt: string;
  source: 'real' | 'mock';
  aiUserId?: string | null;
  isSupabaseEnabled: boolean;
  supabaseClient: PersistClient | null;
  canUseCompoundRecipes: boolean;
  canUseUserRecipeConfigs: boolean;
  disableUserRecipeConfigsForSession: () => void;
  disableCompoundRecipesForSession: () => void;
  addRecipeToDefaultList?: (recipeId: string) => Promise<void>;
  trackProductEvent?: (userId: string, eventName: string, payload: Record<string, unknown>) => Promise<void>;
}): Promise<{ recipe: Recipe; content: RecipeContent; usedCompoundPersistenceFallback: boolean }> {
  try {
    await persistAiRecipeToSupabaseOnce({
      recipe: args.prepared.recipe,
      content: args.prepared.content,
      prompt: args.prompt,
      source: args.source,
      initialConfig: args.prepared.initialConfig,
      recipeV2: args.prepared.recipeV2,
      aiUserId: args.aiUserId,
      isSupabaseEnabled: args.isSupabaseEnabled,
      supabaseClient: args.supabaseClient,
      canUseCompoundRecipes: args.canUseCompoundRecipes,
      canUseUserRecipeConfigs: args.canUseUserRecipeConfigs,
      disableUserRecipeConfigsForSession: args.disableUserRecipeConfigsForSession,
      addRecipeToDefaultList: args.addRecipeToDefaultList,
      trackProductEvent: args.trackProductEvent,
    });
    return {
      recipe: args.prepared.recipe,
      content: args.prepared.content,
      usedCompoundPersistenceFallback: false,
    };
  } catch (error) {
    if (args.canUseCompoundRecipes && isMissingCompoundColumnError(error as PersistError)) {
      args.disableCompoundRecipesForSession();
      const fallbackRecipe: Recipe = { ...args.prepared.recipe, experience: undefined };
      const fallbackContent: RecipeContent = { ...args.prepared.content, compoundMeta: undefined };
      await persistAiRecipeToSupabaseOnce({
        recipe: fallbackRecipe,
        content: fallbackContent,
        prompt: args.prompt,
        source: args.source,
        initialConfig: args.prepared.initialConfig,
        recipeV2: args.prepared.recipeV2,
        aiUserId: args.aiUserId,
        isSupabaseEnabled: args.isSupabaseEnabled,
        supabaseClient: args.supabaseClient,
        canUseCompoundRecipes: false,
        canUseUserRecipeConfigs: args.canUseUserRecipeConfigs,
        disableUserRecipeConfigsForSession: args.disableUserRecipeConfigsForSession,
        addRecipeToDefaultList: args.addRecipeToDefaultList,
        trackProductEvent: args.trackProductEvent,
      });
      return {
        recipe: args.prepared.recipe,
        content: args.prepared.content,
        usedCompoundPersistenceFallback: true,
      };
    }
    throw error;
  }
}
