import type { ComponentProps } from 'react';
import { RecipeSetupScreen } from '../../screens/RecipeSetupScreen';
import { IngredientsScreen } from '../../screens/IngredientsScreen';
import { RecipeSetupScreenV2 } from '../../screens/RecipeSetupScreenV2';
import { IngredientsScreenV2 } from '../../screens/IngredientsScreenV2';
import { resolveOverlayVariants } from './overlayVariants';
import type {
  OverlayController,
  PlanningController,
  PortionsController,
  RecipeSelectionController,
  ThermomixCookingAssembly,
  ThermomixRecipeRuntime,
  WeeklyPlanController,
} from './controllerTypes';
import type { ThermomixJourneyCompositionResult } from '../hooks/useThermomixJourneyComposition';
import type { createCookRuntimeEntryAdapter } from '../../../features/recipe-journey/compat/createCookRuntimeEntryAdapter';

type RecipeSetupCompatProps = ComponentProps<typeof RecipeSetupScreen>;
type IngredientsCompatProps = ComponentProps<typeof IngredientsScreen>;
type SetupV2Props = ComponentProps<typeof RecipeSetupScreenV2>;
type IngredientsV2Props = ComponentProps<typeof IngredientsScreenV2>;

type OverlayModelBaseArgs = {
  appVersion: string;
  overlay: OverlayController;
  recipeSelection: RecipeSelectionController;
  cookingProgress: import('./controllerTypes').CookingProgressController;
  setupRecipeV2: ThermomixRecipeRuntime['setupRecipeV2'];
  scaledStandardRecipe: ThermomixRecipeRuntime['scaledStandardRecipe'];
  standardYield: ThermomixRecipeRuntime['standardYield'];
  portions: PortionsController;
  handlers: ThermomixCookingAssembly['handlers'];
  voice: ThermomixCookingAssembly['voice'];
  handleStandardIngredientToggle: (ingredientId: string) => void;
  selectedRecipeSetupBehavior: RecipeSetupCompatProps['setupBehavior'];
  selectedRecipeSavedConfig: RecipeSetupCompatProps['savedConfig'];
  selectedRecipeSavedSummary: RecipeSetupCompatProps['savedContextSummary'];
  unifiedJourneyViewModel: ThermomixJourneyCompositionResult['unifiedJourneyViewModel'];
  unifiedJourneyShellAdapter: ThermomixJourneyCompositionResult['unifiedJourneyShellAdapter'];
  cookRuntimeEntryAdapter: ReturnType<typeof createCookRuntimeEntryAdapter>;
  openPlanCurrentRecipe: () => void;
  shouldRenderUnifiedJourneyOverlay: boolean;
  shouldRenderSetupV2: boolean;
  shouldRenderSetupCompat: boolean;
  shouldRenderIngredientsV2: boolean;
  shouldRenderIngredientsCompat: boolean;
};

export function buildPlanSheetModel(args: {
  planning: PlanningController;
  weeklyPlan: WeeklyPlanController;
  recipeContentById: RecipeSelectionController['recipeContentById'];
  recipeV2ById: RecipeSelectionController['recipeV2ById'];
}) {
  if (!args.planning.isPlanSheetOpen) return null;

  return {
    open: args.planning.isPlanSheetOpen,
    recipe: args.planning.planningRecipe,
    recipeContent: args.planning.planningRecipe ? args.recipeContentById[args.planning.planningRecipe.id] ?? null : null,
    recipeV2: args.planning.planningRecipe ? args.recipeV2ById[args.planning.planningRecipe.id] ?? null : null,
    initialSnapshot: args.planning.planningInitialSnapshot ?? (args.planning.planningRecipe ? args.weeklyPlan.getDefaultPlanSnapshot(args.planning.planningRecipe) : null),
    editingItem: args.planning.editingPlanItem,
    onOpenChange: (open: boolean) => {
      if (!open) {
        args.planning.closePlanSheet();
        return;
      }
      args.planning.setIsPlanSheetOpen(true);
    },
    onSave: async (input: unknown) => {
      await args.weeklyPlan.saveItem(input);
      args.planning.closePlanSheet();
    },
  };
}

