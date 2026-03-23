import type { Recipe, RecipeContent } from '../../types';
import type { PreparedGeneratedAIRecipe } from './artifacts';
import { createAiRecipeGenerationRun, updateAiRecipeGenerationRun } from './generationLog';
import { persistRecipeIngredientsAndSubsteps, persistRecipeRecord } from './recipePersistence';
import {
  isMissingCompoundColumnError,
  isMissingRecipeV2ColumnError,
  type PersistClient,
  type PersistError,
} from './persistenceShared';
import { persistUserRecipeConfig } from './userRecipeConfigPersistence';

export type { PersistClient, PersistError } from './persistenceShared';
export { isMissingCompoundColumnError, isMissingRecipeV2ColumnError } from './persistenceShared';

async function persistAiRecipeToSupabaseOnce(args: {
  recipe: Recipe;
  content: RecipeContent;
  prompt: string;
  source: 'real' | 'mock';
  initialConfig: PreparedGeneratedAIRecipe['initialConfig'];
  recipeV2: PreparedGeneratedAIRecipe['recipeV2'];
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
  const generationId = await createAiRecipeGenerationRun({
    client: args.supabaseClient,
    aiUserId: args.aiUserId,
    prompt: args.prompt,
    shouldLogGeneration: args.source !== 'mock',
  });

  try {
    await persistRecipeRecord({
      client: args.supabaseClient,
      recipe: args.recipe,
      content: args.content,
      recipeV2: args.recipeV2,
      aiUserId: args.aiUserId,
      canUseCompoundRecipes: args.canUseCompoundRecipes,
    });
    await persistRecipeIngredientsAndSubsteps({
      client: args.supabaseClient,
      recipe: args.recipe,
      content: args.content,
    });

    if (args.canUseUserRecipeConfigs) {
      await persistUserRecipeConfig({
        client: args.supabaseClient,
        aiUserId: args.aiUserId,
        recipeId: args.recipe.id,
        initialConfig: args.initialConfig,
        disableUserRecipeConfigsForSession: args.disableUserRecipeConfigsForSession,
      });
    }

    await updateAiRecipeGenerationRun({
      client: args.supabaseClient,
      generationId,
      status: 'approved',
      fields: {
        recipe_id: args.recipe.id,
        raw_response: args.content,
      },
    });
    if (args.addRecipeToDefaultList) {
      await args.addRecipeToDefaultList(args.recipe.id);
    }
    if (args.source !== 'mock' && args.trackProductEvent) {
      await args.trackProductEvent(args.aiUserId, 'ai_recipe_created_private', { recipeId: args.recipe.id }).catch(() => {});
    }
  } catch (error) {
    await updateAiRecipeGenerationRun({
      client: args.supabaseClient,
      generationId,
      status: 'failed',
      fields: {
        error_message: error instanceof Error ? error.message : 'failed-to-persist-ai-recipe',
      },
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
