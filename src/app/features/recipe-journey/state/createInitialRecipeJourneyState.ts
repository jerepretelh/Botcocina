import type {
  RecipeJourneyStage,
  RecipeJourneyState,
  RecipePresentationMode,
  UnifiedCookingContext,
  UnifiedRecipeYield,
} from '../types';

interface CreateInitialRecipeJourneyStateArgs {
  recipeId: string;
  currentStage: RecipeJourneyStage;
  returnTo: string | null;
  presentationMode: RecipePresentationMode;
  selectedYield: UnifiedRecipeYield | null;
  selectedCookingContext: UnifiedCookingContext | null;
  selectedIngredientIds: string[];
  isSetupValid: boolean;
}

export function createInitialRecipeJourneyState({
  recipeId,
  currentStage,
  returnTo,
  presentationMode,
  selectedYield,
  selectedCookingContext,
  selectedIngredientIds,
  isSetupValid,
}: CreateInitialRecipeJourneyStateArgs): RecipeJourneyState {
  return {
    recipeId,
    currentStage,
    returnTo,
    presentationMode,
    setup: {
      selectedYield,
      selectedCookingContext,
      isValid: isSetupValid,
    },
    ingredients: {
      selectedIngredientIds,
      isConfirmed: currentStage === 'cook' || currentStage === 'done',
    },
  };
}
