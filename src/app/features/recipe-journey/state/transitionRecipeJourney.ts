import { createInitialRecipeJourneyState } from './createInitialRecipeJourneyState';
import type {
  RecipeJourneyState,
  RecipePresentationMode,
  UnifiedCookingContext,
  UnifiedRecipeYield,
} from '../types';

export type RecipeJourneyEvent =
  | {
      type: 'OPEN_SETUP';
      recipeId: string;
      returnTo: string | null;
      presentationMode: RecipePresentationMode;
      selectedYield: UnifiedRecipeYield | null;
      selectedCookingContext: UnifiedCookingContext | null;
      selectedIngredientIds: string[];
      isSetupValid: boolean;
    }
  | { type: 'CONFIRM_SETUP' }
  | { type: 'BACK_FROM_INGREDIENTS' }
  | { type: 'START_COOK' }
  | { type: 'CLOSE' };

export function transitionRecipeJourney(
  state: RecipeJourneyState | null,
  event: RecipeJourneyEvent,
): RecipeJourneyState | null {
  if (event.type === 'OPEN_SETUP') {
    return createInitialRecipeJourneyState({
      recipeId: event.recipeId,
      currentStage: 'setup',
      returnTo: event.returnTo,
      presentationMode: event.presentationMode,
      selectedYield: event.selectedYield,
      selectedCookingContext: event.selectedCookingContext,
      selectedIngredientIds: event.selectedIngredientIds,
      isSetupValid: event.isSetupValid,
    });
  }

  if (!state) return state;

  switch (event.type) {
    case 'CONFIRM_SETUP':
      if (!state.setup.isValid || state.currentStage !== 'setup') return state;
      return {
        ...state,
        currentStage: 'ingredients',
      };
    case 'BACK_FROM_INGREDIENTS':
      if (state.currentStage !== 'ingredients') return state;
      return {
        ...state,
        currentStage: 'setup',
      };
    case 'START_COOK':
      if (state.currentStage !== 'ingredients') return state;
      return {
        ...state,
        currentStage: 'cook',
        ingredients: {
          ...state.ingredients,
          isConfirmed: true,
        },
      };
    case 'CLOSE':
      return state;
    default:
      return state;
  }
}
