import {
  buildInitialIngredientSelection,
  clampNumber,
  mapCountToPortion,
} from '../../utils/recipeHelpers';
import { deriveTargetYieldFromLegacy } from '../recipeV2';
import { buildContextSummary } from './contextSummary';
import type {
  GeneratedRecipeIdentity,
  GeneratedRecipeRuntimeState,
  PrepareGeneratedAIRecipeArtifactsArgs,
  NormalizedGeneratedRecipe,
} from './generatedRecipeArtifacts.types';

export function buildGeneratedRecipeRuntimeState(args: {
  normalized: NormalizedGeneratedRecipe;
  identity: GeneratedRecipeIdentity;
  contextDraft: PrepareGeneratedAIRecipeArtifactsArgs['contextDraft'];
  selectedSeed: PrepareGeneratedAIRecipeArtifactsArgs['selectedSeed'];
  clarifiedSizing: PrepareGeneratedAIRecipeArtifactsArgs['clarifiedSizing'];
}): GeneratedRecipeRuntimeState {
  const { normalized, identity } = args;
  const quantityMode = args.clarifiedSizing?.quantityMode === 'have' ? 'have' as const : 'people' as const;
  const peopleCount = args.clarifiedSizing?.quantityMode === 'have'
    ? normalized.resolvedPeopleCount
    : (normalized.resolvedPeopleCount ?? normalized.generated.baseServings ?? normalized.inferredPortion ?? 2);
  const amountUnit = args.clarifiedSizing?.quantityMode === 'have'
    ? (args.clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units')
    : null;
  const availableCount = args.clarifiedSizing?.quantityMode === 'have' ? args.clarifiedSizing.count : null;
  const targetYield = deriveTargetYieldFromLegacy({
    quantityMode,
    peopleCount,
    amountUnit,
    availableCount,
    recipe: identity.recipe,
    content: normalized.content,
  });

  let nextQuantityMode: 'people' | 'have' = 'people';
  let nextAmountUnit: 'units' | 'grams' = 'units';
  let nextAvailableCount = 1;
  let nextPeopleCount = normalized.resolvedPeopleCount ?? normalized.generated.baseServings ?? normalized.inferredPortion ?? 2;
  let nextPortion = normalized.inferredPortion ?? mapCountToPortion(nextPeopleCount);
  let nextTimerScaleFactor = 1;
  let nextTimingAdjustedLabel = 'Tiempo estándar';

  if (args.clarifiedSizing?.quantityMode === 'have') {
    nextQuantityMode = 'have';
    nextAmountUnit = args.clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units';
    nextAvailableCount = args.clarifiedSizing.count;
    nextPortion = mapCountToPortion(args.clarifiedSizing.count);
  } else if (normalized.resolvedPeopleCount) {
    nextPeopleCount = normalized.resolvedPeopleCount;
    nextPortion = mapCountToPortion(normalized.resolvedPeopleCount);
  } else if (normalized.contextualPeopleCount) {
    nextPeopleCount = normalized.contextualPeopleCount;
    nextPortion = mapCountToPortion(normalized.contextualPeopleCount);
  } else if (normalized.inferredPortion) {
    nextPeopleCount = normalized.inferredPortion;
    nextPortion = normalized.inferredPortion;
  }

  if (args.clarifiedSizing) {
    nextTimerScaleFactor = clampNumber(args.clarifiedSizing.count / 2, 0.8, 2);
    nextTimingAdjustedLabel =
      Math.abs(nextTimerScaleFactor - 1) < 0.01
        ? 'Tiempo estándar'
        : `Tiempo ajustado x${nextTimerScaleFactor.toFixed(2)}`;
  }

  return {
    nextIngredientSelection: buildInitialIngredientSelection(normalized.content.ingredients),
    initialConfig: {
      quantityMode,
      peopleCount,
      amountUnit,
      availableCount,
      targetYield,
      selectedOptionalIngredients: normalized.content.ingredients
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
    },
    nextRuntime: {
      quantityMode: nextQuantityMode,
      amountUnit: nextAmountUnit,
      availableCount: nextAvailableCount,
      peopleCount: nextPeopleCount,
      portion: nextPortion,
      timerScaleFactor: nextTimerScaleFactor,
      timingAdjustedLabel: nextTimingAdjustedLabel,
      isCompound: identity.recipe.experience === 'compound' && Boolean(normalized.content.compoundMeta),
    },
  };
}
