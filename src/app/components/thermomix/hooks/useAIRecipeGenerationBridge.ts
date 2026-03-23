import { useAIRecipeGeneration } from '../../../hooks/useAIRecipeGeneration';
import type { CookingProgressController, RecipeSelectionController, UserListsController } from '../lib/controllerTypes';

export function useAIRecipeGenerationBridge(args: {
  auth: { userId?: string | null };
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  userLists: UserListsController;
}) {
  return useAIRecipeGeneration({
    availableRecipes: args.recipeSelection.availableRecipes,
    recipeContentById: args.recipeSelection.recipeContentById,
    setAvailableRecipes: args.recipeSelection.setAvailableRecipes,
    setRecipeContentById: args.recipeSelection.setRecipeContentById,
    setIngredientSelectionByRecipe: args.recipeSelection.setIngredientSelectionByRecipe,
    setSelectedCategory: args.recipeSelection.setSelectedCategory,
    setSelectedRecipe: args.recipeSelection.setSelectedRecipe,
    setScreen: args.recipeSelection.setScreen,
    setIngredientsBackScreen: args.recipeSelection.setIngredientsBackScreen,
    setCookingSteps: args.cookingProgress.setCookingSteps,
    setQuantityMode: args.recipeSelection.setQuantityMode,
    setAmountUnit: args.recipeSelection.setAmountUnit,
    setAvailableCount: args.recipeSelection.setAvailableCount,
    setPortion: args.recipeSelection.setPortion,
    setPeopleCount: args.recipeSelection.setPeopleCount,
    setTargetYield: args.recipeSelection.setTargetYield,
    setCookingContext: args.recipeSelection.setCookingContext,
    setTimerScaleFactor: args.cookingProgress.setTimerScaleFactor,
    setTimingAdjustedLabel: args.cookingProgress.setTimingAdjustedLabel,
    setCurrentStepIndex: args.cookingProgress.setCurrentStepIndex,
    setCurrentSubStepIndex: args.cookingProgress.setCurrentSubStepIndex,
    setIsRunning: args.cookingProgress.setIsRunning,
    setActiveStepLoop: args.cookingProgress.setActiveStepLoop,
    setFlipPromptVisible: args.cookingProgress.setFlipPromptVisible,
    setPendingFlipAdvance: args.cookingProgress.setPendingFlipAdvance,
    setFlipPromptCountdown: args.cookingProgress.setFlipPromptCountdown,
    setStirPromptVisible: args.cookingProgress.setStirPromptVisible,
    setPendingStirAdvance: args.cookingProgress.setPendingStirAdvance,
    setStirPromptCountdown: args.cookingProgress.setStirPromptCountdown,
    setAwaitingNextUnitConfirmation: args.cookingProgress.setAwaitingNextUnitConfirmation,
    aiUserId: args.auth.userId,
    addRecipeToDefaultList: args.userLists.addRecipeToDefaultList,
    setRecipeV2ById: args.recipeSelection.setRecipeV2ById,
  });
}
