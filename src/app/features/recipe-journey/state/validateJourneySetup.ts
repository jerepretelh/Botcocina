import type {
  UnifiedCookingContext,
  UnifiedRecipeDefinition,
  UnifiedRecipeYield,
} from '../types';

function hasRequiredCookingContext(selectedCookingContext: UnifiedCookingContext | null): boolean {
  if (!selectedCookingContext) return false;
  return Boolean(
    selectedCookingContext.selectedContainerKey
      || selectedCookingContext.selectedContainerMeta,
  );
}

export function validateJourneySetup(
  definition: UnifiedRecipeDefinition,
  selectedYield: UnifiedRecipeYield | null,
  selectedCookingContext: UnifiedCookingContext | null,
): boolean {
  for (const field of definition.setup.fields) {
    if (!field.required) continue;

    if (field.kind === 'yield' && !selectedYield) {
      return false;
    }

    if (field.kind === 'cooking_context' && !hasRequiredCookingContext(selectedCookingContext)) {
      return false;
    }
  }

  return true;
}