export function buildSetupOverlayModel(args: OverlayModelBaseArgs) {
  if (!args.overlay.isRecipeSetupSheetOpen || !args.recipeSelection.selectedRecipe) return null;
  const variants = resolveOverlayVariants(args);
  if (variants.setupVariant === 'journey') {
    return {
      kind: 'journey',
      shellAdapter: args.unifiedJourneyShellAdapter,
      viewModel: args.unifiedJourneyViewModel,
    };
  }
  if (variants.setupVariant === 'v2') {
    return {
      kind: 'setup-v2',
      props: {
        selectedRecipe: args.recipeSelection.selectedRecipe,
        recipe: args.setupRecipeV2,
        selectedYield: args.standardYield.selectedYield,
        selectedCookingContext: args.recipeSelection.cookingContext,
        warnings: args.scaledStandardRecipe?.warnings ?? [],
        onDecrement: args.standardYield.decrementYield,
        onIncrement: args.standardYield.incrementYield,
        onSelectedYieldChange: args.standardYield.setSelectedYield,
        onSelectedCookingContextChange: args.recipeSelection.setCookingContext,
        onBack: args.overlay.closeRecipeSetupSheet,
        onContinue: () => {
          if (args.recipeSelection.selectedRecipe?.id) {
            args.overlay.setRecipeOverlayPinnedPath(`/recetas/${encodeURIComponent(args.recipeSelection.selectedRecipe.id)}/ingredientes`);
          }
          args.overlay.openIngredientsSheet();
        },
      },
    };
  }
  if (variants.setupVariant === 'compat') {
    return {
      kind: 'setup-compat',
      props: {
        selectedRecipe: args.recipeSelection.selectedRecipe,
        setupBehavior: args.selectedRecipeSetupBehavior,
        savedConfig: args.selectedRecipeSavedConfig,
        savedContextSummary: args.selectedRecipeSavedSummary,
        quantityMode: args.recipeSelection.quantityMode,
        setQuantityMode: args.recipeSelection.setQuantityMode,
        amountUnit: args.recipeSelection.amountUnit,
        onAmountUnitChange: args.handlers.handleSetupAmountUnitChange,
        peopleCount: args.recipeSelection.peopleCount,
        setPeopleCount: args.recipeSelection.setPeopleCount,
        availableCount: args.recipeSelection.availableCount,
        setAvailableCount: args.recipeSelection.setAvailableCount,
        isTubersBoilRecipe: args.portions.isTubersBoilRecipe,
        produceType: args.recipeSelection.produceType,
        setProduceType: args.recipeSelection.setProduceType,
        produceSize: args.recipeSelection.produceSize,
        setProduceSize: args.recipeSelection.setProduceSize,
        setupPortionPreview: args.portions.setupPortionPreview,
        setupScaleFactor: args.portions.setupScaleFactor,
        targetYield: args.recipeSelection.targetYield,
        onBack: args.overlay.closeRecipeSetupSheet,
        onContinue: args.handlers.handleSetupContinue,
        onPlanRecipe: args.openPlanCurrentRecipe,
      },
    };
  }
  return null;
}

export function buildIngredientsOverlayModel(args: Omit<OverlayModelBaseArgs, 'selectedRecipeSetupBehavior' | 'selectedRecipeSavedConfig' | 'selectedRecipeSavedSummary' | 'openPlanCurrentRecipe'>) {
  if (!args.overlay.isIngredientsSheetOpen || !args.recipeSelection.selectedRecipe) return null;
  const variants = resolveOverlayVariants(args);
  if (variants.ingredientsVariant === 'journey') {
    return {
      kind: 'journey',
      shellAdapter: args.unifiedJourneyShellAdapter,
      viewModel: args.unifiedJourneyViewModel,
    };
  }
  if (variants.ingredientsVariant === 'v2') {
    return {
      kind: 'ingredients-v2',
      props: {
        selectedRecipe: args.recipeSelection.selectedRecipe,
        scaledRecipe: args.scaledStandardRecipe,
        selectedYield: args.standardYield.selectedYield,
        activeIngredientSelection: args.recipeSelection.activeIngredientSelectionV2,
        onIngredientToggle: args.handleStandardIngredientToggle,
        onBack: () => {
          if (args.recipeSelection.selectedRecipe?.id) {
            args.overlay.setRecipeOverlayPinnedPath(`/recetas/${encodeURIComponent(args.recipeSelection.selectedRecipe.id)}/configurar`);
          }
          args.overlay.openRecipeSetupSheet();
        },
        onStartCooking: args.cookRuntimeEntryAdapter.enterCookRuntime,
      },
    };
  }
  if (variants.ingredientsVariant === 'compat') {
    return {
      kind: 'ingredients-compat',
      props: {
        appVersion: args.appVersion,
        voiceEnabled: args.voice.voiceEnabled,
        onVoiceToggle: args.voice.handleVoiceToggle,
        speechSupported: args.voice.speechSupported,
        selectedRecipe: args.recipeSelection.selectedRecipe,
        portion: args.recipeSelection.portion,
        currentPortionLabel: args.portions.currentPortionLabel,
        quantityMode: args.recipeSelection.quantityMode,
        peopleCount: args.recipeSelection.peopleCount,
        availableCount: args.recipeSelection.availableCount,
        amountUnit: args.recipeSelection.amountUnit,
        targetYield: args.recipeSelection.targetYield,
        timingAdjustedLabel: args.cookingProgress.timingAdjustedLabel,
        currentIngredients: args.recipeSelection.currentIngredients,
        activeIngredientSelection: args.recipeSelection.activeIngredientSelection,
        onIngredientToggle: args.handlers.handleIngredientToggle,
        batchCountForRecipe: args.portions.batchCountForRecipe,
        batchUsageTips: args.portions.batchUsageTips,
        currentTip: args.recipeSelection.activeRecipeContent.tip,
        onBack: () => {
          if (args.recipeSelection.ingredientsBackScreen === 'recipe-setup') {
            args.overlay.openRecipeSetupSheet();
            return;
          }
          args.overlay.closeIngredientsSheet();
        },
        onStartCooking: args.cookRuntimeEntryAdapter.enterCookRuntime,
        currentRecipeData: args.recipeSelection.activeRecipeContent.steps,
      },
    };
  }
  return null;
}
