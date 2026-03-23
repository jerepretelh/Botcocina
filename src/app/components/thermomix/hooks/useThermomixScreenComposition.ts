import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { Screen } from '../../../../types';
import { recipeCategories } from '../../../data/recipeCategories';
import { shouldClosePlanSheet } from '../../../lib/planSheetNavigation';
import { useThermomixRouteSync } from './useThermomixRouteSync';
import { useThermomixTelemetry } from './useThermomixTelemetry';
import { useThermomixScreenModelBundle } from './useThermomixScreenModelBundle';
import { areRecipeYieldsEqual } from '../lib/runtimeHelpers';
import type {
  AIRecipeGenerationController,
  CookingProgressController,
  LibrarySelectionController,
  OverlayController,
  PlanningController,
  RecipeSeedsController,
  RecipeSelectionController,
  ThermomixRecipeRuntime,
  UserFavoritesController,
  WeeklyPlanController,
} from '../lib/controllerTypes';
import type { ThermomixJourneyCompositionResult } from './useThermomixJourneyComposition';
import type { useCookingRuntimeController } from './useCookingRuntimeController';

export function useThermomixScreenComposition(args: {
  auth: { userId?: string | null; user?: { email?: string | null }; signOut: () => void | Promise<void> };
  appVersion: string;
  pathname: string;
  navigate: (path: string) => void;
  screen: Screen;
  recipeSeedSearchTerm: string;
  setRecipeSeedSearchTerm: (value: string) => void;
  routeSyncRef: MutableRefObject<boolean>;
  lastProcessedRoutePathRef: MutableRefObject<string | null>;
  currentScreenRef: MutableRefObject<Screen>;
  currentRecipeOverlayHostScreenRef: MutableRefObject<Screen | null>;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  planning: PlanningController;
  overlay: OverlayController;
  runtime: ThermomixRecipeRuntime;
  runtimeController: ReturnType<typeof useCookingRuntimeController>;
  librarySelection: LibrarySelectionController;
  aiRecipeGen: AIRecipeGenerationController;
  userFavorites: UserFavoritesController;
  recipeSeeds: RecipeSeedsController;
  weeklyPlan: WeeklyPlanController;
  journey: ThermomixJourneyCompositionResult;
}) {
  useEffect(() => {
    if (!args.runtime.standardYield.selectedYield) return;
    if (areRecipeYieldsEqual(args.recipeSelection.targetYield, args.runtime.standardYield.selectedYield)) return;
    args.recipeSelection.setTargetYield(args.runtime.standardYield.selectedYield);
  }, [args.recipeSelection, args.runtime.standardYield.selectedYield]);

  useEffect(() => {
    if (!args.planning.isPlanSheetOpen) return;
    if (shouldClosePlanSheet({
      screen: args.screen,
      sourceScreen: args.planning.planSheetSourceScreen,
      planningRecipeId: args.planning.planningRecipe?.id ?? null,
      selectedRecipeId: args.recipeSelection.selectedRecipe?.id ?? null,
    })) {
      args.planning.closePlanSheet();
    }
  }, [args.planning, args.recipeSelection.selectedRecipe?.id, args.screen]);

  args.currentScreenRef.current = args.screen;
  args.currentRecipeOverlayHostScreenRef.current = args.overlay.recipeOverlayHostScreen;

  useThermomixRouteSync({
    pathname: args.pathname,
    navigate: args.navigate,
    routeSyncRef: args.routeSyncRef,
    lastProcessedRoutePathRef: args.lastProcessedRoutePathRef,
    currentScreenRef: args.currentScreenRef,
    currentRecipeOverlayHostScreenRef: args.currentRecipeOverlayHostScreenRef,
    recipeSelection: args.recipeSelection,
    overlay: args.overlay,
    recipeCategories,
    selectableRecipesById: args.librarySelection.selectableRecipesById,
    hydrateRecipeSelection: args.librarySelection.hydrateRecipeSelection,
    enterRecipeCookingRuntime: args.runtimeController.enterRecipeCookingRuntime,
    setTimerScaleFactor: args.cookingProgress.setTimerScaleFactor,
    setTimingAdjustedLabel: args.cookingProgress.setTimingAdjustedLabel,
  });

  useThermomixTelemetry({
    authUserId: args.auth.userId,
    screen: args.screen,
    selectedRecipeId: args.recipeSelection.selectedRecipe?.id ?? null,
    currentStepIndex: args.cookingProgress.currentStepIndex,
    currentSubStepIndex: args.cookingProgress.currentSubStepIndex,
    cookingFlowFinished: args.runtime.cookingFlowFinished,
  });

  return useThermomixScreenModelBundle({
    auth: args.auth,
    appVersion: args.appVersion,
    screen: args.screen,
    recipeSeedSearchTerm: args.recipeSeedSearchTerm,
    setRecipeSeedSearchTerm: args.setRecipeSeedSearchTerm,
    aiRecipeGen: args.aiRecipeGen,
    recipeSelection: args.recipeSelection,
    cookingProgress: args.cookingProgress,
    recipeSeeds: args.recipeSeeds,
    userFavorites: args.userFavorites,
    planning: args.planning,
    weeklyPlan: args.weeklyPlan,
    overlayModel: args.journey.overlayModel,
    runtimeController: args.runtimeController,
    runtimeRecipesById: args.librarySelection.runtimeRecipesById,
    globalCategories: args.librarySelection.globalCategories,
    globalCategoryItems: args.librarySelection.globalCategoryItems,
    privateUserRecipes: args.librarySelection.privateUserRecipes,
    recentPrivateRecipes: args.librarySelection.recentPrivateRecipes,
    mixedSearchResults: args.librarySelection.mixedSearchResults,
    favoriteRecipes: args.librarySelection.favoriteRecipes,
    uniqueAvailableRecipes: args.librarySelection.uniqueAvailableRecipes,
    selectedCategoryMeta: args.recipeSelection.selectedCategoryMeta,
    handleSearchResultSelect: args.librarySelection.handleSearchResultSelect,
    handleRecipeOpen: args.librarySelection.handleRecipeOpen,
    hydrateRecipeSelection: args.librarySelection.hydrateRecipeSelection,
    cookingAssembly: args.journey.cookingAssembly,
    isCompoundRecipe: args.runtime.isCompoundRecipe,
    scaledStandardRecipe: args.runtime.scaledStandardRecipe,
    hasRecipeV2: args.runtime.hasRecipeV2,
    standardCooking: args.runtime.standardCooking,
    standardTimer: args.runtime.standardTimer,
    compoundCooking: args.runtime.compoundCooking,
    overlay: args.overlay,
  });
}
