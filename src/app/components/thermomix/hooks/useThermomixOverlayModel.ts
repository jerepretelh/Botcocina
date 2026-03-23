import { useCallback, useMemo } from 'react';
import type { WeeklyPlanItemConfigSnapshot } from '../../../../types';
import { buildPlanRecipeSnapshot, resolveSelectedOptionalIngredientKeys } from '../lib/planRecipeSnapshot';
import { isOverlayBackgroundMuted, resolvePlanSnapshotScaleFactor } from '../lib/overlayVariants';
import { buildIngredientsOverlayModel, buildPlanSheetModel, buildSetupOverlayModel } from '../lib/overlayModelResolvers';
import type { RecipeSetupBehavior, SavedRecipeContextSummary, UserRecipeCookingConfig } from '../../../../types';
import type {
  CookingProgressController,
  OverlayController,
  PlanningController,
  PortionsController,
  RecipeSelectionController,
  ThermomixCookingAssembly,
  ThermomixRecipeRuntime,
  WeeklyPlanController,
} from '../lib/controllerTypes';
import type { ThermomixJourneyCompositionResult } from './useThermomixJourneyComposition';
import type { createCookRuntimeEntryAdapter } from '../../../features/recipe-journey/compat/createCookRuntimeEntryAdapter';

export function useThermomixOverlayModel(args: {
  appVersion: string;
  screen: RecipeSelectionController['screen'];
  planning: PlanningController;
  weeklyPlan: WeeklyPlanController;
  overlay: OverlayController;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  setupRecipeV2: ThermomixRecipeRuntime['setupRecipeV2'];
  shouldRenderUnifiedJourneyOverlay: boolean;
  shouldRenderSetupV2: boolean;
  shouldRenderSetupCompat: boolean;
  shouldRenderIngredientsV2: boolean;
  shouldRenderIngredientsCompat: boolean;
  scaledStandardRecipe: ThermomixRecipeRuntime['scaledStandardRecipe'];
  standardYield: ThermomixRecipeRuntime['standardYield'];
  portions: PortionsController;
  handlers: ThermomixCookingAssembly['handlers'];
  voice: ThermomixCookingAssembly['voice'];
  handleStandardIngredientToggle: (ingredientId: string) => void;
  selectedRecipeSetupBehavior: RecipeSetupBehavior;
  selectedRecipeSavedConfig: UserRecipeCookingConfig | null;
  selectedRecipeSavedSummary: SavedRecipeContextSummary | null;
  unifiedJourneyViewModel: ThermomixJourneyCompositionResult['unifiedJourneyViewModel'];
  unifiedJourneyShellAdapter: ThermomixJourneyCompositionResult['unifiedJourneyShellAdapter'];
  cookRuntimeEntryAdapter: ReturnType<typeof createCookRuntimeEntryAdapter>;
}) {
  const buildCurrentPlanSnapshot = useCallback((): WeeklyPlanItemConfigSnapshot | null => {
    if (!args.recipeSelection.selectedRecipe) return null;
    return buildPlanRecipeSnapshot({
      quantityMode: args.recipeSelection.quantityMode,
      peopleCount: args.recipeSelection.peopleCount,
      amountUnit: args.recipeSelection.amountUnit,
      availableCount: args.recipeSelection.availableCount,
      targetYield: args.recipeSelection.targetYield,
      cookingContext: args.recipeSelection.cookingContext,
      selectedOptionalIngredients: resolveSelectedOptionalIngredientKeys(
        args.recipeSelection.currentIngredients,
        args.recipeSelection.activeIngredientSelection,
      ),
      sourceContextSummary: args.selectedRecipeSavedConfig?.sourceContextSummary ?? null,
      resolvedPortion: args.screen === 'cooking' ? args.recipeSelection.portion : args.portions.setupPortionPreview,
      scaleFactor: resolvePlanSnapshotScaleFactor({
        screen: args.screen,
        cookingScaleFactor: args.cookingProgress.timerScaleFactor,
        setupScaleFactor: args.portions.setupScaleFactor,
      }),
    });
  }, [
    args.cookingProgress.timerScaleFactor,
    args.portions.setupPortionPreview,
    args.portions.setupScaleFactor,
    args.recipeSelection,
    args.screen,
    args.selectedRecipeSavedConfig?.sourceContextSummary,
  ]);

  const openPlanCurrentRecipe = useCallback(() => {
    if (!args.recipeSelection.selectedRecipe) return;
    const snapshot = buildCurrentPlanSnapshot();
    if (!snapshot) return;
    args.planning.openPlanSheetForRecipe(args.recipeSelection.selectedRecipe, args.screen, null, snapshot);
  }, [args.planning, args.recipeSelection.selectedRecipe, args.screen, buildCurrentPlanSnapshot]);

  const planSheet = useMemo(() => (
    buildPlanSheetModel({
      planning: args.planning,
      weeklyPlan: args.weeklyPlan,
      recipeContentById: args.recipeSelection.recipeContentById,
      recipeV2ById: args.recipeSelection.recipeV2ById,
    })
  ), [args.planning, args.recipeSelection.recipeContentById, args.recipeSelection.recipeV2ById, args.weeklyPlan]);

  const setupOverlay = useMemo(() => buildSetupOverlayModel({ ...args, openPlanCurrentRecipe }), [
    args,
    openPlanCurrentRecipe,
  ]);

  const ingredientsOverlay = useMemo(() => buildIngredientsOverlayModel(args), [args]);

  return {
    planSheet,
    setupOverlay,
    ingredientsOverlay,
    isBackgroundMuted: isOverlayBackgroundMuted({
      isRecipeSetupSheetOpen: args.overlay.isRecipeSetupSheetOpen,
      isIngredientsSheetOpen: args.overlay.isIngredientsSheetOpen,
      isPlanSheetOpen: args.planning.isPlanSheetOpen,
    }),
    openPlanCurrentRecipe,
    buildCurrentPlanSnapshot,
  };
}
