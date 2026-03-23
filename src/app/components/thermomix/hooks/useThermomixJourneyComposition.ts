import { useMemo } from 'react';
import { parseRecipeJourneyRoute } from '../../../features/recipe-journey/router/recipeJourneyRoute';
import { createCookRuntimeEntryAdapter } from '../../../features/recipe-journey/compat/createCookRuntimeEntryAdapter';
import { createRecipeJourneyShellAdapter } from '../../../features/recipe-journey/compat/createRecipeJourneyShellAdapter';
import { isUnifiedJourneyEnabled } from '../../../features/recipe-journey/compat/isUnifiedJourneyEnabled';
import { buildRecipeJourneyViewModel } from '../../../features/recipe-journey/model/buildRecipeJourneyViewModel';
import { deriveRecipeSetupBehavior } from '../../../lib/recipeSetupBehavior';
import { APPROX_GRAMS_PER_UNIT } from '../lib/runtimeHelpers';
import { useThermomixCookingAssembly } from './useThermomixCookingAssembly';
import { useThermomixOverlayModel } from './useThermomixOverlayModel';
import type {
  AIRecipeGenerationController,
  CookingProgressController,
  LibrarySelectionController,
  OverlayController,
  PlanningController,
  PortionsController,
  RecipeSelectionController,
  ThermomixRecipeRuntime,
  UserRecipeConfigsController,
  WeeklyPlanController,
} from '../lib/controllerTypes';
import type { useCookingRuntimeController } from './useCookingRuntimeController';

export type ThermomixJourneyCompositionResult = {
  shouldRenderUnifiedJourneyPage: boolean;
  unifiedJourneyViewModel: ReturnType<typeof buildRecipeJourneyViewModel>;
  unifiedJourneyShellAdapter: ReturnType<typeof createRecipeJourneyShellAdapter>;
  overlayModel: ReturnType<typeof useThermomixOverlayModel>;
  cookingAssembly: ReturnType<typeof useThermomixCookingAssembly>;
};

