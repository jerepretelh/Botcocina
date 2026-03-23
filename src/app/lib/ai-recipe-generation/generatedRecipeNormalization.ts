import type { RecipeContent } from '../../types';
import {
  ensureRecipeShape,
  inferPortionFromPrompt,
} from '../../utils/recipeHelpers';
import { coercePersistedCompoundRecipe, resolveCompoundExperience } from '../compoundRecipeMeta';
import { normalizeAIRecipeToV2 } from '../recipe-v2/normalizeAIRecipeToV2';
import type {
  NormalizedGeneratedRecipe,
  PrepareGeneratedAIRecipeArtifactsArgs,
  ResolvedCompoundExperience,
} from './generatedRecipeArtifacts.types';

function resolveGeneratedCompoundExperience(args: {
  canUseCompoundRecipes: boolean;
  generatedRecipe: PrepareGeneratedAIRecipeArtifactsArgs['generatedRecipe'];
  generatedV2: NormalizedGeneratedRecipe['generatedV2'];
  baseContent: RecipeContent;
}): ResolvedCompoundExperience {
  const explicitCompoundExperience = args.canUseCompoundRecipes
    ? coercePersistedCompoundRecipe({
      experience: args.generatedRecipe.experience,
      compoundMeta: args.generatedRecipe.compoundMeta,
      content: args.baseContent,
    })
    : {};
  const forcedCompoundExperience = args.canUseCompoundRecipes
    && args.generatedV2.experience === 'compound'
    && args.generatedV2.compoundMeta
      ? {
        experience: 'compound' as const,
        compoundMeta: args.generatedV2.compoundMeta as RecipeContent['compoundMeta'],
      }
      : {};

  if (explicitCompoundExperience.experience === 'compound') {
    return explicitCompoundExperience;
  }
  if (forcedCompoundExperience.experience === 'compound') {
    return forcedCompoundExperience;
  }
  return args.canUseCompoundRecipes ? resolveCompoundExperience(args.baseContent) : {};
}

export function normalizeGeneratedRecipeArtifacts(
  args: PrepareGeneratedAIRecipeArtifactsArgs,
): NormalizedGeneratedRecipe {
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

  const compoundExperience = resolveGeneratedCompoundExperience({
    canUseCompoundRecipes: args.canUseCompoundRecipes,
    generatedRecipe: args.generatedRecipe,
    generatedV2,
    baseContent,
  });

  return {
    generated,
    inferredPortion,
    contextualPeopleCount,
    resolvedPeopleCount,
    generatedV2,
    content: {
      ...baseContent,
      compoundMeta: compoundExperience.compoundMeta,
    },
    compoundExperience,
  };
}
