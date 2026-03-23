import { buildRecipeV2PersistenceShape } from '../recipeV2';
import { normalizeGeneratedRecipeArtifacts } from './generatedRecipeNormalization';
import { buildGeneratedRecipeIdentity } from './generatedRecipeIdentity';
import { buildGeneratedRecipeRuntimeState } from './generatedRecipeRuntimeState';
import type {
  ClarifiedSizing,
  PreparedGeneratedAIRecipe,
  PrepareGeneratedAIRecipeArtifactsArgs,
} from './generatedRecipeArtifacts.types';

export type { ClarifiedSizing, PreparedGeneratedAIRecipe } from './generatedRecipeArtifacts.types';

export function prepareGeneratedAIRecipeArtifacts(
  args: PrepareGeneratedAIRecipeArtifactsArgs,
): PreparedGeneratedAIRecipe {
  const normalized = normalizeGeneratedRecipeArtifacts(args);
  const identity = buildGeneratedRecipeIdentity({
    normalized,
    availableRecipes: args.availableRecipes,
    recipeContentById: args.recipeContentById,
    aiUserId: args.aiUserId,
    suggestedTitle: args.suggestedTitle,
  });
  const runtimeState = buildGeneratedRecipeRuntimeState({
    normalized,
    identity,
    contextDraft: args.contextDraft,
    selectedSeed: args.selectedSeed,
    clarifiedSizing: args.clarifiedSizing,
  });

  return {
    existingEquivalentRecipe: identity.existingEquivalentRecipe,
    recipeId: identity.recipeId,
    recipeName: identity.recipeName,
    recipe: identity.recipe,
    content: normalized.content,
    recipeV2: identity.recipeV2,
    nextIngredientSelection: runtimeState.nextIngredientSelection,
    initialConfig: runtimeState.initialConfig,
    nextRuntime: runtimeState.nextRuntime,
  };
}

export { buildRecipeV2PersistenceShape };