export function useThermomixJourneyComposition(args: {
  authUserId?: string | null;
  pathname: string;
  navigate: (path: string) => void;
  appVersion: string;
  screen: string;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  portions: PortionsController;
  userRecipeConfigs: UserRecipeConfigsController;
  weeklyPlan: WeeklyPlanController;
  planning: PlanningController;
  overlay: OverlayController;
  aiRecipeGen: AIRecipeGenerationController;
  runtime: ThermomixRecipeRuntime;
  runtimeController: ReturnType<typeof useCookingRuntimeController>;
  librarySelection: LibrarySelectionController;
}): ThermomixJourneyCompositionResult {
  const parsedJourneyRoute = parseRecipeJourneyRoute(args.pathname);
  const shouldRenderUnifiedJourneyPage = Boolean(
    isUnifiedJourneyEnabled(parsedJourneyRoute.recipeId) &&
    parsedJourneyRoute.isValid &&
    parsedJourneyRoute.stage &&
    parsedJourneyRoute.stage !== 'cook'
  );

  const unifiedJourneyViewModel = buildRecipeJourneyViewModel({
    recipe: args.recipeSelection.selectedRecipe,
    recipeV2: args.runtime.setupRecipeV2,
    pathname: args.pathname,
    returnTo: args.overlay.recipeOverlayHostPath,
    presentationMode: 'page',
    selectedYield: args.runtime.standardYield.selectedYield,
    selectedCookingContext: args.recipeSelection.cookingContext,
    activeIngredientSelection: args.recipeSelection.activeIngredientSelectionV2,
  });

  const handleStandardIngredientToggle = (ingredientId: string) => {
    if (!args.runtime.canonicalRecipeV2) return;
    const recipeId = args.runtime.canonicalRecipeV2.id;
    args.recipeSelection.setIngredientSelectionByRecipe((prev: Record<string, Record<string, boolean>>) => {
      const current = prev[recipeId] ?? Object.fromEntries(args.runtime.canonicalRecipeV2.ingredients.map((ingredient: { id: string }) => [ingredient.id, true]));
      return { ...prev, [recipeId]: { ...current, [ingredientId]: !(current[ingredientId] ?? true) } };
    });
  };

  const cookingAssembly = useThermomixCookingAssembly({
    recipeSelection: args.recipeSelection,
    cookingProgress: args.cookingProgress,
    portions: args.portions,
    isCompoundRecipe: args.runtime.isCompoundRecipe,
    hasRecipeV2: args.runtime.hasRecipeV2,
    scaledStandardRecipe: args.runtime.scaledStandardRecipe,
    standardCooking: args.runtime.standardCooking,
    standardTimer: args.runtime.standardTimer,
    compoundCooking: args.runtime.compoundCooking,
    scaledCompoundRecipe: args.runtime.scaledCompoundRecipe,
    compatDeps: {
      recipeSelection: args.recipeSelection,
      cookingProgress: args.cookingProgress,
      aiRecipeGen: args.aiRecipeGen,
      portions: args.portions,
      authUserId: args.authUserId,
      userRecipeConfigs: args.userRecipeConfigs,
      weeklyPlan: args.weeklyPlan,
      planning: args.planning,
      overlay: args.overlay,
      APPROX_GRAMS_PER_UNIT,
      deriveRecipeSetupBehavior,
    },
  });

  const cookRuntimeEntryAdapter = createCookRuntimeEntryAdapter({
    selectedRecipe: args.recipeSelection.selectedRecipe,
    recipeV2ById: args.recipeSelection.recipeV2ById,
    hasRecipeV2: args.runtime.hasRecipeV2,
    setTargetYield: args.recipeSelection.setTargetYield,
    setCookingContext: args.recipeSelection.setCookingContext,
    setIngredientSelectionByRecipe: args.recipeSelection.setIngredientSelectionByRecipe,
    enterCompoundCookingRuntime: () => {
      if (!args.recipeSelection.selectedRecipe) return;
      args.runtimeController.enterRecipeCookingRuntime({ recipe: args.recipeSelection.selectedRecipe, recipeV2: args.recipeSelection.recipeV2ById[args.recipeSelection.selectedRecipe.id] ?? null });
    },
    enterStandardCookingRuntime: () => {
      if (!args.recipeSelection.selectedRecipe) return;
      args.runtimeController.enterRecipeCookingRuntime({ recipe: args.recipeSelection.selectedRecipe, recipeV2: args.recipeSelection.recipeV2ById[args.recipeSelection.selectedRecipe.id] ?? null });
    },
    startCompatCooking: cookingAssembly.handlers.handleStartCooking,
    navigateToCookingRoute: (recipeId: string) => args.navigate(`/recetas/${encodeURIComponent(recipeId)}/cocinar`),
  });

  const unifiedJourneyShellAdapter = createRecipeJourneyShellAdapter({
    recipe: args.recipeSelection.selectedRecipe,
    recipeV2: args.runtime.setupRecipeV2,
    scaledRecipe: args.runtime.scaledJourneyRecipe,
    pathname: args.pathname,
    returnTo: args.overlay.recipeOverlayHostPath,
    presentationMode: 'page',
    selectedYield: args.runtime.standardYield.selectedYield,
    selectedCookingContext: args.recipeSelection.cookingContext,
    activeIngredientSelection: args.recipeSelection.activeIngredientSelectionV2,
    onSelectedYieldChange: args.runtime.standardYield.setSelectedYield,
    onSelectedCookingContextChange: args.recipeSelection.setCookingContext,
    onDecrement: args.runtime.standardYield.decrementYield,
    onIncrement: args.runtime.standardYield.incrementYield,
    onIngredientToggle: handleStandardIngredientToggle,
    navigate: args.navigate,
    onClose: args.overlay.closeUnifiedJourneyOverlay,
    onEnterCooking: cookRuntimeEntryAdapter.enterCookRuntime,
  });

  const overlayModel = useThermomixOverlayModel({
    appVersion: args.appVersion,
    screen: args.screen,
    planning: args.planning,
    weeklyPlan: args.weeklyPlan,
    overlay: args.overlay,
    recipeSelection: args.recipeSelection,
    cookingProgress: args.cookingProgress,
    setupRecipeV2: args.runtime.setupRecipeV2,
    shouldRenderUnifiedJourneyOverlay: Boolean(args.runtime.isUnifiedJourneyRecipe && args.runtime.setupRecipeV2 && !shouldRenderUnifiedJourneyPage),
    shouldRenderSetupV2: Boolean(!(args.runtime.isUnifiedJourneyRecipe && args.runtime.setupRecipeV2 && !shouldRenderUnifiedJourneyPage) && args.runtime.hasSetupRecipeV2),
    shouldRenderSetupCompat: Boolean(!(args.runtime.isUnifiedJourneyRecipe && args.runtime.setupRecipeV2 && !shouldRenderUnifiedJourneyPage) && !args.runtime.hasSetupRecipeV2),
    shouldRenderIngredientsV2: Boolean(!(args.runtime.isUnifiedJourneyRecipe && args.runtime.setupRecipeV2 && !shouldRenderUnifiedJourneyPage) && args.runtime.hasRecipeV2),
    shouldRenderIngredientsCompat: Boolean(!(args.runtime.isUnifiedJourneyRecipe && args.runtime.setupRecipeV2 && !shouldRenderUnifiedJourneyPage) && !args.runtime.hasRecipeV2),
    scaledStandardRecipe: args.runtime.scaledStandardRecipe,
    standardYield: args.runtime.standardYield,
    portions: args.portions,
    handlers: cookingAssembly.handlers,
    voice: cookingAssembly.voice,
    handleStandardIngredientToggle,
    selectedRecipeSetupBehavior: args.librarySelection.selectedRecipeSetupBehavior,
    selectedRecipeSavedConfig: args.librarySelection.selectedRecipeSavedConfig,
    selectedRecipeSavedSummary: args.librarySelection.selectedRecipeSavedSummary,
    unifiedJourneyViewModel,
    unifiedJourneyShellAdapter,
    cookRuntimeEntryAdapter,
  });

  return useMemo(() => ({
    shouldRenderUnifiedJourneyPage,
    unifiedJourneyViewModel,
    unifiedJourneyShellAdapter,
    overlayModel,
    cookingAssembly,
  }), [shouldRenderUnifiedJourneyPage, unifiedJourneyViewModel, unifiedJourneyShellAdapter, overlayModel, cookingAssembly]);
}
