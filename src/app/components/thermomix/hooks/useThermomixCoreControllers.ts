import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Screen } from '../../../../types';
import { useRecipeSelection } from '../../../hooks/useRecipeSelection';
import { usePortions } from '../../../hooks/usePortions';
import { useCookingProgress } from '../../../hooks/useCookingProgress';
import { useUserFavorites } from '../../../hooks/useUserFavorites';
import { useUserLists } from '../../../hooks/useUserLists';
import { useUserRecipeConfigs } from '../../../hooks/useUserRecipeConfigs';
import { useWeeklyPlan } from '../../../hooks/useWeeklyPlan';
import { useRecipeSeeds } from '../../../hooks/useRecipeSeeds';
import { usePlanningController } from './usePlanningController';
import { useRecipeOverlayController } from './useRecipeOverlayController';
import { useThermomixRecipeRuntime } from './useThermomixRecipeRuntime';
import { useAIRecipeGenerationBridge } from './useAIRecipeGenerationBridge';
import { useLibraryAndSelectionController } from './useLibraryAndSelectionController';
import { useCookingRuntimeController } from './useCookingRuntimeController';

export function useThermomixCoreControllers(args: {
  auth: { userId?: string | null };
  pathname: string;
  navigate: (path: string) => void;
  routeSyncRef: MutableRefObject<boolean>;
  recipeSeedSearchTerm: string;
  setRecipeSeedSearchTerm: Dispatch<SetStateAction<string>>;
}) {
  const recipeSelection = useRecipeSelection();
  const screen = recipeSelection.screen;
  const portions = usePortions({
    selectedRecipe: recipeSelection.selectedRecipe,
    activeRecipeContent: recipeSelection.activeRecipeContent,
    quantityMode: recipeSelection.quantityMode,
    amountUnit: recipeSelection.amountUnit,
    peopleCount: recipeSelection.peopleCount,
    availableCount: recipeSelection.availableCount,
    produceType: recipeSelection.produceType,
    produceSize: recipeSelection.produceSize,
    portion: recipeSelection.portion,
  });
  const cookingProgress = useCookingProgress({
    selectedRecipe: recipeSelection.selectedRecipe,
    activeRecipeContentSteps: recipeSelection.activeRecipeContent.steps,
    portion: recipeSelection.portion,
    cloudUserId: args.auth.userId,
  });
  const userLists = useUserLists({ userId: args.auth.userId });
  const userFavorites = useUserFavorites({ userId: args.auth.userId });
  const userRecipeConfigs = useUserRecipeConfigs({ userId: args.auth.userId });
  const weeklyPlan = useWeeklyPlan({
    userId: args.auth.userId,
    recipes: recipeSelection.availableRecipes,
    recipeContentById: recipeSelection.recipeContentById,
    recipeV2ById: recipeSelection.recipeV2ById,
    userRecipeConfigsByRecipeId: userRecipeConfigs.configsByRecipeId,
  });
  const planning = usePlanningController();
  const overlay = useRecipeOverlayController({
    navigate: args.navigate,
    pathname: args.pathname,
    screen,
    selectedCategory: recipeSelection.selectedCategory,
    setScreenDirect: recipeSelection.setScreenDirect,
    setSelectedCategory: recipeSelection.setSelectedCategory,
  });
  const recipeSeeds = useRecipeSeeds({ searchTerm: args.recipeSeedSearchTerm, limit: 48 });
  const aiRecipeGen = useAIRecipeGenerationBridge({
    auth: args.auth,
    recipeSelection,
    cookingProgress,
    userLists,
  });
  const runtime = useThermomixRecipeRuntime({
    screen,
    recipeSelection,
    cookingProgress,
  });

  let runtimeController!: ReturnType<typeof useCookingRuntimeController>;
  const librarySelection = useLibraryAndSelectionController({
    authUserId: args.auth.userId,
    screen,
    pathname: args.pathname,
    navigate: args.navigate,
    routeSyncRef: args.routeSyncRef,
    recipeSeedSearchTerm: args.recipeSeedSearchTerm,
    recipeSelection,
    cookingProgress,
    aiRecipeGen,
    userLists,
    userFavorites,
    userRecipeConfigs,
    recipeSeeds,
    overlay,
    planning,
    beforeOpenRecipe: () => runtimeController.resetCompatCookingRuntimeState(),
  });

  runtimeController = useCookingRuntimeController({
    navigate: args.navigate,
    pathname: args.pathname,
    routeSyncRef: args.routeSyncRef,
    screen,
    recipeSelection,
    cookingProgress,
    standardCooking: runtime.standardCooking,
    standardTimer: runtime.standardTimer,
    compoundCooking: runtime.compoundCooking,
    scaledCompoundRecipe: runtime.scaledCompoundRecipe,
    runtimeRecipesById: librarySelection.runtimeRecipesById,
    overlay,
    planning,
  });

  return {
    screen,
    recipeSelection,
    portions,
    cookingProgress,
    userLists,
    userFavorites,
    userRecipeConfigs,
    weeklyPlan,
    planning,
    overlay,
    recipeSeeds,
    aiRecipeGen,
    runtime,
    runtimeController,
    librarySelection,
  };
}
