import type { Recipe } from '../../../../types';
import type { RecipeV2, ScaledRecipeV2 } from '../../../types/recipe-v2';
import { buildRecipeJourneyPath } from '../router/recipeJourneyRoute';
import type {
  CookRuntimeBridgePayload,
  RecipeJourneyStage,
  RecipePresentationMode,
  UnifiedCookingContext,
  UnifiedRecipeYield,
} from '../types';

interface CreateRecipeJourneyShellAdapterArgs {
  recipe: Recipe | null;
  recipeV2: RecipeV2 | null;
  scaledRecipe: ScaledRecipeV2 | null;
  pathname: string;
  returnTo: string | null;
  presentationMode: RecipePresentationMode;
  selectedYield: UnifiedRecipeYield | null;
  selectedCookingContext: UnifiedCookingContext | null;
  activeIngredientSelection: Record<string, boolean>;
  onSelectedYieldChange: (nextYield: UnifiedRecipeYield) => void;
  onSelectedCookingContextChange: (nextContext: UnifiedCookingContext | null) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onIngredientToggle: (ingredientId: string) => void;
  navigate: (path: string) => void;
  onClose: () => void;
  onEnterCooking: (payload: CookRuntimeBridgePayload) => void;
}

export function createRecipeJourneyShellAdapter({
  recipe,
  recipeV2,
  scaledRecipe,
  pathname,
  returnTo,
  presentationMode,
  selectedYield,
  selectedCookingContext,
  activeIngredientSelection,
  onSelectedYieldChange,
  onSelectedCookingContextChange,
  onDecrement,
  onIncrement,
  onIngredientToggle,
  navigate,
  onClose,
  onEnterCooking,
}: CreateRecipeJourneyShellAdapterArgs) {
  return {
    recipe,
    recipeV2,
    scaledRecipe,
    pathname,
    returnTo,
    presentationMode,
    selectedYield,
    selectedCookingContext,
    activeIngredientSelection,
    onSelectedYieldChange,
    onSelectedCookingContextChange,
    onDecrement,
    onIncrement,
    onIngredientToggle,
    onNavigateStage: (stage: RecipeJourneyStage) => {
      if (!recipe?.id) return;
      navigate(buildRecipeJourneyPath(recipe.id, stage));
    },
    onCloseSetup: onClose,
    onCloseIngredients: onClose,
    onEnterCooking,
  };
}
