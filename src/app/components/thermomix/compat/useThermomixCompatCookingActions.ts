import { useThermomixHandlers } from '../../../hooks/useThermomixHandlers';
import type { Recipe, RecipeContent, RecipeSetupBehavior, UserRecipeCookingConfig, WeeklyPlanItemConfigSnapshot } from '../../../../types';
import type {
  AIRecipeGenerationController,
  CookingProgressController,
  OverlayController,
  PlanningController,
  PortionsController,
  RecipeSelectionController,
  UserRecipeConfigsController,
  WeeklyPlanController,
} from '../lib/controllerTypes';

export type UseThermomixCompatCookingActionsArgs = {
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  aiRecipeGen: AIRecipeGenerationController;
  portions: PortionsController;
  portionValue: string | number | null;
  authUserId: string | null | undefined;
  userRecipeConfigs: UserRecipeConfigsController;
  weeklyPlan: WeeklyPlanController;
  planning: PlanningController;
  overlay: OverlayController;
  APPROX_GRAMS_PER_UNIT: number;
  deriveRecipeSetupBehavior: (
    recipe: Recipe | null,
    content: RecipeContent,
    config: UserRecipeCookingConfig | null,
  ) => RecipeSetupBehavior;
};

export function useThermomixCompatCookingActions(args: UseThermomixCompatCookingActionsArgs) {
  return useThermomixHandlers({
    ...args.recipeSelection,
    ...args.cookingProgress,
    ...args.aiRecipeGen,
    ...args.portions,
    portionValue: args.portionValue,
    setPortion: args.recipeSelection.setPortion,
    setAiClarificationAnswers: args.aiRecipeGen.setAiClarificationAnswers,
    setIsCheckingClarifications: args.aiRecipeGen.setIsCheckingClarifications,
    setIsGeneratingRecipe: args.aiRecipeGen.setIsGeneratingRecipe,
    cookingProgressIsRunning: args.cookingProgress.isRunning,
    APPROX_GRAMS_PER_UNIT: args.APPROX_GRAMS_PER_UNIT,
    getSavedRecipeConfig: (recipeId: string) => args.userRecipeConfigs.configsByRecipeId[recipeId] ?? null,
    resolveRecipeSetupBehavior: (recipe, config) =>
      args.deriveRecipeSetupBehavior(recipe, args.recipeSelection.recipeContentById[recipe.id] ?? null, config),
    saveUserRecipeConfig: args.userRecipeConfigs.saveConfig,
    recipeUserId: args.authUserId ?? null,
    activePlannedRecipeItemId: args.planning.activePlannedRecipeItemId,
    openRecipeSetupOverlay: args.overlay.openRecipeSetupSheet,
    openIngredientsOverlay: args.overlay.openIngredientsSheet,
    closeRecipeOverlays: args.overlay.resetRecipeOverlayNavigationContext,
    savePlannedRecipeConfig: async (configSnapshot: WeeklyPlanItemConfigSnapshot) => {
      if (!args.planning.activePlannedRecipeItemId) return;
      const item = args.weeklyPlan.items.find((candidate) => candidate.id === args.planning.activePlannedRecipeItemId);
      const recipe = args.recipeSelection.selectedRecipe;
      if (!item || !recipe) return;
      await args.weeklyPlan.saveItem({
        id: item.id,
        recipe,
        dayOfWeek: item.dayOfWeek,
        slot: item.slot,
        notes: item.notes,
        configSnapshot,
      });
    },
  });
}
