import type {
  CookRuntimeBridgePayload,
  RecipeJourneyStage,
  RecipeJourneyState,
  UnifiedRecipeDefinition,
} from '../types';

export function shouldUseCookRuntimeBridge(stage: RecipeJourneyStage): boolean {
  return stage === 'cook';
}

export function buildCookRuntimeBridgePayload(
  state: RecipeJourneyState,
  definition: UnifiedRecipeDefinition,
): CookRuntimeBridgePayload {
  return {
    recipeId: state.recipeId,
    flowType: definition.flowType,
    selectedYield: state.setup.selectedYield,
    selectedCookingContext: state.setup.selectedCookingContext,
    selectedIngredientIds: state.ingredients.selectedIngredientIds,
  };
}

export function enterCookRuntimeBridge(
  payload: CookRuntimeBridgePayload,
  onEnterCookRuntime: (payload: CookRuntimeBridgePayload) => void,
): void {
  onEnterCookRuntime(payload);
}
