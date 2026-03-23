import type { Recipe } from '../../types';
import { buildRecipeId } from '../../utils/recipeHelpers';
import { buildRecipeEquivalenceSignature } from './equivalence';
import type {
  GeneratedRecipeIdentity,
  NormalizedGeneratedRecipe,
  PrepareGeneratedAIRecipeArtifactsArgs,
} from './generatedRecipeArtifacts.types';

export function buildGeneratedRecipeIdentity(args: {
  normalized: NormalizedGeneratedRecipe;
  availableRecipes: PrepareGeneratedAIRecipeArtifactsArgs['availableRecipes'];
  recipeContentById: PrepareGeneratedAIRecipeArtifactsArgs['recipeContentById'];
  aiUserId?: string | null;
  suggestedTitle: string | null;
}): GeneratedRecipeIdentity {
  const { normalized } = args;
  const recipeName = normalized.generated.name || args.suggestedTitle || 'Nueva receta';
  const recipeSignature = buildRecipeEquivalenceSignature(
    {
      name: recipeName,
      ingredient: normalized.generated.ingredient,
    },
    normalized.content,
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
    `${buildRecipeId(normalized.generated.id || recipeName)}-${args.aiUserId?.slice(0, 8) ?? 'anon'}-${Date.now()}`;

  const recipe: Recipe = {
    id: recipeId,
    categoryId: 'personalizadas',
    name: recipeName,
    icon: normalized.generated.icon,
    ingredient: normalized.generated.ingredient,
    description: normalized.generated.description,
    basePortions: normalized.generated.baseServings ?? normalized.resolvedPeopleCount ?? normalized.inferredPortion ?? 2,
    experience: normalized.compoundExperience.experience,
    ownerUserId: args.aiUserId ?? null,
    visibility: 'private',
    createdAt: existingEquivalentRecipe?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const recipeV2Base = normalized.generatedV2.id === recipeId
    ? normalized.generatedV2
    : {
      ...normalized.generatedV2,
      id: recipeId,
    };

  return {
    recipeName,
    existingEquivalentRecipe,
    recipeId,
    recipe,
    recipeV2: {
      ...recipeV2Base,
      id: recipeId,
      experience: normalized.compoundExperience.experience ?? recipeV2Base.experience,
      compoundMeta: normalized.compoundExperience.compoundMeta ?? recipeV2Base.compoundMeta,
      sourceRecipe: recipe,
      sourceContent: normalized.content,
    },
  };
}
